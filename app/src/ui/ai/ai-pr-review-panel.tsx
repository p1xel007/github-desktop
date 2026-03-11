import * as React from 'react'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { Button } from '../lib/button'
import { AIContextInput } from './ai-context-input'
import { Dispatcher } from '../dispatcher'
import { Repository } from '../../models/repository'
import { IAIPRReviewFeedback, IAIPRReviewIssue } from '../../lib/app-state'

interface IAIPRReviewPanelProps {
  readonly repository: Repository
  readonly dispatcher: Dispatcher
  readonly reviewFeedback: IAIPRReviewFeedback | null
  readonly isGenerating: boolean
  readonly lastError: string | null
  readonly onDismissed: () => void
}

interface IAIPRReviewPanelState {
  readonly adHocInstructions: string
}

export class AIPRReviewPanel extends React.Component<
  IAIPRReviewPanelProps,
  IAIPRReviewPanelState
> {
  public constructor(props: IAIPRReviewPanelProps) {
    super(props)
    this.state = { adHocInstructions: '' }
  }

  public render() {
    const { isGenerating, lastError, reviewFeedback } = this.props

    return (
      <Dialog
        id="ai-pr-review"
        title="AI Code Review"
        onDismissed={this.props.onDismissed}
      >
        <DialogContent>
          <AIContextInput
            value={this.state.adHocInstructions}
            onValueChanged={this.onInstructionsChanged}
            placeholder="e.g., Focus on security issues, check for SQL injection..."
          />

          <Button
            onClick={this.onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? 'Reviewing...' : 'Start Review'}
          </Button>

          {lastError && (
            <p className="ai-error-message">{lastError}</p>
          )}

          {reviewFeedback && this.renderReviewResults(reviewFeedback)}
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

  private renderReviewResults(feedback: IAIPRReviewFeedback) {
    return (
      <div className="ai-review-results">
        <h3>Summary</h3>
        <p>{feedback.summary}</p>

        {feedback.issues.length > 0 && (
          <>
            <h3>Issues ({feedback.issues.length})</h3>
            <div className="ai-review-issues">
              {feedback.issues.map((issue, index) =>
                this.renderIssue(issue, index)
              )}
            </div>
          </>
        )}

        {feedback.issues.length === 0 && (
          <p className="ai-review-no-issues">
            No issues found. The code looks good!
          </p>
        )}
      </div>
    )
  }

  private renderIssue(issue: IAIPRReviewIssue, index: number) {
    const severityClass = `ai-review-severity-${issue.severity}`

    return (
      <div key={index} className={`ai-review-issue ${severityClass}`}>
        <div className="ai-review-issue-header">
          <span className={`ai-review-badge ${severityClass}`}>
            {issue.severity}
          </span>
          <span className="ai-review-file">
            {issue.file}
            {issue.line !== undefined && `:${issue.line}`}
          </span>
        </div>
        <p className="ai-review-issue-message">{issue.message}</p>
        {issue.suggestion && (
          <div className="ai-review-suggestion">
            <strong>Suggestion:</strong> {issue.suggestion}
          </div>
        )}
      </div>
    )
  }

  private onGenerate = () => {
    this.props.dispatcher.generateAIPRReview(
      this.props.repository,
      this.state.adHocInstructions
    )
  }

  private onInstructionsChanged = (value: string) => {
    this.setState({ adHocInstructions: value })
  }
}
