import * as React from 'react'
import { DialogContent } from '../dialog'
import { Checkbox, CheckboxValue } from '../lib/checkbox'
import { Select } from '../lib/select'
import { TextBox } from '../lib/text-box'
import { TextArea } from '../lib/text-area'
import { Row } from '../lib/row'
import { Button } from '../lib/button'
import {
  IAISettings,
  IAIFeatureConfig,
} from '../../lib/ai/ai-config'
import {
  AIProviderID,
  IAIProviderConfig,
} from '../../lib/ai/providers/ai-provider'
import { getAllProviderConfigs } from '../../lib/ai/ai-provider-registry'
import {
  getAIProviderKey,
  setAIProviderKey,
  deleteAIProviderKey,
} from '../../lib/ai/ai-key-store'
import { createAIProvider } from '../../lib/ai/ai-provider-registry'

interface IAISettingsProps {
  readonly aiSettings: IAISettings
  readonly onAISettingsChanged: (settings: IAISettings) => void
}

interface IAISettingsState {
  readonly enabled: boolean
  readonly activeProvider: AIProviderID
  readonly providerEndpoints: Partial<Record<AIProviderID, string>>
  readonly providerModels: Partial<Record<AIProviderID, string>>
  readonly features: IAISettings['features']
  readonly globalContext: string
  readonly temperature: number
  readonly apiKey: string
  readonly isTestingConnection: boolean
  readonly connectionTestResult: 'success' | 'failure' | null
  readonly providerConfigs: ReadonlyArray<IAIProviderConfig>
}

export class AISettings extends React.Component<
  IAISettingsProps,
  IAISettingsState
> {
  public constructor(props: IAISettingsProps) {
    super(props)

    const { aiSettings } = props

    this.state = {
      enabled: aiSettings.enabled,
      activeProvider: aiSettings.activeProvider,
      providerEndpoints: { ...aiSettings.providerEndpoints },
      providerModels: { ...aiSettings.providerModels },
      features: { ...aiSettings.features },
      globalContext: aiSettings.globalContext,
      temperature: aiSettings.temperature,
      apiKey: '',
      isTestingConnection: false,
      connectionTestResult: null,
      providerConfigs: getAllProviderConfigs(),
    }
  }

  public async componentDidMount() {
    await this.loadApiKey(this.state.activeProvider)
  }

  private async loadApiKey(provider: AIProviderID) {
    const key = await getAIProviderKey(provider)
    this.setState({ apiKey: key ?? '', connectionTestResult: null })
  }

  private emitSettings() {
    this.props.onAISettingsChanged({
      enabled: this.state.enabled,
      activeProvider: this.state.activeProvider,
      providerEndpoints: this.state.providerEndpoints,
      providerModels: this.state.providerModels,
      features: this.state.features,
      globalContext: this.state.globalContext,
      maxDiffSizeBytes: this.props.aiSettings.maxDiffSizeBytes,
      temperature: this.state.temperature,
    })
  }

  private getActiveProviderConfig(): IAIProviderConfig | undefined {
    return this.state.providerConfigs.find(
      c => c.id === this.state.activeProvider
    )
  }

  public render() {
    return (
      <DialogContent>
        <div className="advanced-section">
          <h2>AI Assistant</h2>
          <Checkbox
            label="Enable AI features"
            value={
              this.state.enabled ? CheckboxValue.On : CheckboxValue.Off
            }
            onChange={this.onEnabledChanged}
            ariaDescribedBy="ai-enable-description"
          />
          <p id="ai-enable-description" className="git-settings-description">
            Use AI to generate commit messages, PR descriptions, code
            reviews, and more. Bring your own API key.
          </p>
        </div>

        {this.state.enabled && (
          <>
            {this.renderProviderConfig()}
            {this.renderFeatureToggles()}
            {this.renderGlobalContext()}
            {this.renderTemperature()}
          </>
        )}
      </DialogContent>
    )
  }

  private renderProviderConfig() {
    const config = this.getActiveProviderConfig()

    return (
      <div className="advanced-section">
        <h2>Provider</h2>
        <Select
          label="AI Provider"
          value={this.state.activeProvider}
          onChange={this.onProviderChanged}
        >
          {this.state.providerConfigs
            .filter(c => c.id !== AIProviderID.Copilot)
            .map(c => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
        </Select>

        {config?.requiresApiKey && (
          <Row>
            <TextBox
              label="API Key"
              value={this.state.apiKey}
              type="password"
              onValueChanged={this.onApiKeyChanged}
              placeholder="Enter your API key"
            />
          </Row>
        )}

        {config?.supportsCustomEndpoint && (
          <Row>
            <TextBox
              label="Custom Endpoint (optional)"
              value={
                this.state.providerEndpoints[this.state.activeProvider] ??
                config?.defaultEndpoint ??
                ''
              }
              onValueChanged={this.onEndpointChanged}
              placeholder={config?.defaultEndpoint ?? ''}
            />
          </Row>
        )}

        <Select
          label="Model"
          value={
            this.state.providerModels[this.state.activeProvider] ??
            config?.defaultModel ??
            ''
          }
          onChange={this.onModelChanged}
        >
          {(config?.availableModels ?? []).map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>

        <Row>
          <Button
            onClick={this.onTestConnection}
            disabled={this.state.isTestingConnection}
          >
            {this.state.isTestingConnection
              ? 'Testing...'
              : 'Test Connection'}
          </Button>
          {this.state.connectionTestResult === 'success' && (
            <span className="test-connection-result success">
              Connected successfully
            </span>
          )}
          {this.state.connectionTestResult === 'failure' && (
            <span className="test-connection-result failure">
              Connection failed. Check your API key and endpoint.
            </span>
          )}
        </Row>
      </div>
    )
  }

  private renderFeatureToggles() {
    const featureLabels: Array<{
      key: keyof IAISettings['features']
      label: string
      description: string
    }> = [
      {
        key: 'commitMessage',
        label: 'Commit message generation',
        description: 'Generate commit messages from staged changes',
      },
      {
        key: 'prDescription',
        label: 'PR description generation',
        description: 'Generate pull request titles and descriptions',
      },
      {
        key: 'prReview',
        label: 'PR code review',
        description: 'Get AI-powered code review feedback',
      },
      {
        key: 'branchNaming',
        label: 'Smart branch naming',
        description: 'Suggest branch names from task descriptions',
      },
      {
        key: 'changelog',
        label: 'Changelog generation',
        description: 'Generate changelogs from commit history',
      },
      {
        key: 'explainChanges',
        label: 'Explain changes',
        description: 'Get plain-language explanations of diffs',
      },
    ]

    return (
      <div className="advanced-section">
        <h2>Features</h2>
        {featureLabels.map(({ key, label, description }) => (
          <div key={key}>
            <Checkbox
              label={label}
              value={
                this.state.features[key].enabled
                  ? CheckboxValue.On
                  : CheckboxValue.Off
              }
              onChange={e => this.onFeatureToggled(key, e)}
              ariaDescribedBy={`ai-feature-${key}-description`}
            />
            <p
              id={`ai-feature-${key}-description`}
              className="git-settings-description"
            >
              {description}
            </p>
          </div>
        ))}
      </div>
    )
  }

  private renderGlobalContext() {
    return (
      <div className="advanced-section">
        <h2>Global Context &amp; Rules</h2>
        <p className="git-settings-description">
          Provide global instructions that apply to all AI generations.
          Repository-specific rules can be added via{' '}
          <code>.github/ai/</code> files in your repo.
        </p>
        <TextArea
          label="Global rules and guidelines"
          value={this.state.globalContext}
          onValueChanged={this.onGlobalContextChanged}
          rows={6}
          placeholder="e.g., Use conventional commits. Keep descriptions under 3 sentences. Write in English."
        />
      </div>
    )
  }

  private renderTemperature() {
    return (
      <div className="advanced-section">
        <h2>Generation Settings</h2>
        <label htmlFor="ai-temperature">
          Temperature: {this.state.temperature.toFixed(1)}
        </label>
        <input
          id="ai-temperature"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={this.state.temperature}
          onChange={this.onTemperatureChanged}
          className="ai-temperature-slider"
        />
        <p className="git-settings-description">
          Lower values produce more focused, deterministic output. Higher
          values produce more creative, varied output.
        </p>
      </div>
    )
  }

  private onEnabledChanged = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    const enabled = event.currentTarget.checked
    this.setState({ enabled }, () => this.emitSettings())
  }

  private onProviderChanged = (
    event: React.FormEvent<HTMLSelectElement>
  ) => {
    const activeProvider = event.currentTarget.value as AIProviderID
    this.setState({ activeProvider, connectionTestResult: null }, () => {
      this.emitSettings()
      this.loadApiKey(activeProvider)
    })
  }

  private onApiKeyChanged = (value: string) => {
    this.setState({ apiKey: value, connectionTestResult: null })
    // Save immediately to keytar
    if (value.length > 0) {
      setAIProviderKey(this.state.activeProvider, value)
    } else {
      deleteAIProviderKey(this.state.activeProvider)
    }
  }

  private onEndpointChanged = (value: string) => {
    const providerEndpoints = {
      ...this.state.providerEndpoints,
      [this.state.activeProvider]: value,
    }
    this.setState({ providerEndpoints, connectionTestResult: null }, () =>
      this.emitSettings()
    )
  }

  private onModelChanged = (
    event: React.FormEvent<HTMLSelectElement>
  ) => {
    const providerModels = {
      ...this.state.providerModels,
      [this.state.activeProvider]: event.currentTarget.value,
    }
    this.setState({ providerModels }, () => this.emitSettings())
  }

  private onTestConnection = async () => {
    this.setState({ isTestingConnection: true, connectionTestResult: null })

    try {
      const provider = createAIProvider(this.state.activeProvider)
      const endpoint =
        this.state.providerEndpoints[this.state.activeProvider]
      provider.initialize(this.state.apiKey, endpoint)
      const success = await provider.testConnection()
      this.setState({
        connectionTestResult: success ? 'success' : 'failure',
      })
    } catch {
      this.setState({ connectionTestResult: 'failure' })
    } finally {
      this.setState({ isTestingConnection: false })
    }
  }

  private onFeatureToggled = (
    key: keyof IAISettings['features'],
    event: React.FormEvent<HTMLInputElement>
  ) => {
    const enabled = event.currentTarget.checked
    const features = {
      ...this.state.features,
      [key]: { ...this.state.features[key], enabled } as IAIFeatureConfig,
    }
    this.setState({ features }, () => this.emitSettings())
  }

  private onGlobalContextChanged = (value: string) => {
    this.setState({ globalContext: value }, () => this.emitSettings())
  }

  private onTemperatureChanged = (
    event: React.FormEvent<HTMLInputElement>
  ) => {
    const temperature = parseFloat(event.currentTarget.value)
    this.setState({ temperature }, () => this.emitSettings())
  }
}
