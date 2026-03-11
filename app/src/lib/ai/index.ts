export {
  AIProviderID,
  type IAIProvider,
  type IAIProviderConfig,
  type IAIMessage,
  type IAICompletionOptions,
  type IAICompletionResult,
} from './providers/ai-provider'

export { AIError, AIErrorType, mapHttpStatusToAIErrorType } from './ai-error'

export {
  type IAISettings,
  type IAIFeatureConfig,
  DefaultAISettings,
  loadAISettings,
  saveAISettings,
  getEffectiveProvider,
  getEffectiveModel,
} from './ai-config'

export {
  setAIProviderKey,
  getAIProviderKey,
  deleteAIProviderKey,
} from './ai-key-store'

export {
  type IAIContext,
  loadFullContext,
  buildContextualSystemPrompt,
  getAvailableContextFiles,
} from './ai-context'

export {
  PromptTemplateID,
  type IPromptTemplate,
  DefaultPromptTemplates,
  loadPromptTemplates,
  savePromptTemplates,
  resetPromptTemplate,
  renderPrompt,
} from './ai-prompts'

export {
  registerAIProvider,
  createAIProvider,
  getRegisteredProviders,
  getProviderConfig,
  getAllProviderConfigs,
} from './ai-provider-registry'
