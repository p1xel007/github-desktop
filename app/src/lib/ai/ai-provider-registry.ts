import { AIProviderID, IAIProvider, IAIProviderConfig } from './providers/ai-provider'

type AIProviderFactory = () => IAIProvider

const providerFactories = new Map<AIProviderID, AIProviderFactory>()

/** Register a provider factory */
export function registerAIProvider(
  id: AIProviderID,
  factory: AIProviderFactory
): void {
  providerFactories.set(id, factory)
}

/** Create a provider instance by ID */
export function createAIProvider(id: AIProviderID): IAIProvider {
  const factory = providerFactories.get(id)
  if (!factory) {
    throw new Error(`AI provider '${id}' is not registered`)
  }
  return factory()
}

/** Get all registered provider IDs */
export function getRegisteredProviders(): ReadonlyArray<AIProviderID> {
  return Array.from(providerFactories.keys())
}

/** Get provider config without full initialization */
export function getProviderConfig(
  id: AIProviderID
): IAIProviderConfig | undefined {
  const factory = providerFactories.get(id)
  if (!factory) {
    return undefined
  }
  return factory().config
}

/** Get configs for all registered providers */
export function getAllProviderConfigs(): ReadonlyArray<IAIProviderConfig> {
  return Array.from(providerFactories.values()).map(f => f().config)
}

/** Check if a provider is registered */
export function isProviderRegistered(id: AIProviderID): boolean {
  return providerFactories.has(id)
}
