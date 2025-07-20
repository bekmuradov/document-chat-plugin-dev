import React, { ChangeEvent, KeyboardEvent } from 'react';
import { 
  Plus, 
  Upload, 
  Trash2, 
  MessageSquare, 
  FileText, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

import { API_BASE } from '../../config';
import { DocumentsViewProps, DocumentStatus, Document } from '../../custom-types';
import { Utils } from '../../utils';
import { ChatSessions } from './ChatSessions';
import { DocumentList } from './DocumentList';

interface DocumentWithPlaceholder extends Document {
  isPlaceholder?: boolean;
}

interface DocumentsViewState {
  uploading: boolean;
  showSessionForm: boolean;
  newSessionName: string;
  documents: DocumentWithPlaceholder[];
}

const initialState: Document[] = [
    {
        "id": "563e9d97-84f3-4ea7-94b9-my-test-id",
        "original_filename": "Project Overview.docx",
        "file_size": 19109,
        "document_type": "docx",
        "collection_id": "699e163a-5e18-4d70-8ea5-bb4cad5922fb",
        "status": DocumentStatus.PROCESSING,
        "created_at": "2025-07-04T20:41:20.263928",
        "processed_at": "2025-07-04T20:42:01.074257",
        "metadata": {},
        "chunk_count": 1
    }
]

export class DocumentsView extends React.Component<DocumentsViewProps, DocumentsViewState> {
  fileInputRef: React.RefObject<HTMLInputElement>;

  constructor(props: DocumentsViewProps) {
    super(props);
    this.state = {
      uploading: false,
      showSessionForm: false,
      newSessionName: '',
      documents: [...(props.documents || [])],
    };
    this.fileInputRef = React.createRef();

    // bind handlers if not using property initializers
    this.handleFileUpload = this.handleFileUpload.bind(this);
    this.handleDocumentDelete = this.handleDocumentDelete.bind(this);
    this.handleCreateSession = this.handleCreateSession.bind(this);
  }

  componentDidUpdate(prevProps: DocumentsViewProps) {
    // Update local documents when props change (but preserve placeholders)
    if (prevProps.documents !== this.props.documents) {
      this.setState((prevState) => ({
        documents: [
          ...initialState,
          // Keep placeholders
          ...prevState.documents.filter(doc => doc.isPlaceholder),
          // Add real documents
          ...(this.props.documents || [])
        ]
      }));
    }
  }

  componentWillUnmount() {
    // Clean up any active polling when component unmounts
    Utils.stopAllPolling();
  }

  async handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use the utility for file validation
    const validation = Utils.validateFile(file, {
      maxSizeBytes: 10 * 1024 * 1024, // 10MB
      allowedExtensions: ['.pdf', '.doc', '.docx'],
      allowedTypes: [
        'application/pdf',
        'application/msword',
      ]
    });

    if (!validation.isValid) {
      Utils.showToast(validation.error!, 'error');
      e.target.value = '';
      return;
    }

    // 1. Create placeholder document for immediate UI feedback
    const placeholderDoc = Utils.createPlaceholderDocument(file, this.props.collection.id);
    
    // Add placeholder to local state
    this.setState((prevState) => ({
      documents: [placeholderDoc, ...prevState.documents]
    }));

    this.setState({ uploading: true });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection_id', this.props.collection.id);

    try {
      Utils.showLoading();
      const response = await fetch(`${API_BASE}/documents/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload document: ${response.statusText}`);
      }

      const uploadedDocument = await response.json();
      Utils.showToast(`Successfully uploaded "${file.name}"`, 'success');

      // 2. Replace placeholder with actual document
      this.setState((prevState) => ({
        documents: prevState.documents.map(doc => 
          doc.id === placeholderDoc.id 
            ? { ...uploadedDocument, isPlaceholder: false }
            : doc
        )
      }));
      // 3. Start polling for document status
      Utils.pollDocumentStatus(
        uploadedDocument.id,
        // onStatusUpdate callback
        (updatedDoc) => {
          this.setState((prevState) => ({
            documents: prevState.documents.map(doc =>
              doc.id === uploadedDocument.id
                ? { ...updatedDoc, isPlaceholder: false }
                : doc
            )
          }));
          console.log("Updated doc: ", updatedDoc);

          console.log("State documents: ", this.state.documents);
        },
        // options
        {
          apiBase: API_BASE,
          onComplete: (finalDoc) => {
            this.setState({ uploading: false });
            // Refresh the parent component's document list
            this.props.onDocumentUpload();
          },
          onError: (error) => {
            Utils.showToast(`Error polling document status: ${error}`, 'error');
            // Remove the document from local state on error
            this.setState((prevState) => ({
              documents: prevState.documents.filter(doc => doc.id !== uploadedDocument.id)
            }));
          }
        }
      );
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload document';
      Utils.showToast(errorMessage, 'error');
      this.props.setError(errorMessage);

      // Remove placeholder on error
      this.setState(prevState => ({
        documents: prevState.documents.filter(doc => doc.id !== placeholderDoc.id)
      }));
    } finally {
      // this.setState({ uploading: false });
      Utils.hideLoading();
      e.target.value = '';
    }
  }

  async handleDocumentDelete(documentId: string, documentName: string) {
    if (!confirm(`Are you sure you want to delete "${documentName}"?`)) return;

    Utils.showLoading(`Deleting "${documentName}"...`);

    try {
      // Stop any active polling for this document
      Utils.stopPollingDocument(documentId);

      const response = await fetch(`${API_BASE}/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.statusText}`);
      }

      Utils.showToast(`Successfully deleted "${documentName}"`, 'success');

      // Remove from local state immediately
      this.setState(prevState => ({
        documents: prevState.documents.filter(doc => doc.id !== documentId)
      }));

      this.props.onDocumentDelete();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete document';
      Utils.showToast(errorMessage, 'error');
      this.props.setError(errorMessage);
    } finally {
      Utils.hideLoading();
    }
  }

  async handleCreateSession() {
    const { newSessionName } = this.state;
    const trimmedName = newSessionName.trim();

    if (!trimmedName) {
      Utils.showToast('Please enter a session name', 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSessionName,
          collection_id: this.props.collection.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create chat session: ${response.statusText}`);
      }

      Utils.showToast(`Created session "${trimmedName}"`, 'success');
      this.setState({ newSessionName: '', showSessionForm: false });
      this.props.onChatSessionCreate();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create chat session';
      Utils.showToast(errorMessage, 'error');
      this.props.setError(errorMessage);
    }
  }

  // TODO: Implement chat session delete with propagation
  // handleDeleteSession(event, sessionId) {
  //     event.stopPropagation();
  //     this.deleteSession(sessionId);
  // }

  render() {
    const { chatSessions, onChatSessionSelect } = this.props;
    const { uploading, showSessionForm, newSessionName, documents } = this.state;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Documents Section */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
            <div className="flex space-x-3">
              <input
                type="file"
                ref={this.fileInputRef}
                onChange={this.handleFileUpload}
                accept=".pdf,.doc,.docx"
                className="hidden"
              />
              <button
                onClick={() => this.fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>

          {/* Documents list here */}
          <DocumentList documents={documents} onDocumentDelete={this.handleDocumentDelete} />
        </div>

        {/* Chat Sessions Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Chat Sessions</h2>
            <button
              onClick={() => this.setState({ showSessionForm: true })}
              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Session
            </button>
          </div>

          {/* Create Session Form */}
          {showSessionForm && (
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
              <div className="space-y-3">
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => this.setState({ newSessionName: e.target.value })}
                  placeholder="Session name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      this.handleCreateSession();
                    }
                  }}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={this.handleCreateSession}
                    disabled={!newSessionName.trim()}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => this.setState({ showSessionForm: false })}
                    className="bg-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <ChatSessions chatSessions={chatSessions} onChatSessionSelect={onChatSessionSelect} />
        </div>
      </div>
    );
  }
}
