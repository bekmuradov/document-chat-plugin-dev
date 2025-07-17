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
import {useState, useEffect} from 'react';

import { API_BASE } from './config';
import { ChatView, CollectionsView, DocumentsView } from './components';
import { ChatCollectionsAppProps, ViewType, Collection, ChatSession } from './custom-types';


// Main App Component
export const ChatCollectionsApp: React.FC<ChatCollectionsAppProps> = ({
  initialView = ViewType.COLLECTIONS,
  apiConfig,
  theme = 'light'
}) => {
  const [currentView, setCurrentView] = useState<ViewType>(initialView);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [selectedChatSession, setSelectedChatSession] = useState<ChatSession | null>(null);
  const [collections, setCollections] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load collections on mount
  useEffect(() => {
    loadCollections();
  }, []);

  // Load documents when collection changes
  useEffect(() => {
    if (selectedCollection) {
      loadDocuments(selectedCollection.id);
      loadChatSessions();
    }
  }, [selectedCollection]);

  // Load messages when chat session changes
  useEffect(() => {
    if (selectedChatSession) {
      loadChatMessages(selectedChatSession.id);
    }
  }, [selectedChatSession]);

  // API calls
  const loadCollections = async () => {
    try {
      const response = await fetch(`${API_BASE}/collections/`);
      if (!response.ok) throw new Error('Failed to load collections');
      const data = await response.json();
      setCollections(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadDocuments = async (collectionId: string) => {
    try {
      const response = await fetch(`${API_BASE}/documents/?collection_id=${collectionId}`);
      if (!response.ok) throw new Error('Failed to load documents');
      const data = await response.json();
      setDocuments(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadChatSessions = async () => {
    try {
      const response = await fetch(`${API_BASE}/chat/sessions`);
      if (!response.ok) throw new Error('Failed to load chat sessions');
      const data = await response.json() as ChatSession[];
      // Filter sessions for current collection
      const filtered = data.filter((session) => session.collection_id === selectedCollection?.id);
      setChatSessions(filtered);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadChatMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE}/chat/messages?session_id=${sessionId}`);
      if (!response.ok) throw new Error('Failed to load messages');
      const data = await response.json();
      setChatMessages(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    setError(null);
  };

  const handleCollectionSelect = (collection: Collection) => {
    setSelectedCollection(collection);
    setSelectedChatSession(null);
    setChatMessages([]);
    if (currentView === ViewType.COLLECTIONS) {
      setCurrentView(ViewType.DOCUMENTS);
    }
  };

  const handleChatSessionSelect = (session: ChatSession) => {
    setSelectedChatSession(session);
    setCurrentView(ViewType.CHAT);
  };

  const handleBack = () => {
    if (currentView === ViewType.CHAT) {
      setCurrentView(ViewType.DOCUMENTS);
      setSelectedChatSession(null);
      setChatMessages([]);
    } else if (currentView === ViewType.DOCUMENTS) {
      setCurrentView(ViewType.COLLECTIONS);
      setSelectedCollection(null);
      setDocuments([]);
      setChatSessions([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {(currentView !== 'collections') && (
                <button
                  onClick={handleBack}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back
                </button>
              )}
              <h1 className="text-2xl font-bold text-gray-900">
                {currentView === 'collections' && 'Collections'}
                {currentView === 'documents' && `Documents - ${selectedCollection?.name}`}
                {currentView === 'chat' && `Chat - ${selectedChatSession?.name}`}
              </h1>
            </div>
            
            {selectedCollection && (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewChange(ViewType.DOCUMENTS)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'documents'
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
                    currentView === 'chat'
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
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {currentView === 'collections' && (
          <CollectionsView
            collections={collections}
            onCollectionSelect={handleCollectionSelect}
            onCollectionCreate={loadCollections}
            setError={setError}
          />
        )}
        
        {currentView === 'documents' && selectedCollection && (
          <DocumentsView
            collection={selectedCollection}
            documents={documents}
            chatSessions={chatSessions}
            onDocumentUpload={() => loadDocuments(selectedCollection.id)}
            onDocumentDelete={() => loadDocuments(selectedCollection.id)}
            onChatSessionCreate={loadChatSessions}
            onChatSessionSelect={handleChatSessionSelect}
            setError={setError}
          />
        )}
        
        {currentView === 'chat' && selectedChatSession && (
          <ChatView
            session={selectedChatSession}
            messages={chatMessages}
            onMessageSent={() => loadChatMessages(selectedChatSession.id)}
            setError={setError}
          />
        )}
      </div>
    </div>
  );
};
