import { IAIProvider } from '../providers/ai-provider'
import { buildContextualSystemPrompt, loadFullContext } from '../ai-context'
import {
  PromptTemplateID,
  loadPromptTemplates,
  renderPrompt,
} from '../ai-prompts'
import { loadAISettings } from '../ai-config'
import { Repository } from '../../../models/repository'

export async function generateAIExplanation(
  provider: IAIProvider,
  model: string,
  repositoryPath: string,
  diff: string,
  temperature?: number,
  adHocInstructions?: string,
  signal?: AbortSignal
): Promise<string> {
  const settings = loadAISettings()
  const templates = loadPromptTemplates()
  const template = templates[PromptTemplateID.ExplainChanges]

  const repo = { path: repositoryPath } as Repository

  const context = await loadFullContext(
    repo,
    PromptTemplateID.ExplainChanges,
    settings.globalContext,
    adHocInstructions
  )

  const systemPrompt = buildContextualSystemPrompt(
    template.systemPrompt,
    context
  )
  const userPrompt = renderPrompt(template.userPromptTemplate, {
    diff,
    fileList: '',
    commitMessage: '',
  })

  const result = await provider.complete({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model,
    temperature: temperature ?? 0.3,
    signal,
  })

  return result.content
}
