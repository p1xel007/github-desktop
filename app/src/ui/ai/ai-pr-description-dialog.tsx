import * as React from 'react'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { TextBox } from '../lib/text-box'
import { TextArea } from '../lib/text-area'
import { Button } from '../lib/button'
import { AIContextInput } from './ai-context-input'
import { Dispatcher } from '../dispatcher'
import { Repository } from '../../models/repository'
import { IAIGeneratedPRDescription } from '../../lib/app-state'

interface IAIPRDescriptionDialogProps {
  readonly repository: Repository
  readonly dispatcher: Dispatcher
  readonly generatedDescription: IAIGeneratedPRDescription | null
  readonly isGenerating: boolean
  readonly lastError: string | null
  readonly onDismissed: () => void
}

interface IAIPRDescriptionDialogState {
  readonly title: string
  readonly body: string
  readonly adHocInstructions: string
  readonly copied: boolean
}

export class AIPRDescriptionDialog extends React.Component<
  IAIPRDescriptionDialogProps,
  IAIPRDescriptionDialogState
> {
  public constructor(props: IAIPRDescriptionDialogProps) {
    super(props)
    this.state = {
      title: props.generatedDescription?.title ?? '',
      body: props.generatedDescription?.body ?? '',
      adHocInstructions: '',
      copied: false,
    }
  }

  public componentDidUpdate(prevProps: IAIPRDescriptionDialogProps) {
    if (
      this.props.generatedDescription !== prevProps.generatedDescription &&
      this.props.generatedDescription
    ) {
      this.setState({
        title: this.props.generatedDescription.title,
        body: this.props.generatedDescription.body,
      })
    }
  }

  public render() {
    const { isGenerating, lastError } = this.props

    return (
      <Dialog
        id="ai-pr-description"
        title="Generate PR Description"
        onDismissed={this.props.onDismissed}
        onSubmit={this.onCopyToClipboard}
      >
        <DialogContent>
          <AIContextInput
            value={this.state.adHocInstructions}
            onValueChanged={this.onInstructionsChanged}
            placeholder="e.g., Highlight breaking changes, mention related issues..."
          />

          <Button
            onClick={this.onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>

          {lastError && (
            <p className="ai-error-message">{lastError}</p>
          )}

          {this.state.title && (
            <>
              <TextBox
                label="Title"
                value={this.state.title}
                onValueChanged={this.onTitleChanged}
              />
              <TextArea
                label="Description"
                value={this.state.body}
                onValueChanged={this.onBodyChanged}
                rows={10}
              />
            </>
          )}
        </DialogContent>
        <DialogFooter>
          <OkCancelButtonGroup
            okButtonText={
              this.state.copied ? 'Copied!' : 'Copy to Clipboard'
            }
            okButtonDisabled={!this.state.title}
          />
        </DialogFooter>
      </Dialog>
    )
  }

  private onGenerate = () => {
    this.props.dispatcher.generateAIPRDescription(
      this.props.repository,
      this.state.adHocInstructions
    )
  }

  private onTitleChanged = (value: string) => {
    this.setState({ title: value })
  }

  private onBodyChanged = (value: string) => {
    this.setState({ body: value })
  }

  private onInstructionsChanged = (value: string) => {
    this.setState({ adHocInstructions: value })
  }

  private onCopyToClipboard = () => {
    const text = `${this.state.title}\n\n${this.state.body}`
    navigator.clipboard.writeText(text)
    this.setState({ copied: true })
    setTimeout(() => this.setState({ copied: false }), 2000)
  }
}
