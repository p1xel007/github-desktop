import * as React from 'react'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
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
import { generateAIChangelog } from '../../lib/ai/features/changelog-ai'
import { AIContextInput } from './ai-context-input'
import { getBranchDiffText } from '../../lib/git'

interface IAIChangelogDialogProps {
  readonly repository: Repository
  readonly dispatcher: Dispatcher
  readonly baseBranch: string
  readonly onDismissed: () => void
}

interface IAIChangelogDialogState {
  readonly changelog: string
  readonly adHocInstructions: string
  readonly isGenerating: boolean
  readonly error: string | null
  readonly copied: boolean
}

export class AIChangelogDialog extends React.Component<
  IAIChangelogDialogProps,
  IAIChangelogDialogState
> {
  public constructor(props: IAIChangelogDialogProps) {
    super(props)
    this.state = {
      changelog: '',
      adHocInstructions: '',
      isGenerating: false,
      error: null,
      copied: false,
    }
  }

  public render() {
    const { isGenerating, error } = this.state

    return (
      <Dialog
        id="ai-changelog"
        title="Generate Changelog"
        onDismissed={this.props.onDismissed}
        onSubmit={this.onCopyToClipboard}
      >
        <DialogContent>
          <AIContextInput
            value={this.state.adHocInstructions}
            onValueChanged={this.onInstructionsChanged}
            placeholder="e.g., Group by category, include breaking changes section..."
          />

          <Button onClick={this.onGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Changelog'}
          </Button>

          {error && <p className="ai-error-message">{error}</p>}

          {this.state.changelog && (
            <TextArea
              label="Generated Changelog"
              value={this.state.changelog}
              onValueChanged={this.onChangelogChanged}
              rows={15}
            />
          )}
        </DialogContent>
        <DialogFooter>
          <OkCancelButtonGroup
            okButtonText={this.state.copied ? 'Copied!' : 'Copy to Clipboard'}
            okButtonDisabled={!this.state.changelog}
          />
        </DialogFooter>
      </Dialog>
    )
  }

  private onGenerate = async () => {
    this.setState({ isGenerating: true, error: null })

    try {
      const settings = loadAISettings()
      const providerId = getEffectiveProvider(settings, 'changelog')
      const modelId = getEffectiveModel(settings, 'changelog')
      const apiKey = await getAIProviderKey(providerId)

      const provider = createAIProvider(providerId)
      if (!provider) {
        throw new Error('AI provider not configured. Check AI settings.')
      }

      provider.initialize(apiKey ?? '', settings.providerEndpoints[providerId])

      const diff = await getBranchDiffText(
        this.props.repository,
        this.props.baseBranch
      )

      const result = await generateAIChangelog(
        provider,
        modelId ?? '',
        this.props.repository.path,
        diff,
        settings.temperature,
        this.state.adHocInstructions || undefined
      )

      this.setState({ changelog: result })
    } catch (e) {
      this.setState({ error: e instanceof Error ? e.message : String(e) })
    } finally {
      this.setState({ isGenerating: false })
    }
  }

  private onCopyToClipboard = () => {
    navigator.clipboard.writeText(this.state.changelog)
    this.setState({ copied: true })
    setTimeout(() => this.setState({ copied: false }), 2000)
  }

  private onChangelogChanged = (value: string) => {
    this.setState({ changelog: value })
  }

  private onInstructionsChanged = (value: string) => {
    this.setState({ adHocInstructions: value })
  }
}
