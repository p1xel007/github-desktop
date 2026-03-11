import {
  AIProviderID,
  IAIProvider,
  IAIProviderConfig,
  IAICompletionOptions,
  IAICompletionResult,
} from './ai-provider'
import { AIError, AIErrorType, mapHttpStatusToAIErrorType } from '../ai-error'

export class GeminiProvider implements IAIProvider {
  readonly config: IAIProviderConfig = {
    id: AIProviderID.Gemini,
    displayName: 'Google Gemini',
    requiresApiKey: true,
    supportsCustomEndpoint: false,
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta',
    availableModels: [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ],
    defaultModel: 'gemini-2.0-flash',
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
      const response = await fetch(
        `${this.endpoint}/models?key=${this.apiKey}`,
        { method: 'GET' }
      )
      return response.ok
    } catch {
      return false
    }
  }

  public async complete(
    options: IAICompletionOptions
  ): Promise<IAICompletionResult> {
    const model = options.model ?? this.config.defaultModel

    // Convert messages to Gemini format
    const systemMessage = options.messages.find(m => m.role === 'system')
    const nonSystemMessages = options.messages.filter(
      m => m.role !== 'system'
    )

    const contents = nonSystemMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 4096,
        temperature: options.temperature,
      },
    }

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      }
    }

    if (options.jsonMode) {
      ;(body.generationConfig as Record<string, unknown>).responseMimeType =
        'application/json'
    }

    const response = await fetch(
      `${this.endpoint}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: options.signal,
      }
    )

    if (!response.ok) {
      const errorType = mapHttpStatusToAIErrorType(response.status)
      let message = `Gemini API error: ${response.status}`

      try {
        const errorBody = await response.json()
        message = errorBody?.error?.message ?? message
      } catch {
        // ignore
      }

      throw new AIError(
        message,
        errorType,
        AIProviderID.Gemini,
        response.status
      )
    }

    const json = await response.json()
    const candidate = json.candidates?.[0]
    const text = candidate?.content?.parts?.[0]?.text

    if (!text) {
      throw new AIError(
        'No content in Gemini response',
        AIErrorType.InvalidResponse,
        AIProviderID.Gemini
      )
    }

    return {
      content: text,
      model,
      tokensUsed: json.usageMetadata
        ? {
            prompt: json.usageMetadata.promptTokenCount,
            completion: json.usageMetadata.candidatesTokenCount,
          }
        : undefined,
    }
  }

  public async getAvailableModels(): Promise<ReadonlyArray<string>> {
    try {
      const response = await fetch(
        `${this.endpoint}/models?key=${this.apiKey}`,
        { method: 'GET' }
      )

      if (!response.ok) {
        return this.config.availableModels
      }

      const json = await response.json()
      const models = (json.models ?? [])
        .filter((m: { name: string }) => m.name.includes('gemini'))
        .map((m: { name: string }) => m.name.replace('models/', ''))

      return models.length > 0 ? models : this.config.availableModels
    } catch {
      return this.config.availableModels
    }
  }
}
