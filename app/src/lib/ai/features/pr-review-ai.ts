import { IAIProvider } from '../providers/ai-provider'
import { IAIContext, buildContextualSystemPrompt } from '../ai-context'
import { IPromptTemplate, renderPrompt } from '../ai-prompts'
import { IAIPRReviewFeedback } from '../../app-state'

export async function generateAIPRReview(
  provider: IAIProvider,
  diff: string,
  fileList: string,
  prTitle: string,
  prDescription: string,
  context: IAIContext,
  template: IPromptTemplate,
  model?: string,
  temperature?: number,
  signal?: AbortSignal
): Promise<IAIPRReviewFeedback> {
  const systemPrompt = buildContextualSystemPrompt(
    template.systemPrompt,
    context
  )
  const userPrompt = renderPrompt(template.userPromptTemplate, {
    diff,
    fileList,
    prTitle,
    prDescription,
  })

  const result = await provider.complete({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model,
    temperature: temperature ?? 0.2,
    jsonMode: true,
    signal,
  })

  const parsed = JSON.parse(result.content)
  return {
    summary: parsed.summary ?? '',
    issues: (parsed.issues ?? []).map(
      (issue: {
        file: string
        line?: number
        severity?: string
        message: string
        suggestion?: string
      }) => ({
        file: issue.file ?? '',
        line: issue.line,
        severity: issue.severity ?? 'info',
        message: issue.message ?? '',
        suggestion: issue.suggestion,
      })
    ),
  }
}
