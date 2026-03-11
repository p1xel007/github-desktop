import * as React from 'react'
import { Button } from '../lib/button'
import { Octicon } from '../octicons'
import * as octicons from '../octicons/octicons.generated'
import { AIContextInput } from './ai-context-input'

interface IAICommitButtonProps {
  readonly isEnabled: boolean
  readonly isGenerating: boolean
  readonly onGenerateCommitMessage: (adHocInstructions: string) => void
  readonly lastError: string | null
}

interface IAICommitButtonState {
  readonly adHocInstructions: string
  readonly showContextInput: boolean
}

/**
 * Button component for AI commit message generation.
 * Renders alongside the existing Copilot button when AI features are enabled.
 */
export class AICommitButton extends React.Component<
  IAICommitButtonProps,
  IAICommitButtonState
> {
  public constructor(props: IAICommitButtonProps) {
    super(props)
    this.state = {
      adHocInstructions: '',
      showContextInput: false,
    }
  }

  public render() {
    const { isEnabled, isGenerating, lastError } = this.props

    return (
      <div className="ai-commit-button-container">
        <div className="ai-commit-button-row">
          <Button
            className="ai-commit-button"
            onClick={this.onGenerate}
            disabled={!isEnabled || isGenerating}
            tooltip="Generate commit message with AI"
          >
            <Octicon symbol={octicons.copilot} />
            {isGenerating ? 'Generating...' : 'AI Message'}
          </Button>
          <button
            className="ai-context-toggle-small"
            onClick={this.onToggleContext}
            type="button"
            title="Additional instructions"
            disabled={!isEnabled || isGenerating}
          >
            <Octicon symbol={octicons.gear} />
          </button>
        </div>
        {this.state.showContextInput && (
          <AIContextInput
            value={this.state.adHocInstructions}
            onValueChanged={this.onInstructionsChanged}
          />
        )}
        {lastError && (
          <p className="ai-error-message">{lastError}</p>
        )}
      </div>
    )
  }

  private onGenerate = () => {
    this.props.onGenerateCommitMessage(this.state.adHocInstructions)
  }

  private onToggleContext = () => {
    this.setState({ showContextInput: !this.state.showContextInput })
  }

  private onInstructionsChanged = (value: string) => {
    this.setState({ adHocInstructions: value })
  }
}
