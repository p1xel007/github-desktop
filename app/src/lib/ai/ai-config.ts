import { AIProviderID } from './providers/ai-provider'
import { PromptTemplateID } from './ai-prompts'
import { getObject, setObject } from '../local-storage'

/** Per-feature AI configuration */
export interface IAIFeatureConfig {
  readonly enabled: boolean
  readonly providerOverride: AIProviderID | null
  readonly modelOverride: string | null
}

/** Global AI settings stored in localStorage */
export interface IAISettings {
  readonly enabled: boolean
  readonly activeProvider: AIProviderID
  readonly providerEndpoints: Partial<Record<AIProviderID, string>>
  readonly providerModels: Partial<Record<AIProviderID, string>>
  readonly features: {
    readonly commitMessage: IAIFeatureConfig
    readonly prDescription: IAIFeatureConfig
    readonly prReview: IAIFeatureConfig
    readonly branchNaming: IAIFeatureConfig
    readonly changelog: IAIFeatureConfig
    readonly explainChanges: IAIFeatureConfig
  }
  readonly globalContext: string
  readonly maxDiffSizeBytes: number
  readonly temperature: number
}

const AISettingsKey = 'ai-settings'

const defaultFeatureConfig: IAIFeatureConfig = {
  enabled: true,
  providerOverride: null,
  modelOverride: null,
}

export const DefaultAISettings: IAISettings = {
  enabled: false,
  activeProvider: AIProviderID.OpenAI,
  providerEndpoints: {
    [AIProviderID.Ollama]: 'http://localhost:11434',
  },
  providerModels: {
    [AIProviderID.OpenAI]: 'gpt-4o',
    [AIProviderID.Anthropic]: 'claude-sonnet-4-20250514',
    [AIProviderID.Gemini]: 'gemini-2.0-flash',
    [AIProviderID.Ollama]: 'llama3.1',
  },
  features: {
    commitMessage: { ...defaultFeatureConfig },
    prDescription: { ...defaultFeatureConfig },
    prReview: { ...defaultFeatureConfig },
    branchNaming: { ...defaultFeatureConfig },
    changelog: { ...defaultFeatureConfig },
    explainChanges: { ...defaultFeatureConfig },
  },
  globalContext: '',
  maxDiffSizeBytes: 10 * 1024 * 1024,
  temperature: 0.3,
}

/** Load AI settings from localStorage, merging with defaults */
export function loadAISettings(): IAISettings {
  const stored = getObject<Partial<IAISettings>>(AISettingsKey)
  if (!stored) {
    return DefaultAISettings
  }
  return {
    ...DefaultAISettings,
    ...stored,
    features: {
      ...DefaultAISettings.features,
      ...(stored.features ?? {}),
    },
    providerEndpoints: {
      ...DefaultAISettings.providerEndpoints,
      ...(stored.providerEndpoints ?? {}),
    },
    providerModels: {
      ...DefaultAISettings.providerModels,
      ...(stored.providerModels ?? {}),
    },
  }
}

/** Save AI settings to localStorage */
export function saveAISettings(settings: IAISettings): void {
  setObject(AISettingsKey, settings)
}

/** Get the effective provider for a feature (feature override or global default) */
export function getEffectiveProvider(
  settings: IAISettings,
  feature: keyof IAISettings['features']
): AIProviderID {
  return settings.features[feature].providerOverride ?? settings.activeProvider
}

/** Get the effective model for a feature */
export function getEffectiveModel(
  settings: IAISettings,
  feature: keyof IAISettings['features']
): string | undefined {
  const featureConfig = settings.features[feature]
  if (featureConfig.modelOverride) {
    return featureConfig.modelOverride
  }
  const provider = getEffectiveProvider(settings, feature)
  return settings.providerModels[provider]
}

/** Map feature keys to PromptTemplateID */
export const featureToPromptTemplate: Record<
  keyof IAISettings['features'],
  PromptTemplateID
> = {
  commitMessage: PromptTemplateID.CommitMessage,
  prDescription: PromptTemplateID.PRDescription,
  prReview: PromptTemplateID.PRReview,
  branchNaming: PromptTemplateID.BranchNaming,
  changelog: PromptTemplateID.Changelog,
  explainChanges: PromptTemplateID.ExplainChanges,
}
