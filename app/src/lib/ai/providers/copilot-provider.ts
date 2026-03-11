import {
  AIProviderID,
  IAIProvider,
  IAIProviderConfig,
  IAICompletionOptions,
  IAICompletionResult,
} from './ai-provider'
import { AIError, AIErrorType } from '../ai-error'

/**
 * Copilot provider wraps GitHub's Copilot API.
 *
 * This provider works differently from the others: it uses the GitHub account's
 * Copilot endpoint and token rather than a user-provided API key. The
 * `initialize()` method expects the Copilot endpoint as the `endpoint` parameter
 * and the GitHub token as the `apiKey`.
 *
 * This provider is primarily used for commit message generation via the existing
 * Copilot integration path, but wrapped behind the IAIProvider interface for
 * consistency.
 */
export class CopilotProvider implements IAIProvider {
  readonly config: IAIProviderConfig = {
    id: AIProviderID.Copilot,
    displayName: 'GitHub Copilot',
    requiresApiKey: false, // Uses GitHub account token
    supportsCustomEndpoint: false,
    availableModels: ['copilot-default'],
    defaultModel: 'copilot-default',
  }

  private token: string = ''
  private endpoint: string = ''

  public initialize(apiKey: string, endpoint?: string): void {
    this.token = apiKey
    if (endpoint) {
      this.endpoint = endpoint.replace(/\/+$/, '')
    }
  }

  public async testConnection(): Promise<boolean> {
    // Copilot connection is validated through the GitHub account
    return this.token.length > 0 && this.endpoint.length > 0
  }

  public async complete(
    options: IAICompletionOptions
  ): Promise<IAICompletionResult> {
    if (!this.endpoint || !this.token) {
      throw new AIError(
        'Copilot is not configured. Sign in with a GitHub account that has Copilot access.',
        AIErrorType.AuthenticationFailed,
        AIProviderID.Copilot
      )
    }

    // Copilot uses the same OpenAI-compatible chat completions format
    const body = {
      messages: options.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }

    const response = await fetch(
      `${this.endpoint}/agents/github-desktop-commit-message-generation`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'X-Initiator': 'user',
          'X-Interaction-ID': crypto.randomUUID(),
          'X-Interaction-Type': 'generateCommitMessage',
        },
        body: JSON.stringify(body),
        signal: options.signal,
      }
    )

    if (!response.ok) {
      let message = `Copilot API error: ${response.status}`
      try {
        const errorBody = await response.json()
        message = errorBody?.error?.message ?? message
      } catch {
        // ignore
      }

      throw new AIError(
        message,
        response.status === 402
          ? AIErrorType.QuotaExceeded
          : response.status === 429
            ? AIErrorType.RateLimited
            : AIErrorType.Unknown,
        AIProviderID.Copilot,
        response.status
      )
    }

    const text = await response.text()
    // Copilot returns SSE-style "data: " prefixed lines
    const dataLine = text
      .split('\n')
      .find(line => line.startsWith('data: '))
    if (!dataLine) {
      throw new AIError(
        'Invalid Copilot response format',
        AIErrorType.InvalidResponse,
        AIProviderID.Copilot
      )
    }

    const json = JSON.parse(dataLine.substring(6))
    const content = json.choices?.[0]?.message?.content

    if (!content) {
      throw new AIError(
        'No content in Copilot response',
        AIErrorType.InvalidResponse,
        AIProviderID.Copilot
      )
    }

    return {
      content,
      model: 'copilot-default',
    }
  }

  public async getAvailableModels(): Promise<ReadonlyArray<string>> {
    return this.config.availableModels
  }
}
