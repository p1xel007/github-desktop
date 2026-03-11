import { IAIProvider } from '../providers/ai-provider'
import { IAIContext, buildContextualSystemPrompt } from '../ai-context'
import { IPromptTemplate, renderPrompt } from '../ai-prompts'

export interface IAICommitMessage {
  readonly title: string
  readonly description: string
}

export async function generateAICommitMessage(
  provider: IAIProvider,
  diff: string,
  fileList: string,
  branchName: string,
  context: IAIContext,
  template: IPromptTemplate,
  model?: string,
  temperature?: number,
  signal?: AbortSignal
): Promise<IAICommitMessage> {
  const systemPrompt = buildContextualSystemPrompt(
    template.systemPrompt,
    context
  )
  const userPrompt = renderPrompt(template.userPromptTemplate, {
    diff,
    fileList,
    branchName,
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
    description: parsed.description ?? '',
  }
}
