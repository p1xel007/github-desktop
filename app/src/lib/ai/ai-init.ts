import { registerAIProvider } from './ai-provider-registry'
import { AIProviderID } from './providers/ai-provider'
import { OpenAIProvider } from './providers/openai-provider'
import { AnthropicProvider } from './providers/anthropic-provider'
import { GeminiProvider } from './providers/gemini-provider'
import { OllamaProvider } from './providers/ollama-provider'
import { CopilotProvider } from './providers/copilot-provider'

let initialized = false

/** Register all built-in AI providers. Call once at app startup. */
export function initializeAIProviders(): void {
  if (initialized) {
    return
  }

  registerAIProvider(AIProviderID.OpenAI, () => new OpenAIProvider())
  registerAIProvider(AIProviderID.Anthropic, () => new AnthropicProvider())
  registerAIProvider(AIProviderID.Gemini, () => new GeminiProvider())
  registerAIProvider(AIProviderID.Ollama, () => new OllamaProvider())
  registerAIProvider(AIProviderID.Copilot, () => new CopilotProvider())

  initialized = true
}
