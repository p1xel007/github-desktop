import { AIProviderID } from './providers/ai-provider'

export enum AIErrorType {
  AuthenticationFailed = 'auth-failed',
  RateLimited = 'rate-limited',
  QuotaExceeded = 'quota-exceeded',
  ModelNotFound = 'model-not-found',
  ContentFiltered = 'content-filtered',
  ConnectionFailed = 'connection-failed',
  DiffTooLarge = 'diff-too-large',
  InvalidResponse = 'invalid-response',
  Cancelled = 'cancelled',
  Unknown = 'unknown',
}

export class AIError extends Error {
  public readonly type: AIErrorType
  public readonly provider: AIProviderID
  public readonly statusCode?: number
  public readonly retryAfterSeconds?: number

  constructor(
    message: string,
    type: AIErrorType,
    provider: AIProviderID,
    statusCode?: number,
    retryAfterSeconds?: number
  ) {
    super(message)
    this.name = 'AIError'
    this.type = type
    this.provider = provider
    this.statusCode = statusCode
    this.retryAfterSeconds = retryAfterSeconds
  }

  public get isRetryable(): boolean {
    return (
      this.type === AIErrorType.RateLimited ||
      this.type === AIErrorType.ConnectionFailed
    )
  }

  public get userFacingMessage(): string {
    switch (this.type) {
      case AIErrorType.AuthenticationFailed:
        return 'Authentication failed. Please check your API key in Settings > AI.'
      case AIErrorType.RateLimited:
        return this.retryAfterSeconds
          ? `Rate limited. Try again in ${this.retryAfterSeconds} seconds.`
          : 'Rate limited. Please try again in a few minutes.'
      case AIErrorType.QuotaExceeded:
        return 'API quota exceeded. Check your usage limits with your AI provider.'
      case AIErrorType.ModelNotFound:
        return 'The selected model was not found. Check your AI settings.'
      case AIErrorType.ContentFiltered:
        return 'The content was filtered by the AI provider safety system.'
      case AIErrorType.DiffTooLarge:
        return 'The diff is too large to process. Try selecting fewer files.'
      case AIErrorType.ConnectionFailed:
        return 'Could not connect to the AI provider. Check your internet connection and endpoint URL.'
      case AIErrorType.InvalidResponse:
        return 'Received an invalid response from the AI provider. Please try again.'
      case AIErrorType.Cancelled:
        return 'The AI operation was cancelled.'
      default:
        return 'An error occurred while generating AI content. Please try again.'
    }
  }
}

/** Map HTTP status codes to AIErrorType for common patterns */
export function mapHttpStatusToAIErrorType(
  statusCode: number
): AIErrorType {
  switch (statusCode) {
    case 401:
    case 403:
      return AIErrorType.AuthenticationFailed
    case 429:
      return AIErrorType.RateLimited
    case 402:
      return AIErrorType.QuotaExceeded
    case 404:
      return AIErrorType.ModelNotFound
    default:
      return AIErrorType.Unknown
  }
}
