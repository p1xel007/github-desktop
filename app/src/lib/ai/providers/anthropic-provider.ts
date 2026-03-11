import {
  AIProviderID,
  IAIProvider,
  IAIProviderConfig,
  IAICompletionOptions,
  IAICompletionResult,
} from './ai-provider'
import { AIError, AIErrorType, mapHttpStatusToAIErrorType } from '../ai-error'

export class AnthropicProvider implements IAIProvider {
  readonly config: IAIProviderConfig = {
    id: AIProviderID.Anthropic,
    displayName: 'Anthropic',
    requiresApiKey: true,
    supportsCustomEndpoint: true,
    defaultEndpoint: 'https://api.anthropic.com',
    availableModels: [
      'claude-sonnet-4-20250514',
      'claude-haiku-4-20250414',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
    ],
    defaultModel: 'claude-sonnet-4-20250514',
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
      const response = await fetch(`${this.endpoint}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      })
      return response.ok
    } catch {
      return false
    }
  }

  public async complete(
    options: IAICompletionOptions
  ): Promise<IAICompletionResult> {
    // Anthropic uses a system parameter separate from messages
    const systemMessage = options.messages.find(m => m.role === 'system')
    const nonSystemMessages = options.messages.filter(
      m => m.role !== 'system'
    )

    const body: Record<string, unknown> = {
      model: options.model ?? this.config.defaultModel,
      max_tokens: options.maxTokens ?? 4096,
      messages: nonSystemMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }

    if (systemMessage) {
      body.system = systemMessage.content
    }
    if (options.temperature !== undefined) {
      body.temperature = options.temperature
    }

    const response = await fetch(`${this.endpoint}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal: options.signal,
    })

    if (!response.ok) {
      const errorType = mapHttpStatusToAIErrorType(response.status)
      let message = `Anthropic API error: ${response.status}`
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
        AIProviderID.Anthropic,
        response.status,
        retryAfter
      )
    }

    const json = await response.json()
    const textBlock = json.content?.find(
      (b: { type: string }) => b.type === 'text'
    )

    if (!textBlock?.text) {
      throw new AIError(
        'No text content in Anthropic response',
        AIErrorType.InvalidResponse,
        AIProviderID.Anthropic
      )
    }

    return {
      content: textBlock.text,
      model: json.model,
      tokensUsed: json.usage
        ? {
            prompt: json.usage.input_tokens,
            completion: json.usage.output_tokens,
          }
        : undefined,
    }
  }

  public async getAvailableModels(): Promise<ReadonlyArray<string>> {
    // Anthropic doesn't have a public models listing endpoint
    return this.config.availableModels
  }
}
