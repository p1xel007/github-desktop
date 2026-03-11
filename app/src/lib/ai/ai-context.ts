import * as fs from 'fs/promises'
import * as Path from 'path'
import { Repository } from '../../models/repository'
import { PromptTemplateID } from './ai-prompts'

/** Directory name for repo-level AI context files */
const AI_CONTEXT_DIR = '.github/ai'

/** Map of context file names for each feature */
const featureContextFiles: Record<PromptTemplateID, string> = {
  [PromptTemplateID.CommitMessage]: 'commit-rules.md',
  [PromptTemplateID.PRDescription]: 'pr-rules.md',
  [PromptTemplateID.PRReview]: 'review-rules.md',
  [PromptTemplateID.BranchNaming]: 'branch-rules.md',
  [PromptTemplateID.Changelog]: 'changelog-rules.md',
  [PromptTemplateID.ExplainChanges]: 'general.md',
}

export interface IAIContext {
  /** Global context from app settings */
  readonly globalRules: string
  /** Repository-level general context from .github/ai/general.md */
  readonly repoRules: string
  /** Feature-specific repo context from .github/ai/<feature>-rules.md */
  readonly featureRules: string
  /** Per-generation ad-hoc instructions */
  readonly adHocInstructions: string
}

/** Read a file if it exists, returning empty string if not found */
async function readFileIfExists(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return content.trim()
  } catch {
    return ''
  }
}

/** Load the general repo-level context file */
export async function loadRepoGeneralContext(
  repository: Repository
): Promise<string> {
  const filePath = Path.join(repository.path, AI_CONTEXT_DIR, 'general.md')
  return readFileIfExists(filePath)
}

/** Load the feature-specific repo-level context file */
export async function loadRepoFeatureContext(
  repository: Repository,
  feature: PromptTemplateID
): Promise<string> {
  const fileName = featureContextFiles[feature]
  const filePath = Path.join(repository.path, AI_CONTEXT_DIR, fileName)
  return readFileIfExists(filePath)
}

/** Load all context for a given feature in a repository */
export async function loadFullContext(
  repository: Repository,
  feature: PromptTemplateID,
  globalRules: string,
  adHocInstructions: string = ''
): Promise<IAIContext> {
  const [repoRules, featureRules] = await Promise.all([
    loadRepoGeneralContext(repository),
    loadRepoFeatureContext(repository, feature),
  ])

  return {
    globalRules,
    repoRules,
    featureRules,
    adHocInstructions,
  }
}

/** Build the full system prompt with all context layers injected */
export function buildContextualSystemPrompt(
  basePrompt: string,
  context: IAIContext
): string {
  const parts: string[] = [basePrompt]

  if (context.globalRules) {
    parts.push(
      `\n\n## Global Rules and Guidelines\n${context.globalRules}`
    )
  }
  if (context.repoRules) {
    parts.push(
      `\n\n## Repository Context and Conventions\n${context.repoRules}`
    )
  }
  if (context.featureRules) {
    parts.push(
      `\n\n## Feature-Specific Rules\n${context.featureRules}`
    )
  }
  if (context.adHocInstructions) {
    parts.push(
      `\n\n## Additional Instructions\n${context.adHocInstructions}`
    )
  }

  return parts.join('')
}

/** Check which context files exist in a repository */
export async function getAvailableContextFiles(
  repository: Repository
): Promise<ReadonlyArray<{ name: string; exists: boolean }>> {
  const allFiles = ['general.md', ...Object.values(featureContextFiles)]
  const uniqueFiles = [...new Set(allFiles)]

  const results = await Promise.all(
    uniqueFiles.map(async name => {
      const filePath = Path.join(repository.path, AI_CONTEXT_DIR, name)
      try {
        await fs.access(filePath)
        return { name, exists: true }
      } catch {
        return { name, exists: false }
      }
    })
  )

  return results
}
