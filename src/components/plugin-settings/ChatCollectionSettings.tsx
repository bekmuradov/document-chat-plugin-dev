import React from 'react';
import { Loader2, AlertCircle, Save, XCircle, ArrowLeft } from 'lucide-react';
import type { Services } from '../../types';

interface ChatCollectionsSettingsProps {
    services: Services;
    onBack?: () => void;
}

interface ChatSettingsValue {
    LLM_PROVIDER: string;
    EMBEDDING_PROVIDER: string;
    ENABLE_CONTEXTUAL_RETRIEVAL: boolean;
    OLLAMA_CONTEXTUAL_LLM_BASE_URL: string;
    OLLAMA_CONTEXTUAL_LLM_MODEL: string;
    OLLAMA_LLM_BASE_URL: string;
    OLLAMA_LLM_MODEL: string;
    OLLAMA_EMBEDDING_BASE_URL: string;
    OLLAMA_EMBEDDING_MODEL: string;
    DOCUMENT_PROCESSOR_API_URL: string;
    DOCUMENT_PROCESSOR_API_KEY: string;
    DOCUMENT_PROCESSOR_TIMEOUT: number;
    DOCUMENT_PROCESSOR_MAX_RETRIES: number;
}

interface ChatCollectionsSettingsState {
    settings: ChatSettingsValue;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    success: string | null;
    hasUnsavedChanges: boolean;
}

const CHAT_SETTINGS = {
    DEFINITION_ID: 'chat_with_document_processor_settings',
    DEFAULT_VALUE: {
        LLM_PROVIDER: "ollama",
        EMBEDDING_PROVIDER: "ollama",
        ENABLE_CONTEXTUAL_RETRIEVAL: true,
        OLLAMA_CONTEXTUAL_LLM_BASE_URL: "http://localhost:11434",
        OLLAMA_CONTEXTUAL_LLM_MODEL: "llama3.2:8b",
        OLLAMA_LLM_BASE_URL: "http://localhost:11434",
        OLLAMA_LLM_MODEL: "qwen3:8b",
        OLLAMA_EMBEDDING_BASE_URL: "http://localhost:11434",
        OLLAMA_EMBEDDING_MODEL: "mxbai-embed-large",
        DOCUMENT_PROCESSOR_API_URL: "http://localhost:8080/documents/",
        DOCUMENT_PROCESSOR_API_KEY: "default_api_key",
        DOCUMENT_PROCESSOR_TIMEOUT: 600,
        DOCUMENT_PROCESSOR_MAX_RETRIES: 3
    }
};

export class ChatCollectionsSettings extends React.Component<ChatCollectionsSettingsProps, ChatCollectionsSettingsState> {
    private settingsUnsubscribe?: () => void;

    constructor(props: ChatCollectionsSettingsProps) {
        super(props);
        this.state = {
            settings: CHAT_SETTINGS.DEFAULT_VALUE,
            isLoading: true,
            isSaving: false,
            error: null,
            success: null,
            hasUnsavedChanges: false,
        };
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleSave = this.handleSave.bind(this);
    }

    async componentDidMount() {
        await this.loadSettings();
    }

    /**
     * Initialize settings subscription for real-time updates (optional)
     */
    initializeSettingsSubscription() {
        if (!this.props.services?.settings?.subscribe) {
            console.log('ComponentOpenRouterKeys: Settings subscription not available (optional)');
            return;
        }

        // Subscribe to settings changes
        this.settingsUnsubscribe = this.props.services.settings.subscribe(
            CHAT_SETTINGS.DEFINITION_ID,
            (value: any) => {
                console.log('Plugin settings updated:', value);
                if (value) {
                this.processApiKeyData(value);
                }
            }
        );
    }

    private processApiKeyData = (value: any) => {
        console.log('DOCUMENT_PROCESSOR_API_KEY: Processing API key data:', value);
        
        // Handle different data formats from settings service
        let apiKeyData = value;
        
        if (typeof value === 'string') {
        try {
            apiKeyData = JSON.parse(value);
        } catch (e) {
            // Treat as raw API key string if not JSON
            apiKeyData = { apiKey: value };
        }
        }
        
        // Extract the API key
        const key = apiKeyData?.apiKey || '';
        
        console.log('DOCUMENT_PROCESSOR_API_KEY: Extracted API key:', key ? 'Key present (hidden)' : 'No key');
        
        this.setState({
            settings: {
                ...this.state.settings,
                DOCUMENT_PROCESSOR_API_KEY: key,
            },
            isLoading: false,
            error: null,
            hasUnsavedChanges: false
        });
    };

    private async loadSettings() {
        const { services } = this.props;
        this.setState({ isLoading: true, error: null });

        try {
            if (services.api?.get) {
                // Fallback to API Service
                const response = await services.api.get('/api/v1/settings/instances', {
                    params: {
                        definition_id: CHAT_SETTINGS.DEFINITION_ID,
                        user_id: 'current',
                        scope: 'user'
                    }
                });
                if (response?.data && response.data.length > 0) {
                    let instanceValue = response.data[0].value;
                    if (typeof instanceValue === 'string') {
                        instanceValue = JSON.parse(instanceValue);
                    }
                    this.setState({ settings: instanceValue });
                }
            } else if (services.settings?.getSetting) {
                // Prefer Settings Service
                const settingValue = await services.settings.getSetting(CHAT_SETTINGS.DEFINITION_ID);
                if (settingValue) {
                    this.setState({ settings: settingValue });
                }
            } else {
                this.setState({ error: 'No service available to load settings' });
            }
        } catch (err: any) {
            console.error('Failed to load settings:', err);
            this.setState({ error: 'Failed to load settings' });
        } finally {
            this.setState({ isLoading: false, hasUnsavedChanges: false });
        }
    }

    private async handleSave() {
        this.setState({ isSaving: true, error: null, success: null });

        const { services } = this.props;
        const payload = {
            definition_id: CHAT_SETTINGS.DEFINITION_ID,
            value: this.state.settings,
            scope: 'user',
            user_id: 'current'
        };

        try {
            if (services.settings?.setSetting) {
                await services.settings.setSetting(CHAT_SETTINGS.DEFINITION_ID, this.state.settings, { userId: 'current' });
            } else if (services.api?.post) {
                await services.api.post('/api/v1/settings/instances', payload);
            } else {
                throw new Error('No service available to save settings');
            }

            this.setState({
                isSaving: false,
                success: 'Settings saved successfully!',
                hasUnsavedChanges: false
            });
            setTimeout(() => this.setState({ success: null }), 3000);
        } catch (err: any) {
            console.error('Failed to save settings:', err);
            this.setState({
                isSaving: false,
                error: 'Failed to save settings. Check console for details.'
            });
        }
    }

    private handleInputChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const target = event.target;
        const { name, value, type } = target;

        this.setState(prevState => {
            let updatedValue: string | number | boolean;

            if (type === 'checkbox' && target instanceof HTMLInputElement) {
                updatedValue = target.checked;
            } else if (type === 'number') {
                updatedValue = Number(value);
            } else {
                updatedValue = value;
            }

            return {
                settings: {
                    ...prevState.settings,
                    [name]: updatedValue,
                },
                hasUnsavedChanges: true,
            };
        });
    }

    private renderForm() {
        const { settings, isSaving, error, success, hasUnsavedChanges } = this.state;

        return (
            <div className="space-y-6">
                <h2 className="text-xl font-semibold">LLM Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                        <label className="block text-sm font-medium">LLM Provider</label>
                        <input name="LLM_PROVIDER" type="text" value={settings.LLM_PROVIDER} onChange={this.handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium">Embedding Provider</label>
                        <input name="EMBEDDING_PROVIDER" type="text" value={settings.EMBEDDING_PROVIDER} onChange={this.handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                </div>

                <h2 className="text-xl font-semibold">Ollama Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                        <label className="block text-sm font-medium">Ollama Base URL</label>
                        <input name="OLLAMA_LLM_BASE_URL" type="text" value={settings.OLLAMA_LLM_BASE_URL} onChange={this.handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium">Ollama LLM Model</label>
                        <input name="OLLAMA_LLM_MODEL" type="text" value={settings.OLLAMA_LLM_MODEL} onChange={this.handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium">Ollama Embedding Base URL</label>
                        <input name="OLLAMA_EMBEDDING_BASE_URL" type="text" value={settings.OLLAMA_EMBEDDING_BASE_URL} onChange={this.handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium">Ollama Embedding Model</label>
                        <input name="OLLAMA_EMBEDDING_MODEL" type="text" value={settings.OLLAMA_EMBEDDING_MODEL} onChange={this.handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium">Ollama Contextual LLM Base URL</label>
                        <input name="OLLAMA_CONTEXTUAL_LLM_BASE_URL" type="text" value={settings.OLLAMA_CONTEXTUAL_LLM_BASE_URL} onChange={this.handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium">Ollama Contextual LLM Model</label>
                        <input name="OLLAMA_CONTEXTUAL_LLM_MODEL" type="text" value={settings.OLLAMA_CONTEXTUAL_LLM_MODEL} onChange={this.handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                </div>

                <h2 className="text-xl font-semibold">Document Processor Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                        <label className="block text-sm font-medium">API URL</label>
                        <input name="DOCUMENT_PROCESSOR_API_URL" type="text" value={settings.DOCUMENT_PROCESSOR_API_URL} onChange={this.handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium">API Key</label>
                        <input name="DOCUMENT_PROCESSOR_API_KEY" type="text" value={settings.DOCUMENT_PROCESSOR_API_KEY} onChange={this.handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium">Timeout (seconds)</label>
                        <input name="DOCUMENT_PROCESSOR_TIMEOUT" type="number" value={settings.DOCUMENT_PROCESSOR_TIMEOUT} onChange={this.handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div className="form-group">
                        <label className="block text-sm font-medium">Max Retries</label>
                        <input name="DOCUMENT_PROCESSOR_MAX_RETRIES" type="number" value={settings.DOCUMENT_PROCESSOR_MAX_RETRIES} onChange={this.handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                </div>
                
                <div className="flex items-center space-x-2">
                    <input
                        id="enableContextualRetrieval"
                        name="ENABLE_CONTEXTUAL_RETRIEVAL"
                        type="checkbox"
                        checked={settings.ENABLE_CONTEXTUAL_RETRIEVAL}
                        onChange={this.handleInputChange}
                        className="rounded border-gray-300"
                    />
                    <label htmlFor="enableContextualRetrieval" className="text-sm font-medium">
                        Enable Contextual Retrieval
                    </label>
                </div>

                <div className="flex items-center justify-end space-x-4 mt-6">
                    {success && (
                        <div className="flex items-center text-green-600">
                            <Save className="w-4 h-4 mr-2" />
                            <span>{success}</span>
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center text-red-600">
                            <XCircle className="w-4 h-4 mr-2" />
                            <span>{error}</span>
                        </div>
                    )}
                    <button
                        onClick={this.handleSave}
                        disabled={isSaving || !hasUnsavedChanges}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-opacity ${hasUnsavedChanges ? '' : 'opacity-50 cursor-not-allowed'}`}
                    >
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Settings
                    </button>
                </div>
            </div>
        );
    }

    render() {
        const { isLoading, error } = this.state;
        return (
            <div className="chat-collections-settings p-4">
                {/* <div className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 cursor-pointer" onClick={this.props.onBack}>
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Collections</span>
                </div> */}
                {isLoading ? (
                    <div className="plugin-template-loading">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p>Loading settings...</p>
                    </div>
                ) : error ? (
                    <div className="plugin-template-error">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                        <p>{error}</p>
                    </div>
                ) : (
                    this.renderForm()
                )}
            </div>
        );
    }
}
