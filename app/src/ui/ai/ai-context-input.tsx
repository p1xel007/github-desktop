import * as React from 'react'
import { TextArea } from '../lib/text-area'

interface IAIContextInputProps {
  readonly value: string
  readonly onValueChanged: (value: string) => void
  readonly placeholder?: string
}

interface IAIContextInputState {
  readonly isExpanded: boolean
}

/**
 * A collapsible text input for per-generation AI instructions.
 * Used in commit message area, PR description dialog, etc.
 */
export class AIContextInput extends React.Component<
  IAIContextInputProps,
  IAIContextInputState
> {
  public constructor(props: IAIContextInputProps) {
    super(props)
    this.state = { isExpanded: false }
  }

  public render() {
    return (
      <div className="ai-context-input">
        <button
          className="ai-context-toggle"
          onClick={this.onToggle}
          type="button"
        >
          <span className="ai-context-arrow">
            {this.state.isExpanded ? '\u25BC' : '\u25B6'}
          </span>
          Additional instructions (optional)
        </button>
        {this.state.isExpanded && (
          <TextArea
            value={this.props.value}
            onValueChanged={this.props.onValueChanged}
            rows={3}
            placeholder={
              this.props.placeholder ??
              'e.g., Focus on security implications, use imperative mood...'
            }
            ariaLabel="Additional AI instructions"
          />
        )}
      </div>
    )
  }

  private onToggle = () => {
    this.setState({ isExpanded: !this.state.isExpanded })
  }
}
