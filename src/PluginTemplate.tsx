import React from 'react';
import './PluginTemplate.css';
import { 
  MessageSquare, 
  FileText, 
  Loader2,
  ArrowLeft,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { ChatView, CollectionsView, DocumentsView, CreateSessionForm, ChatCollectionsSettings } from './components';
import { API_BASE } from './config';
import { Collection, ChatSession, ViewType, Document, ChatMessage } from './custom-types';
import type { TemplateTheme, Services } from './types';

// Version information
export const version = '1.0.0';

interface ComponentServices {
  api?: {
    get: (url: string) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
    put: (url: string, data?: any) => Promise<any>;
    delete: (url: string) => Promise<any>;
  };
  // event: {
  //   sendMessage: (target: string, message: any, options?: any) => void;
  //   subscribeToMessages: (target: string, callback: (message: any) => void) => void;
  //   unsubscribeFromMessages: (target: string, callback: (message: any) => void) => void;
  // },
  theme?: {
    getCurrentTheme: () => TemplateTheme;
    addThemeChangeListener: (listener: (theme: TemplateTheme) => void) => void;
    removeThemeChangeListener: (listener: (theme: TemplateTheme) => void) => void;
  };
  settings?: {
    getSetting?: (key: string) => Promise<any>;
    setSetting?: (key: string, value: any) => Promise<void>;
    registerSettingDefinition?: (definition: any) => Promise<void>;
    getSettingDefinitions?: (filter?: { id?: string; category?: string; tags?: string[] }) => Promise<any[]>;
    subscribe?: (key: string, callback: (value: any) => void) => () => void;
  };
  pageContext?: {
    getCurrentPageContext: () => PageContext | null;
    onPageContextChange: (handler: (context: PageContext) => void) => () => void;
  };
}

interface ChatCollectionsConfig {
  apiBaseUrl?: string;
  refreshInterval?: number;
  showAdvancedOptions?: boolean;
  maxDocuments?: number;
  chatSettings?: {
    maxMessages?: number;
    autoSave?: boolean;
  };
}

interface ChatCollectionsPluginProps {
  title?: string;
  description?: string;
  pluginId?: string;
  moduleId?: string;
  instanceId?: string;
  config?: ChatCollectionsConfig;
  services: Services;
}

interface PageContext {
  pageId?: string;
  pageName?: string;
  pageRoute?: string;
  isStudioPage?: boolean;
}

interface ChatCollectionsPluginState {
  currentView: ViewType;
  selectedCollection: Collection | null;
  selectedChatSession: ChatSession | null;
  collections: Collection[];
  documents: Document[];
  chatSessions: ChatSession[];
  chatMessages: ChatMessage[];
  loading: boolean;
  error: string | null;
  currentTheme: TemplateTheme;
  isInitializing: boolean;
}

const requiredServiceRuntimes = [
  {
    "name": "cwyd_service",
    "healthcheck_url": "http://localhost:8000/health",
  },
  {
    "name": "document_processing_service",
    "healthcheck_url": "http://localhost:8080/health",
  },
]

/**
 * Chat Collections Plugin for BrainDrive
 * 
 * This plugin provides a comprehensive interface for managing document collections
 * and chat sessions within the BrainDrive ecosystem.
 * 
 * Key features:
 * - Collection management with document upload/organization
 * - Chat sessions linked to collections
 * - Document viewing and management
 * - Theme-aware interface
 * - Error handling and loading states
 */
class ChatCollectionsPlugin extends React.Component<ChatCollectionsPluginProps, ChatCollectionsPluginState> {
  private _isMounted: boolean = false;
  private themeChangeListener: ((theme: TemplateTheme) => void) | null = null;
  private pageContextUnsubscribe: (() => void) | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private apiBaseUrl: string;

  constructor(props: ChatCollectionsPluginProps) {
    super(props);
    
    // Initialize API base URL from config or default
    this.apiBaseUrl = props.config?.apiBaseUrl || API_BASE;
    
    this.state = {
      currentView: ViewType.COLLECTIONS,
      selectedCollection: null,
      selectedChatSession: null,
      collections: [],
      documents: [],
      chatSessions: [],
      chatMessages: [],
      loading: false,
      error: null,
      currentTheme: 'light',
      isInitializing: true,
    };

    // Bind handlers
    this.loadCollections = this.loadCollections.bind(this);
    this.loadDocuments = this.loadDocuments.bind(this);
    this.loadChatSessions = this.loadChatSessions.bind(this);
    this.loadChatMessages = this.loadChatMessages.bind(this);
    this.handleViewChange = this.handleViewChange.bind(this);
    this.handleCollectionSelect = this.handleCollectionSelect.bind(this);
    this.handleChatSessionSelect = this.handleChatSessionSelect.bind(this);
    this.handleBack = this.handleBack.bind(this);
  }

  async componentDidMount() {
    this._isMounted = true;
    try {
      await this.initializeServices();
      await this.loadInitialData();
      this.setState({ isInitializing: false });
    } catch (error) {
      console.error('ChatCollectionsPlugin: Failed to initialize:', error);
      this.setState({ 
        error: 'Failed to initialize plugin',
        isInitializing: false 
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.cleanupServices();
  }

  componentDidUpdate(prevProps: ChatCollectionsPluginProps, prevState: ChatCollectionsPluginState) {
    if (
      this.state.selectedCollection &&
      prevState.selectedCollection?.id !== this.state.selectedCollection.id
    ) {
      this.loadDocuments(this.state.selectedCollection.id);
      this.loadChatSessions();
    }
    if (
      this.state.selectedChatSession &&
      prevState.selectedChatSession?.id !== this.state.selectedChatSession.id
    ) {
      this.loadChatMessages(this.state.selectedChatSession.id);
    }
  }

  /**
   * Initialize BrainDrive services
   */
  private async initializeServices(): Promise<void> {
    const { services } = this.props;
    
    // Initialize theme service
    if (services.theme) {
      const currentTheme = services.theme.getCurrentTheme();
      this.setState({ currentTheme });
      
      // Listen for theme changes
      this.themeChangeListener = (theme: TemplateTheme) => {
        this.setState({ currentTheme: theme });
      };
      services.theme.addThemeChangeListener(this.themeChangeListener);
    }

    // Initialize page context service
    if (services.pageContext) {
      this.pageContextUnsubscribe = services.pageContext.onPageContextChange((context) => {
        console.log('ChatCollectionsPlugin: Page context changed:', context);
        // Handle page context changes if needed
      });
    }

    // Initialize event service for plugin communication
    // if (services.event) {
    //   services.event.on('collection:created', this.handleCollectionCreated.bind(this));
    //   services.event.on('document:uploaded', this.handleDocumentUploaded.bind(this));
    //   services.event.on('chat:message:sent', this.handleChatMessageSent.bind(this));
    // }

    // Set up refresh interval if configured
    const refreshInterval = this.props.config?.refreshInterval;
    if (refreshInterval && refreshInterval > 0) {
      this.refreshInterval = setInterval(() => {
        this.refreshData();
      }, refreshInterval * 1000);
    }
  }

  /**
   * Clean up services and listeners
   */
  private cleanupServices(): void {
    const { services } = this.props;
    
    if (services.theme && this.themeChangeListener) {
      services.theme.removeThemeChangeListener(this.themeChangeListener);
    }
    
    if (this.pageContextUnsubscribe) {
      this.pageContextUnsubscribe();
    }
    
    // if (services.event) {
    //   services.event.off('collection:created', this.handleCollectionCreated);
    //   services.event.off('document:uploaded', this.handleDocumentUploaded);
    //   services.event.off('chat:message:sent', this.handleChatMessageSent);
    // }
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  /**
   * Load initial data for the plugin
   */
  private async loadInitialData(): Promise<void> {
    this.setState({ loading: true, error: null });
    try {
      await this.loadCollections();
    } catch (error) {
      console.error('ChatCollectionsPlugin: Failed to load initial data:', error);
      this.setState({ error: 'Failed to load initial data' });
    } finally {
      this.setState({ loading: false });
    }
  }

  /**
   * Refresh data periodically
   */
  private async refreshData(): Promise<void> {
    if (this.state.loading) return;
    
    try {
      await this.loadCollections();
      if (this.state.selectedCollection) {
        await this.loadDocuments(this.state.selectedCollection.id);
        await this.loadChatSessions();
      }
    } catch (error) {
      console.error('ChatCollectionsPlugin: Failed to refresh data:', error);
    }
  }

  // Event handlers for plugin communication
  private handleCollectionCreated(data: any): void {
    this.loadCollections();
  }

  private handleDocumentUploaded(data: any): void {
    if (this.state.selectedCollection) {
      this.loadDocuments(this.state.selectedCollection.id);
    }
  }

  private handleChatMessageSent(data: any): void {
    if (this.state.selectedChatSession) {
      this.loadChatMessages(this.state.selectedChatSession.id);
    }
  }

  /**
   * Simple test method for component validation
   * Returns plugin status and configuration info
   */
  getPluginInfo() {
    return {
      name: 'ChatCollectionsPlugin',
      version: '1.0.0',
      status: 'initialized',
      apiBaseUrl: this.apiBaseUrl,
      hasServices: {
        api: !!this.props.services.api,
        theme: !!this.props.services.theme,
        settings: !!this.props.services.settings,
        pageContext: !!this.props.services.pageContext
      },
      currentState: {
        currentView: this.state.currentView,
        collectionsCount: this.state.collections.length,
        hasSelectedCollection: !!this.state.selectedCollection,
        isLoading: this.state.loading,
        hasError: !!this.state.error,
        theme: this.state.currentTheme,
        isInitializing: this.state.isInitializing
      },
      timestamp: new Date().toISOString()
    };
  }

  // API methods using BrainDrive services
  async loadCollections() {
    if (!this._isMounted && !this.state) {
      return;
    }
    try {
      const { services } = this.props;
      let response;
      
      if (services.api) {
        response = await services.api.get(`${this.apiBaseUrl}/collections/`);
      } else {
        // Fallback to fetch if API service not available
        const fetchResponse = await fetch(`${this.apiBaseUrl}/collections/`);
        if (!fetchResponse.ok) throw new Error('Failed to load collections');
        response = await fetchResponse.json();
      }
      
      this.setState({ collections: response });
    } catch (err: any) {
      this.setState({ error: err.message });
    }
  }

  async loadDocuments(collectionId: string) {
    try {
      const { services } = this.props;
      let response;
      
      if (services.api) {
        response = await services.api.get(`${this.apiBaseUrl}/documents/?collection_id=${collectionId}`);
      } else {
        const fetchResponse = await fetch(`${this.apiBaseUrl}/documents/?collection_id=${collectionId}`);
        if (!fetchResponse.ok) throw new Error('Failed to load documents');
        response = await fetchResponse.json();
      }
      
      this.setState({ documents: response });
    } catch (err: any) {
      this.setState({ error: err.message });
    }
  }

  async loadChatSessions() {
    try {
      const { services } = this.props;
      let response;
      
      if (services.api) {
        response = await services.api.get(`${this.apiBaseUrl}/chat/sessions`);
      } else {
        const fetchResponse = await fetch(`${this.apiBaseUrl}/chat/sessions`);
        if (!fetchResponse.ok) throw new Error('Failed to load chat sessions');
        response = await fetchResponse.json();
      }
      
      const filtered = response.filter(
        (session: ChatSession) => session.collection_id === this.state.selectedCollection?.id
      );
      this.setState({ chatSessions: filtered });
    } catch (err: any) {
      this.setState({ error: err.message });
    }
  }

  async loadChatMessages(sessionId: string) {
    try {
      const { services } = this.props;
      let response;
      
      if (services.api) {
        response = await services.api.get(`${this.apiBaseUrl}/chat/messages?session_id=${sessionId}`);
      } else {
        const fetchResponse = await fetch(`${this.apiBaseUrl}/chat/messages?session_id=${sessionId}`);
        if (!fetchResponse.ok) throw new Error('Failed to load messages');
        response = await fetchResponse.json();
      }
      
      this.setState({ chatMessages: response });
    } catch (err: any) {
      this.setState({ error: err.message });
    }
  }

  handleViewChange(view: ViewType) {
    this.setState({ currentView: view, error: null });
  }

  handleCollectionSelect(collection: Collection) {
    this.setState({
      selectedCollection: collection,
      selectedChatSession: null,
      chatMessages: [],
      currentView:
        this.state.currentView === ViewType.COLLECTIONS
          ? ViewType.DOCUMENTS
          : this.state.currentView,
    });

    // Emit event for other plugins
    // if (this.props.services.event && this.props.services.event.emit) {
    //   this.props.services.event.emit('collection:selected', collection);
    // }
  }

  async handleChatSessionSelect(session: ChatSession) {
    if (session) {
      this.setState({
        selectedChatSession: session,
        // currentView: ViewType.CHAT
      });
      this.loadChatMessages(session.id);
    }

    // Emit event for other plugins
    // if (this.props.services.event && this.props.services.event.emit) {
    //   this.props.services.event.emit('chat:session:selected', session);
    // }
  }

  handleBack() {
    const { currentView } = this.state;
    if (currentView === ViewType.CHAT) {
      this.setState({
        currentView: ViewType.DOCUMENTS,
        selectedChatSession: null,
        chatMessages: [],
      });
    } else if (currentView === ViewType.DOCUMENTS) {
      this.setState({
        currentView: ViewType.COLLECTIONS,
        selectedCollection: null,
        documents: [],
        chatSessions: [],
      });
    } else if (currentView === ViewType.SETTINGS) {
      this.setState({
        currentView: ViewType.COLLECTIONS,
        selectedCollection: null,
        documents: [],
        chatSessions: [],
      });
    }
  }

  /**
   * Render loading state
   */
  private renderLoading(): JSX.Element {
    return (
      <div className="plugin-template-loading">
        <div className="loading-spinner">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <p>Loading Chat Collections...</p>
      </div>
    );
  }

  /**
   * Render error state
   */
  private renderError(): JSX.Element {
    return (
      <div className="plugin-template-error">
        <div className="error-icon">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <p>{this.state.error}</p>
        <button
          onClick={() => this.setState({ error: null })}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  /**
   * Render main plugin content
   */
  private renderContent(): JSX.Element {
    const {
      currentView,
      selectedCollection,
      selectedChatSession,
      collections,
      documents,
      chatSessions,
      chatMessages,
      error,
    } = this.state;
    const {services} = this.props;

    return (
      <div className="chat-collections-plugin-content">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {currentView !== ViewType.COLLECTIONS && (
                  <button
                    onClick={this.handleBack}
                    className="flex items-center text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back
                  </button>
                )}
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentView === ViewType.COLLECTIONS && 'Collections'}
                  {currentView === ViewType.DOCUMENTS && `Documents - ${selectedCollection?.name}`}
                  {currentView === ViewType.CHAT && `Chat - ${selectedChatSession?.name}`}
                  {currentView === ViewType.SETTINGS && 'Plugin Settings'}
                </h1>
              </div>
              {currentView !== ViewType.SETTINGS && (
                <button
                    onClick={() => this.handleViewChange(ViewType.SETTINGS)}
                    className="p-2 rounded-full text-gray-600 hover:bg-gray-100"
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>
              )}
              {selectedCollection && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => this.handleViewChange(ViewType.DOCUMENTS)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors hidden ${
                      currentView === ViewType.DOCUMENTS
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Documents
                  </button>
                  <button
                    onClick={() => this.handleViewChange(ViewType.CHAT)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors hidden ${
                      currentView === ViewType.CHAT
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 inline mr-2" />
                    Chat
                  </button>
                  <CreateSessionForm
                    collectionId={selectedCollection.id}
                    onSessionCreated={this.handleChatSessionSelect}
                    onError={(error) => console.error(error)}
                    buttonText="New Chat"
                    placeholder="Session name"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <span className="text-red-700">{error}</span>
              <button
                onClick={() => this.setState({ error: null })}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {currentView === ViewType.COLLECTIONS && (
            <CollectionsView
              collections={collections}
              onCollectionSelect={this.handleCollectionSelect}
              onCollectionCreate={this.loadCollections}
              setError={(msg) => this.setState({ error: msg })}
            />
          )}
          {currentView === ViewType.DOCUMENTS && selectedCollection && (
            <DocumentsView
              collection={selectedCollection}
              selectedSession={selectedChatSession}
              documents={documents}
              chatSessions={chatSessions}
              apiService={this.props.services.api}
              onDocumentUpload={() => this.loadDocuments(selectedCollection.id)}
              onDocumentDelete={() => this.loadDocuments(selectedCollection.id)}
              onChatSessionCreate={this.loadChatSessions}
              onChatSessionSelect={this.handleChatSessionSelect}
              onChatSessionDelete={this.loadChatSessions}
              setError={(msg) => this.setState({ error: msg })}
            />
          )}
          {currentView === ViewType.CHAT && selectedChatSession && (
            <ChatView
              session={selectedChatSession}
              apiService={this.props.services.api}
              messages={chatMessages}
              onMessageSent={() => this.loadChatMessages(selectedChatSession.id)}
              setError={(msg) => this.setState({ error: msg })}
            />
          )}
          {currentView === ViewType.SETTINGS && (
            <ChatCollectionsSettings services={services} />
          )}
        </div>
      </div>
    );
  }

  render(): JSX.Element {
    const { currentTheme, isInitializing, error } = this.state;
    
    return (
      <div className={`plugin-template chat-collections-plugin ${currentTheme === 'dark' ? 'dark-theme' : ''}`}>
        {isInitializing ? (
          this.renderLoading()
        ) : error && !this.state.collections.length ? (
          this.renderError()
        ) : (
          this.renderContent()
        )}
      </div>
    );
  }
}

export default ChatCollectionsPlugin;
