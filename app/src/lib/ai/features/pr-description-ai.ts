import { IAIProvider } from '../providers/ai-provider'
import { IAIContext, buildContextualSystemPrompt } from '../ai-context'
import { IPromptTemplate, renderPrompt } from '../ai-prompts'

export interface IAIPRDescription {
  readonly title: string
  readonly body: string
}

export async function generateAIPRDescription(
  provider: IAIProvider,
  diff: string,
  commitMessages: string,
  branchName: string,
  baseBranch: string,
  context: IAIContext,
  template: IPromptTemplate,
  model?: string,
  temperature?: number,
  signal?: AbortSignal
): Promise<IAIPRDescription> {
  const systemPrompt = buildContextualSystemPrompt(
    template.systemPrompt,
    context
  )
  const userPrompt = renderPrompt(template.userPromptTemplate, {
    diff,
    commitMessages,
    branchName,
    baseBranch,
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
    title: parsed.title ?? '',
    body: parsed.body ?? '',
  }
}
