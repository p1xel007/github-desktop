import { IAIProvider } from '../providers/ai-provider'
import { buildContextualSystemPrompt, loadFullContext } from '../ai-context'
import {
  PromptTemplateID,
  loadPromptTemplates,
  renderPrompt,
} from '../ai-prompts'
import { loadAISettings } from '../ai-config'
import { Repository } from '../../../models/repository'

export interface IAIBranchName {
  readonly branchName: string
}

export async function generateAIBranchName(
  provider: IAIProvider,
  model: string,
  repositoryPath: string,
  description: string,
  temperature?: number,
  adHocInstructions?: string,
  signal?: AbortSignal
): Promise<IAIBranchName> {
  const settings = loadAISettings()
  const templates = loadPromptTemplates()
  const template = templates[PromptTemplateID.BranchNaming]

  const repo = { path: repositoryPath } as Repository

  const context = await loadFullContext(
    repo,
    PromptTemplateID.BranchNaming,
    settings.globalContext,
    adHocInstructions
  )

  const systemPrompt = buildContextualSystemPrompt(
    template.systemPrompt,
    context
  )
  const userPrompt = renderPrompt(template.userPromptTemplate, {
    description,
    issueTitle: '',
    issueNumber: '',
  })

  const result = await provider.complete({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model,
    temperature: temperature ?? 0.3,
    jsonMode: true,
    signal,
  })

  const parsed = JSON.parse(result.content)
  return {
    branchName: parsed.branchName ?? '',
  }
}
