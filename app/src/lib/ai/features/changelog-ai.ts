import { IAIProvider } from '../providers/ai-provider'
import { buildContextualSystemPrompt, loadFullContext } from '../ai-context'
import {
  PromptTemplateID,
  loadPromptTemplates,
  renderPrompt,
} from '../ai-prompts'
import { loadAISettings } from '../ai-config'
import { Repository } from '../../../models/repository'

export async function generateAIChangelog(
  provider: IAIProvider,
  model: string,
  repositoryPath: string,
  commits: string,
  temperature?: number,
  adHocInstructions?: string,
  signal?: AbortSignal
): Promise<string> {
  const settings = loadAISettings()
  const templates = loadPromptTemplates()
  const template = templates[PromptTemplateID.Changelog]

  const repo = { path: repositoryPath } as Repository

  const context = await loadFullContext(
    repo,
    PromptTemplateID.Changelog,
    settings.globalContext,
    adHocInstructions
  )

  const systemPrompt = buildContextualSystemPrompt(
    template.systemPrompt,
    context
  )
  const userPrompt = renderPrompt(template.userPromptTemplate, {
    commits,
    tagRange: '',
    repoName: repositoryPath.split(/[/\\]/).pop() ?? '',
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
