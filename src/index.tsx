// import React from 'react';
// import PluginTemplate from './PluginTemplate';

// // Export the main component
// export default PluginTemplate;

// // Version information - TODO: Update version as you develop
// export const version = '1.0.0';

// // TEMPLATE: Plugin metadata for development/debugging
// export const metadata = {
//   name: 'ChatWithYourDocuments',
//   description: 'A chat with your documents BrainDrive Plugin',
//   version: '1.0.0',
//   author: 'BrainDrive',
//   // TODO: Add any additional metadata your plugin needs
// };

import React from 'react';
import './PluginTemplate.css';
import { 
  Plus, 
  Upload, 
  Trash2, 
  MessageSquare, 
  FileText, 
  Send, 
  Loader2,
  ArrowLeft,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

import { API_BASE } from './config';
import { ChatView, CollectionsView, DocumentsView } from './components';
import { ChatCollectionsAppProps, ViewType, Collection, ChatSession } from './custom-types';

// Version information
export const version = '1.0.0';

// State interface
interface ChatCollectionsAppState {
  currentView: ViewType;
  selectedCollection: Collection | null;
  selectedChatSession: ChatSession | null;
  collections: Collection[];
  documents: any[];
  chatSessions: ChatSession[];
  chatMessages: any[];
  loading: boolean;
  error: string | null;
  currentTheme: 'dark' | 'light';
}

// Main App Component as Class
export class ChatCollectionsApp extends React.Component<ChatCollectionsAppProps, ChatCollectionsAppState> {
  constructor(props: ChatCollectionsAppProps) {
    super(props);
    this.state = {
      currentView: props.initialView || ViewType.COLLECTIONS,
      selectedCollection: null,
      selectedChatSession: null,
      collections: [],
      documents: [],
      chatSessions: [],
      chatMessages: [],
      loading: false,
      error: null,
      currentTheme: 'light',
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

  componentDidMount() {
    this.loadCollections();
  }

  componentDidUpdate(prevProps: ChatCollectionsAppProps, prevState: ChatCollectionsAppState) {
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

  async loadCollections() {
    try {
      const response = await fetch(`${API_BASE}/collections/`);
      if (!response.ok) throw new Error('Failed to load collections');
      const data = await response.json();
      this.setState({ collections: data });
    } catch (err: any) {
      this.setState({ error: err.message });
    }
  }

  async loadDocuments(collectionId: string) {
    try {
      const response = await fetch(
        `${API_BASE}/documents/?collection_id=${collectionId}`
      );
      if (!response.ok) throw new Error('Failed to load documents');
      const data = await response.json();
      this.setState({ documents: data });
    } catch (err: any) {
      this.setState({ error: err.message });
    }
  }

  async loadChatSessions() {
    try {
      const response = await fetch(`${API_BASE}/chat/sessions`);
      if (!response.ok) throw new Error('Failed to load chat sessions');
      const data = (await response.json()) as ChatSession[];
      const filtered = data.filter(
        session => session.collection_id === this.state.selectedCollection?.id
      );
      this.setState({ chatSessions: filtered });
    } catch (err: any) {
      this.setState({ error: err.message });
    }
  }

  async loadChatMessages(sessionId: string) {
    try {
      const response = await fetch(
        `${API_BASE}/chat/messages?session_id=${sessionId}`
      );
      if (!response.ok) throw new Error('Failed to load messages');
      const data = await response.json();
      this.setState({ chatMessages: data });
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
  }

  handleChatSessionSelect(session: ChatSession) {
    this.setState({
      selectedChatSession: session,
      currentView: ViewType.CHAT,
    });
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
    }
  }

  render() {
    const {
      currentView,
      selectedCollection,
      selectedChatSession,
      collections,
      documents,
      chatSessions,
      chatMessages,
      error,
      currentTheme,
    } = this.state;

    return (
      <div className={`min-h-screen bg-gray-50 plugin-template ${currentTheme === 'dark' ? 'dark-theme' : ''}`}>
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
                </h1>
              </div>

              {selectedCollection && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => this.handleViewChange(ViewType.DOCUMENTS)}
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
                    onClick={() => this.handleViewChange(ViewType.CHAT)}
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
              documents={documents}
              chatSessions={chatSessions}
              onDocumentUpload={() => this.loadDocuments(selectedCollection.id)}
              onDocumentDelete={() => this.loadDocuments(selectedCollection.id)}
              onChatSessionCreate={this.loadChatSessions}
              onChatSessionSelect={this.handleChatSessionSelect}
              setError={(msg) => this.setState({ error: msg })}
            />
          )}

          {currentView === ViewType.CHAT && selectedChatSession && (
            <ChatView
              session={selectedChatSession}
              messages={chatMessages}
              onMessageSent={() => this.loadChatMessages(selectedChatSession.id)}
              setError={(msg) => this.setState({ error: msg })}
            />
          )}
        </div>
      </div>
    );
  }
}
