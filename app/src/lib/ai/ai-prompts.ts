import { getObject, setObject } from '../local-storage'

export enum PromptTemplateID {
  CommitMessage = 'commit-message',
  PRDescription = 'pr-description',
  PRReview = 'pr-review',
  BranchNaming = 'branch-naming',
  Changelog = 'changelog',
  ExplainChanges = 'explain-changes',
}

export interface IPromptTemplate {
  readonly id: PromptTemplateID
  readonly name: string
  readonly description: string
  readonly systemPrompt: string
  readonly userPromptTemplate: string
  readonly isDefault: boolean
}

/** Variables available for each prompt type */
export const PromptVariables: Record<
  PromptTemplateID,
  ReadonlyArray<string>
> = {
  [PromptTemplateID.CommitMessage]: ['diff', 'fileList', 'branchName'],
  [PromptTemplateID.PRDescription]: [
    'diff',
    'commitMessages',
    'branchName',
    'baseBranch',
  ],
  [PromptTemplateID.PRReview]: [
    'diff',
    'fileList',
    'prTitle',
    'prDescription',
  ],
  [PromptTemplateID.BranchNaming]: [
    'description',
    'issueTitle',
    'issueNumber',
  ],
  [PromptTemplateID.Changelog]: ['commits', 'tagRange', 'repoName'],
  [PromptTemplateID.ExplainChanges]: ['diff', 'fileList', 'commitMessage'],
}

export const DefaultPromptTemplates: Record<
  PromptTemplateID,
  IPromptTemplate
> = {
  [PromptTemplateID.CommitMessage]: {
    id: PromptTemplateID.CommitMessage,
    name: 'Commit Message',
    description: 'Generate a commit message from staged changes',
    isDefault: true,
    systemPrompt: `You are a helpful assistant that generates concise, conventional commit messages.
Follow the conventional commits format when appropriate (feat:, fix:, docs:, refactor:, etc.).
Focus on the "why" behind changes, not just the "what".
Keep the summary under 72 characters.
Use the description for additional context if the changes are complex.`,
    userPromptTemplate: `Generate a commit message for the following changes.

Branch: {{branchName}}
Files changed: {{fileList}}

Diff:
\`\`\`
{{diff}}
\`\`\`

Respond with valid JSON only: {"title": "commit summary here", "description": "optional longer description or empty string"}`,
  },

  [PromptTemplateID.PRDescription]: {
    id: PromptTemplateID.PRDescription,
    name: 'PR Description',
    description: 'Generate a pull request title and description',
    isDefault: true,
    systemPrompt: `You are a helpful assistant that generates clear, informative pull request descriptions.
Summarize the purpose and scope of the changes.
Highlight key changes and their motivation.
Note any breaking changes or important considerations.`,
    userPromptTemplate: `Generate a pull request title and description for the following changes.

Source branch: {{branchName}}
Target branch: {{baseBranch}}

Commit messages:
{{commitMessages}}

Diff:
\`\`\`
{{diff}}
\`\`\`

Respond with valid JSON only: {"title": "PR title here", "body": "markdown description here"}`,
  },

  [PromptTemplateID.PRReview]: {
    id: PromptTemplateID.PRReview,
    name: 'PR Review',
    description: 'Review a pull request and provide feedback',
    isDefault: true,
    systemPrompt: `You are an experienced code reviewer. Provide constructive, actionable feedback.
Focus on: correctness, security, performance, readability, and maintainability.
Be specific with line references and provide suggestions when flagging issues.
Categorize each issue by severity: "info" for suggestions, "warning" for potential problems, "error" for bugs or security issues.`,
    userPromptTemplate: `Review the following pull request changes and provide feedback.

PR Title: {{prTitle}}
PR Description: {{prDescription}}
Files changed: {{fileList}}

Diff:
\`\`\`
{{diff}}
\`\`\`

Respond with valid JSON only:
{
  "summary": "brief overall assessment",
  "issues": [
    {
      "file": "path/to/file",
      "line": 42,
      "severity": "warning",
      "message": "description of the issue",
      "suggestion": "how to fix it"
    }
  ]
}`,
  },

  [PromptTemplateID.BranchNaming]: {
    id: PromptTemplateID.BranchNaming,
    name: 'Branch Naming',
    description: 'Suggest a branch name from a task description',
    isDefault: true,
    systemPrompt: `You are a helpful assistant that generates clean, descriptive git branch names.
Use kebab-case (lowercase with hyphens).
Include a conventional prefix when appropriate: feature/, fix/, docs/, refactor/, chore/.
Keep names concise but descriptive (max 50 characters total).`,
    userPromptTemplate: `Suggest a git branch name for the following task.

Description: {{description}}
Issue title: {{issueTitle}}
Issue number: {{issueNumber}}

Respond with valid JSON only: {"branchName": "feature/suggested-branch-name"}`,
  },

  [PromptTemplateID.Changelog]: {
    id: PromptTemplateID.Changelog,
    name: 'Changelog',
    description: 'Generate a changelog from commits',
    isDefault: true,
    systemPrompt: `You are a helpful assistant that generates user-friendly changelogs from commit history.
Group changes by category: Added, Changed, Fixed, Removed, Security.
Write entries from the user's perspective, not the developer's.
Use present tense and be concise.`,
    userPromptTemplate: `Generate a changelog from the following commits.

Repository: {{repoName}}
Range: {{tagRange}}

Commits:
{{commits}}

Respond with the changelog in markdown format (not JSON).`,
  },

  [PromptTemplateID.ExplainChanges]: {
    id: PromptTemplateID.ExplainChanges,
    name: 'Explain Changes',
    description: 'Explain what a set of changes does',
    isDefault: true,
    systemPrompt: `You are a helpful assistant that explains code changes in plain language.
Describe what the changes do, why they might have been made, and any implications.
Be concise but thorough. Use bullet points for multiple distinct changes.`,
    userPromptTemplate: `Explain the following code changes in plain language.

Files changed: {{fileList}}
Commit message: {{commitMessage}}

Diff:
\`\`\`
{{diff}}
\`\`\`

Provide a clear, concise explanation.`,
  },
}

const PromptTemplatesKey = 'ai-prompt-templates'

/** Load custom prompt templates from localStorage, falling back to defaults */
export function loadPromptTemplates(): Record<
  PromptTemplateID,
  IPromptTemplate
> {
  const stored = getObject<
    Partial<Record<PromptTemplateID, IPromptTemplate>>
  >(PromptTemplatesKey)

  if (!stored) {
    return { ...DefaultPromptTemplates }
  }

  const result = { ...DefaultPromptTemplates }
  for (const [key, value] of Object.entries(stored)) {
    const id = key as PromptTemplateID
    if (value && id in DefaultPromptTemplates) {
      result[id] = { ...value, isDefault: false }
    }
  }
  return result
}

/** Save custom prompt templates to localStorage */
export function savePromptTemplates(
  templates: Record<PromptTemplateID, IPromptTemplate>
): void {
  const customOnly: Partial<Record<PromptTemplateID, IPromptTemplate>> = {}

  for (const [key, value] of Object.entries(templates)) {
    if (!value.isDefault) {
      customOnly[key as PromptTemplateID] = value
    }
  }

  setObject(PromptTemplatesKey, customOnly)
}

/** Reset a specific template back to its default */
export function resetPromptTemplate(
  id: PromptTemplateID
): IPromptTemplate {
  return { ...DefaultPromptTemplates[id] }
}

/** Interpolate variables into a prompt template */
export function renderPrompt(
  template: string,
  variables: Record<string, string>
): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value),
    template
  )
}
