import React, { useState, useEffect, useCallback, useRef } from 'react';
import './PluginTemplate.css';
import { 
  MessageSquare, 
  FileText, 
  Loader2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { ChatView, CollectionsView, DocumentsView } from './components';
import { API_BASE } from './config';
import { Collection, ChatSession, ViewType, Document, ChatMessage } from './custom-types';
import type { TemplateTheme } from './types';

// Version information
export const version = '1.0.0';

interface Services {
  api?: {
    get: (url: string) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
    put: (url: string, data?: any) => Promise<any>;
    delete: (url: string) => Promise<any>;
  };
  theme?: {
    getCurrentTheme: () => TemplateTheme;
    addThemeChangeListener: (listener: (theme: TemplateTheme) => void) => void;
    removeThemeChangeListener: (listener: (theme: TemplateTheme) => void) => void;
  };
  settings?: {
    getSetting?: (key: string) => Promise<any>;
    setSetting?: (key: string, value: any) => Promise<void>;
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

// Functional component using hooks
const ChatCollectionsFunctional: React.FC<ChatCollectionsPluginProps> = (props) => {
  // State management using hooks
  const [state, setState] = useState<ChatCollectionsPluginState>({
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
  });

  // Refs for cleanup and API base URL
  const isMountedRef = useRef(true);
  const themeChangeListenerRef = useRef<((theme: TemplateTheme) => void) | null>(null);
  const pageContextUnsubscribeRef = useRef<(() => void) | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const apiBaseUrl = props.config?.apiBaseUrl || API_BASE;

  // Update state helper
  const updateState = useCallback((updates: Partial<ChatCollectionsPluginState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // API methods
  const loadCollections = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const { services } = props;
      let response;
      
      if (services.api) {
        response = await services.api.get(`${apiBaseUrl}/collections/`);
      } else {
        const fetchResponse = await fetch(`${apiBaseUrl}/collections/`);
        if (!fetchResponse.ok) throw new Error('Failed to load collections');
        response = await fetchResponse.json();
      }
      
      updateState({ collections: response });
    } catch (err: any) {
      updateState({ error: err.message });
    }
  }, [props.services, apiBaseUrl, updateState]);

  const loadDocuments = useCallback(async (collectionId: string) => {
    try {
      const { services } = props;
      let response;
      
      if (services.api) {
        response = await services.api.get(`${apiBaseUrl}/documents/?collection_id=${collectionId}`);
      } else {
        const fetchResponse = await fetch(`${apiBaseUrl}/documents/?collection_id=${collectionId}`);
        if (!fetchResponse.ok) throw new Error('Failed to load documents');
        response = await fetchResponse.json();
      }
      
      updateState({ documents: response });
    } catch (err: any) {
      updateState({ error: err.message });
    }
  }, [props.services, apiBaseUrl, updateState]);

  const loadChatSessions = useCallback(async () => {
    try {
      const { services } = props;
      let response;
      
      if (services.api) {
        response = await services.api.get(`${apiBaseUrl}/chat/sessions`);
      } else {
        const fetchResponse = await fetch(`${apiBaseUrl}/chat/sessions`);
        if (!fetchResponse.ok) throw new Error('Failed to load chat sessions');
        response = await fetchResponse.json();
      }
      
      const filtered = response.filter(
        (session: ChatSession) => session.collection_id === state.selectedCollection?.id
      );
      updateState({ chatSessions: filtered });
    } catch (err: any) {
      updateState({ error: err.message });
    }
  }, [props.services, apiBaseUrl, state.selectedCollection, updateState]);

  const loadChatMessages = useCallback(async (sessionId: string) => {
    try {
      const { services } = props;
      let response;
      
      if (services.api) {
        response = await services.api.get(`${apiBaseUrl}/chat/messages?session_id=${sessionId}`);
      } else {
        const fetchResponse = await fetch(`${apiBaseUrl}/chat/messages?session_id=${sessionId}`);
        if (!fetchResponse.ok) throw new Error('Failed to load messages');
        response = await fetchResponse.json();
      }
      
      updateState({ chatMessages: response });
    } catch (err: any) {
      updateState({ error: err.message });
    }
  }, [props.services, apiBaseUrl, updateState]);

  // Event handlers
  const handleViewChange = useCallback((view: ViewType) => {
    updateState({ currentView: view, error: null });
  }, [updateState]);

  const handleCollectionSelect = useCallback((collection: Collection) => {
    updateState({
      selectedCollection: collection,
      selectedChatSession: null,
      chatMessages: [],
      currentView: state.currentView === ViewType.COLLECTIONS ? ViewType.DOCUMENTS : state.currentView,
    });
  }, [state.currentView, updateState]);

  const handleChatSessionSelect = useCallback((session: ChatSession) => {
    updateState({
      selectedChatSession: session,
      currentView: ViewType.CHAT,
    });
  }, [updateState]);

  const handleBack = useCallback(() => {
    const { currentView } = state;
    if (currentView === ViewType.CHAT) {
      updateState({
        currentView: ViewType.DOCUMENTS,
        selectedChatSession: null,
        chatMessages: [],
      });
    } else if (currentView === ViewType.DOCUMENTS) {
      updateState({
        currentView: ViewType.COLLECTIONS,
        selectedCollection: null,
        documents: [],
        chatSessions: [],
      });
    }
  }, [state.currentView, updateState]);

  // Service initialization
  const initializeServices = useCallback(async () => {
    const { services } = props;
    
    // Initialize theme service
    if (services.theme) {
      const currentTheme = services.theme.getCurrentTheme();
      updateState({ currentTheme });
      
      // Listen for theme changes
      themeChangeListenerRef.current = (theme: TemplateTheme) => {
        updateState({ currentTheme: theme });
      };
      services.theme.addThemeChangeListener(themeChangeListenerRef.current);
    }

    // Initialize page context service
    if (services.pageContext) {
      pageContextUnsubscribeRef.current = services.pageContext.onPageContextChange((context) => {
        console.log('ChatCollectionsPlugin: Page context changed:', context);
      });
    }

    // Set up refresh interval if configured
    const refreshInterval = props.config?.refreshInterval;
    if (refreshInterval && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        refreshData();
      }, refreshInterval * 1000);
    }
  }, [props.services, props.config, updateState]);

  // Data refresh
  const refreshData = useCallback(async () => {
    if (state.loading) return;
    
    try {
      await loadCollections();
      if (state.selectedCollection) {
        await loadDocuments(state.selectedCollection.id);
        await loadChatSessions();
      }
    } catch (error) {
      console.error('ChatCollectionsPlugin: Failed to refresh data:', error);
    }
  }, [state.loading, state.selectedCollection, loadCollections, loadDocuments, loadChatSessions]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    updateState({ loading: true, error: null });
    try {
      await loadCollections();
    } catch (error) {
      console.error('ChatCollectionsPlugin: Failed to load initial data:', error);
      updateState({ error: 'Failed to load initial data' });
    } finally {
      updateState({ loading: false });
    }
  }, [loadCollections, updateState]);

  // Mount effect
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeServices();
        await loadInitialData();
        updateState({ isInitializing: false });
      } catch (error) {
        console.error('ChatCollectionsPlugin: Failed to initialize:', error);
        updateState({ 
          error: 'Failed to initialize plugin',
          isInitializing: false 
        });
      }
    };

    initialize();
  }, [initializeServices, loadInitialData, updateState]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      const { services } = props;
      
      if (services.theme && themeChangeListenerRef.current) {
        services.theme.removeThemeChangeListener(themeChangeListenerRef.current);
      }
      
      if (pageContextUnsubscribeRef.current) {
        pageContextUnsubscribeRef.current();
      }
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [props.services]);

  // Effect for collection changes
  useEffect(() => {
    if (state.selectedCollection) {
      loadDocuments(state.selectedCollection.id);
      loadChatSessions();
    }
  }, [state.selectedCollection, loadDocuments, loadChatSessions]);

  // Effect for chat session changes
  useEffect(() => {
    if (state.selectedChatSession) {
      loadChatMessages(state.selectedChatSession.id);
    }
  }, [state.selectedChatSession, loadChatMessages]);

  // Render methods
  const renderLoading = () => (
    <div className="plugin-template-loading">
      <div className="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
      <p>Loading Chat Collections...</p>
    </div>
  );

  const renderError = () => (
    <div className="plugin-template-error">
      <div className="error-icon">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <p>{state.error}</p>
      <button
        onClick={() => updateState({ error: null })}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Retry
      </button>
    </div>
  );

  const renderContent = () => {
    const {
      currentView,
      selectedCollection,
      selectedChatSession,
      collections,
      documents,
      chatSessions,
      chatMessages,
      error,
    } = state;

    return (
      <div className="chat-collections-plugin-content">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {currentView !== ViewType.COLLECTIONS && (
                  <button
                    onClick={handleBack}
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
                </h1>
              </div>
              {selectedCollection && (
                <div className="flex space-x-2 hidden">
                  <button
                    onClick={() => handleViewChange(ViewType.DOCUMENTS)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      currentView === ViewType.DOCUMENTS
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Documents
                  </button>
                  <button
                    onClick={() => handleViewChange(ViewType.CHAT)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      currentView === ViewType.CHAT
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 inline mr-2" />
                    Chat
                  </button>
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
                onClick={() => updateState({ error: null })}
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
              onCollectionSelect={handleCollectionSelect}
              onCollectionCreate={loadCollections}
              setError={(msg) => updateState({ error: msg })}
            />
          )}
          {currentView === ViewType.DOCUMENTS && selectedCollection && (
            <DocumentsView
              collection={selectedCollection}
              documents={documents}
              chatSessions={chatSessions}
              onDocumentUpload={() => loadDocuments(selectedCollection.id)}
              onDocumentDelete={() => loadDocuments(selectedCollection.id)}
              onChatSessionCreate={loadChatSessions}
              onChatSessionSelect={handleChatSessionSelect}
              setError={(msg) => updateState({ error: msg })}
            />
          )}
          {currentView === ViewType.CHAT && selectedChatSession && (
            <ChatView
              session={selectedChatSession}
              apiService={props.services.api}
              messages={chatMessages}
              onMessageSent={() => loadChatMessages(selectedChatSession.id)}
              setError={(msg) => updateState({ error: msg })}
            />
          )}
        </div>
      </div>
    );
  };

  const { currentTheme, isInitializing, error } = state;
  
  return (
    <div className={`plugin-template chat-collections-plugin ${currentTheme === 'dark' ? 'dark-theme' : ''}`}>
      {isInitializing ? (
        renderLoading()
      ) : error && !state.collections.length ? (
        renderError()
      ) : (
        renderContent()
      )}
    </div>
  );
};

/**
 * Class wrapper that provides the same interface as the original class component
 * but uses the functional component internally
 */
class ChatWrapperPlugin {
  private _component: React.ComponentType<ChatCollectionsPluginProps>;
  private _props: ChatCollectionsPluginProps;
  private _apiBaseUrl: string;

  constructor(props: ChatCollectionsPluginProps) {
    this._props = props;
    this._component = ChatCollectionsFunctional;
    this._apiBaseUrl = props.config?.apiBaseUrl || API_BASE;
  }

  /**
   * Simple test method for component validation
   * Returns plugin status and configuration info
   */
  getPluginInfo() {
    return {
      name: 'ChatWrapperPlugin',
      version: '1.0.0',
      status: 'initialized',
      apiBaseUrl: this._apiBaseUrl,
      hasServices: {
        api: !!this._props.services.api,
        theme: !!this._props.services.theme,
        settings: !!this._props.services.settings,
        pageContext: !!this._props.services.pageContext
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Render method that returns the functional component
   */
  render(): JSX.Element {
    const Component = this._component;
    return React.createElement(Component, this._props);
  }

  /**
   * Static method to create and render the component
   */
  static create(props: ChatCollectionsPluginProps): JSX.Element {
    return React.createElement(ChatCollectionsFunctional, props);
  }
}

export default ChatWrapperPlugin;
