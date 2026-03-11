import {
  AIProviderID,
  IAIProvider,
  IAIProviderConfig,
  IAICompletionOptions,
  IAICompletionResult,
} from './ai-provider'
import { AIError, AIErrorType, mapHttpStatusToAIErrorType } from '../ai-error'

export class OpenAIProvider implements IAIProvider {
  readonly config: IAIProviderConfig = {
    id: AIProviderID.OpenAI,
    displayName: 'OpenAI',
    requiresApiKey: true,
    supportsCustomEndpoint: true,
    defaultEndpoint: 'https://api.openai.com/v1',
    availableModels: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'o3-mini',
    ],
    defaultModel: 'gpt-4o',
  }

  private apiKey: string = ''
  private endpoint: string = this.config.defaultEndpoint!

  public initialize(apiKey: string, endpoint?: string): void {
    this.apiKey = apiKey
    if (endpoint) {
      this.endpoint = endpoint.replace(/\/+$/, '')
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  public async complete(
    options: IAICompletionOptions
  ): Promise<IAICompletionResult> {
    const body: Record<string, unknown> = {
      model: options.model ?? this.config.defaultModel,
      messages: options.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }

    if (options.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens
    }
    if (options.temperature !== undefined) {
      body.temperature = options.temperature
    }
    if (options.jsonMode) {
      body.response_format = { type: 'json_object' }
    }

    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.signal,
    })

    if (!response.ok) {
      const errorType = mapHttpStatusToAIErrorType(response.status)
      let message = `OpenAI API error: ${response.status}`
      let retryAfter: number | undefined

      try {
        const errorBody = await response.json()
        message = errorBody?.error?.message ?? message
      } catch {
        // ignore parse errors
      }

      if (response.status === 429) {
        const retryHeader = response.headers.get('retry-after')
        retryAfter = retryHeader ? parseInt(retryHeader, 10) : undefined
      }

      throw new AIError(
        message,
        errorType,
        AIProviderID.OpenAI,
        response.status,
        retryAfter
      )
    }

    const json = await response.json()
    const choice = json.choices?.[0]

    if (!choice?.message?.content) {
      throw new AIError(
        'No content in OpenAI response',
        AIErrorType.InvalidResponse,
        AIProviderID.OpenAI
      )
    }

    return {
      content: choice.message.content,
      model: json.model,
      tokensUsed: json.usage
        ? {
            prompt: json.usage.prompt_tokens,
            completion: json.usage.completion_tokens,
          }
        : undefined,
    }
  }

  public async getAvailableModels(): Promise<ReadonlyArray<string>> {
    try {
      const response = await fetch(`${this.endpoint}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        return this.config.availableModels
      }

      const json = await response.json()
      const models = (json.data ?? [])
        .filter(
          (m: { id: string }) =>
            m.id.startsWith('gpt-') || m.id.startsWith('o')
        )
        .map((m: { id: string }) => m.id)
        .sort()

      return models.length > 0 ? models : this.config.availableModels
    } catch {
      return this.config.availableModels
    }
  }
}
