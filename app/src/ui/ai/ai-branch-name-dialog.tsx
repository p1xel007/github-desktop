import * as React from 'react'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { TextBox } from '../lib/text-box'
import { TextArea } from '../lib/text-area'
import { Button } from '../lib/button'
import { Dispatcher } from '../dispatcher'
import { Repository } from '../../models/repository'
import {
  loadAISettings,
  getEffectiveProvider,
  getEffectiveModel,
} from '../../lib/ai/ai-config'
import { getAIProviderKey } from '../../lib/ai/ai-key-store'
import { createAIProvider } from '../../lib/ai/ai-provider-registry'
import { generateAIBranchName } from '../../lib/ai/features/branch-naming-ai'
import { AIContextInput } from './ai-context-input'

interface IAIBranchNameDialogProps {
  readonly repository: Repository
  readonly dispatcher: Dispatcher
  readonly onDismissed: () => void
  readonly onBranchNameChosen: (name: string) => void
}

interface IAIBranchNameDialogState {
  readonly taskDescription: string
  readonly suggestedName: string
  readonly adHocInstructions: string
  readonly isGenerating: boolean
  readonly error: string | null
}

export class AIBranchNameDialog extends React.Component<
  IAIBranchNameDialogProps,
  IAIBranchNameDialogState
> {
  public constructor(props: IAIBranchNameDialogProps) {
    super(props)
    this.state = {
      taskDescription: '',
      suggestedName: '',
      adHocInstructions: '',
      isGenerating: false,
      error: null,
    }
  }

  public render() {
    const { isGenerating, error } = this.state

    return (
      <Dialog
        id="ai-branch-name"
        title="AI Branch Name"
        onDismissed={this.props.onDismissed}
        onSubmit={this.onUseName}
      >
        <DialogContent>
          <TextArea
            label="Describe what you'll work on"
            value={this.state.taskDescription}
            onValueChanged={this.onTaskDescriptionChanged}
            rows={3}
            placeholder="e.g., Fix the login page redirect bug, Add dark mode toggle..."
          />

          <AIContextInput
            value={this.state.adHocInstructions}
            onValueChanged={this.onInstructionsChanged}
            placeholder="e.g., Use kebab-case, prefix with feature/ or fix/..."
          />

          <Button onClick={this.onGenerate} disabled={isGenerating || !this.state.taskDescription}>
            {isGenerating ? 'Generating...' : 'Suggest Branch Name'}
          </Button>

          {error && <p className="ai-error-message">{error}</p>}

          {this.state.suggestedName && (
            <TextBox
              label="Suggested branch name"
              value={this.state.suggestedName}
              onValueChanged={this.onSuggestedNameChanged}
            />
          )}
        </DialogContent>
        <DialogFooter>
          <OkCancelButtonGroup
            okButtonText="Use This Name"
            okButtonDisabled={!this.state.suggestedName}
          />
        </DialogFooter>
      </Dialog>
    )
  }

  private onGenerate = async () => {
    this.setState({ isGenerating: true, error: null })

    try {
      const settings = loadAISettings()
      const providerId = getEffectiveProvider(settings, 'branchNaming')
      const modelId = getEffectiveModel(settings, 'branchNaming')
      const apiKey = await getAIProviderKey(providerId)

      const provider = createAIProvider(providerId)
      if (!provider) {
        throw new Error('AI provider not configured. Check AI settings.')
      }

      provider.initialize(apiKey ?? '', settings.providerEndpoints[providerId])

      const result = await generateAIBranchName(
        provider,
        modelId ?? '',
        this.props.repository.path,
        this.state.taskDescription,
        settings.temperature,
        this.state.adHocInstructions || undefined
      )

      this.setState({ suggestedName: result.branchName })
    } catch (e) {
      this.setState({ error: e instanceof Error ? e.message : String(e) })
    } finally {
      this.setState({ isGenerating: false })
    }
  }

  private onUseName = () => {
    if (this.state.suggestedName) {
      this.props.onBranchNameChosen(this.state.suggestedName)
      this.props.onDismissed()
    }
  }

  private onTaskDescriptionChanged = (value: string) => {
    this.setState({ taskDescription: value })
  }

  private onSuggestedNameChanged = (value: string) => {
    this.setState({ suggestedName: value })
  }

  private onInstructionsChanged = (value: string) => {
    this.setState({ adHocInstructions: value })
  }
}
