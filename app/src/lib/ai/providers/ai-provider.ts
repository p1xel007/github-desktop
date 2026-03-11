/** Supported AI providers */
export enum AIProviderID {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Gemini = 'gemini',
  Ollama = 'ollama',
  Copilot = 'copilot',
}

/** Configuration metadata for an AI provider */
export interface IAIProviderConfig {
  readonly id: AIProviderID
  readonly displayName: string
  readonly requiresApiKey: boolean
  readonly supportsCustomEndpoint: boolean
  readonly defaultEndpoint?: string
  readonly availableModels: ReadonlyArray<string>
  readonly defaultModel: string
}

/** A chat message for the provider */
export interface IAIMessage {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

/** Options for an AI completion request */
export interface IAICompletionOptions {
  readonly messages: ReadonlyArray<IAIMessage>
  readonly model?: string
  readonly maxTokens?: number
  readonly temperature?: number
  readonly jsonMode?: boolean
  readonly signal?: AbortSignal
}

/** Result from an AI completion */
export interface IAICompletionResult {
  readonly content: string
  readonly model: string
  readonly tokensUsed?: {
    readonly prompt: number
    readonly completion: number
  }
}

/** The provider interface that all AI providers must implement */
export interface IAIProvider {
  readonly config: IAIProviderConfig

  /** Initialize the provider with API key and optional custom endpoint */
  initialize(apiKey: string, endpoint?: string): void

  /** Test the connection to verify the API key and endpoint work */
  testConnection(): Promise<boolean>

  /** Send a completion request */
  complete(options: IAICompletionOptions): Promise<IAICompletionResult>

  /** Get available models (may fetch dynamically from API) */
  getAvailableModels(): Promise<ReadonlyArray<string>>
}
