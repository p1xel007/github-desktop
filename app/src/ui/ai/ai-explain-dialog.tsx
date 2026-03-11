import * as React from 'react'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { Button } from '../lib/button'
import { Repository } from '../../models/repository'
import {
  loadAISettings,
  getEffectiveProvider,
  getEffectiveModel,
} from '../../lib/ai/ai-config'
import { getAIProviderKey } from '../../lib/ai/ai-key-store'
import { createAIProvider } from '../../lib/ai/ai-provider-registry'
import { generateAIExplanation } from '../../lib/ai/features/explain-changes-ai'
import { AIContextInput } from './ai-context-input'

interface IAIExplainDialogProps {
  readonly repository: Repository
  readonly diff: string
  readonly filePath: string
  readonly onDismissed: () => void
}

interface IAIExplainDialogState {
  readonly explanation: string
  readonly adHocInstructions: string
  readonly isGenerating: boolean
  readonly error: string | null
}

export class AIExplainDialog extends React.Component<
  IAIExplainDialogProps,
  IAIExplainDialogState
> {
  public constructor(props: IAIExplainDialogProps) {
    super(props)
    this.state = {
      explanation: '',
      adHocInstructions: '',
      isGenerating: false,
      error: null,
    }
  }

  public componentDidMount() {
    this.onGenerate()
  }

  public render() {
    const { isGenerating, error } = this.state

    return (
      <Dialog
        id="ai-explain"
        title={`Explain: ${this.props.filePath}`}
        onDismissed={this.props.onDismissed}
      >
        <DialogContent>
          <AIContextInput
            value={this.state.adHocInstructions}
            onValueChanged={this.onInstructionsChanged}
            placeholder="e.g., Explain for a junior developer, focus on security implications..."
          />

          {isGenerating && <p>Analyzing changes...</p>}

          {error && <p className="ai-error-message">{error}</p>}

          {this.state.explanation && (
            <div
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: 'var(--font-size-sm)',
                lineHeight: 1.5,
              }}
            >
              {this.state.explanation}
            </div>
          )}

          {!isGenerating && this.state.explanation && (
            <Button onClick={this.onGenerate}>
              Regenerate
            </Button>
          )}
        </DialogContent>
        <DialogFooter>
          <OkCancelButtonGroup
            okButtonText="Close"
            cancelButtonVisible={false}
          />
        </DialogFooter>
      </Dialog>
    )
  }

  private onGenerate = async () => {
    this.setState({ isGenerating: true, error: null })

    try {
      const settings = loadAISettings()
      const providerId = getEffectiveProvider(settings, 'explainChanges')
      const modelId = getEffectiveModel(settings, 'explainChanges')
      const apiKey = await getAIProviderKey(providerId)

      const provider = createAIProvider(providerId)
      if (!provider) {
        throw new Error('AI provider not configured. Check AI settings.')
      }

      provider.initialize(apiKey ?? '', settings.providerEndpoints[providerId])

      const result = await generateAIExplanation(
        provider,
        modelId ?? '',
        this.props.repository.path,
        this.props.diff,
        settings.temperature,
        this.state.adHocInstructions || undefined
      )

      this.setState({ explanation: result })
    } catch (e) {
      this.setState({ error: e instanceof Error ? e.message : String(e) })
    } finally {
      this.setState({ isGenerating: false })
    }
  }

  private onInstructionsChanged = (value: string) => {
    this.setState({ adHocInstructions: value })
  }
}
