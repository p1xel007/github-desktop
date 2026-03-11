import {
  AIProviderID,
  IAIProvider,
  IAIProviderConfig,
  IAICompletionOptions,
  IAICompletionResult,
} from './ai-provider'
import { AIError, AIErrorType } from '../ai-error'

export class OllamaProvider implements IAIProvider {
  readonly config: IAIProviderConfig = {
    id: AIProviderID.Ollama,
    displayName: 'Ollama (Local)',
    requiresApiKey: false,
    supportsCustomEndpoint: true,
    defaultEndpoint: 'http://localhost:11434',
    availableModels: [
      'llama3.1',
      'llama3.1:70b',
      'codellama',
      'mistral',
      'mixtral',
      'deepseek-coder-v2',
      'qwen2.5-coder',
    ],
    defaultModel: 'llama3.1',
  }

  private endpoint: string = this.config.defaultEndpoint!

  public initialize(_apiKey: string, endpoint?: string): void {
    if (endpoint) {
      this.endpoint = endpoint.replace(/\/+$/, '')
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
      })
      return response.ok
    } catch {
      return false
    }
  }

  public async complete(
    options: IAICompletionOptions
  ): Promise<IAICompletionResult> {
    const model = options.model ?? this.config.defaultModel

    const body: Record<string, unknown> = {
      model,
      messages: options.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      options: {} as Record<string, unknown>,
    }

    if (options.temperature !== undefined) {
      ;(body.options as Record<string, unknown>).temperature =
        options.temperature
    }
    if (options.maxTokens !== undefined) {
      ;(body.options as Record<string, unknown>).num_predict =
        options.maxTokens
    }
    if (options.jsonMode) {
      body.format = 'json'
    }

    const response = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options.signal,
    })

    if (!response.ok) {
      let message = `Ollama error: ${response.status}`
      try {
        const errorBody = await response.json()
        message = errorBody?.error ?? message
      } catch {
        // ignore
      }

      const errorType =
        response.status === 404
          ? AIErrorType.ModelNotFound
          : AIErrorType.ConnectionFailed

      throw new AIError(
        message,
        errorType,
        AIProviderID.Ollama,
        response.status
      )
    }

    const json = await response.json()
    const content = json.message?.content

    if (!content) {
      throw new AIError(
        'No content in Ollama response',
        AIErrorType.InvalidResponse,
        AIProviderID.Ollama
      )
    }

    return {
      content,
      model: json.model ?? model,
      tokensUsed:
        json.prompt_eval_count !== undefined
          ? {
              prompt: json.prompt_eval_count,
              completion: json.eval_count ?? 0,
            }
          : undefined,
    }
  }

  public async getAvailableModels(): Promise<ReadonlyArray<string>> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
      })

      if (!response.ok) {
        return this.config.availableModels
      }

      const json = await response.json()
      const models = (json.models ?? []).map(
        (m: { name: string }) => m.name
      )

      return models.length > 0 ? models : this.config.availableModels
    } catch {
      return this.config.availableModels
    }
  }
}
