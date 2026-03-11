import { TokenStore } from '../stores/token-store'
import { AIProviderID } from './providers/ai-provider'

const AI_KEY_SERVICE = 'github-desktop-ai-keys'

/** Store an API key for a provider securely using keytar */
export async function setAIProviderKey(
  provider: AIProviderID,
  key: string
): Promise<void> {
  await TokenStore.setItem(AI_KEY_SERVICE, provider, key)
}

/** Retrieve the API key for a provider */
export async function getAIProviderKey(
  provider: AIProviderID
): Promise<string | null> {
  return TokenStore.getItem(AI_KEY_SERVICE, provider)
}

/** Delete the API key for a provider */
export async function deleteAIProviderKey(
  provider: AIProviderID
): Promise<void> {
  await TokenStore.deleteItem(AI_KEY_SERVICE, provider)
}
