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

// const initialState: Document[] = [
//     {
//         "id": "563e9d97-84f3-4ea7-94b9-my-test-id",
//         "original_filename": "Project Overview.docx",
//         "file_size": 19109,
//         "document_type": "docx",
//         "collection_id": "699e163a-5e18-4d70-8ea5-bb4cad5922fb",
//         "status": DocumentStatus.PROCESSING,
//         "created_at": "2025-07-04T20:41:20.263928",
//         "processed_at": "2025-07-04T20:42:01.074257",
//         "metadata": {},
//         "chunk_count": 1
//     },
//     {
//         "id": "a7b2c9f1-3e45-4b89-92a1-test-doc-001",
//         "original_filename": "Marketing Strategy Q3.pdf",
//         "file_size": 45672,
//         "document_type": "pdf",
//         "collection_id": "699e163a-5e18-4d70-8ea5-bb4cad5922fb",
//         "status": DocumentStatus.PROCESSED,
//         "created_at": "2025-07-05T09:15:33.147892",
//         "processed_at": "2025-07-05T09:16:45.892341",
//         "metadata": {
//             "author": "Sarah Johnson",
//             "pages": 12
//         },
//         "chunk_count": 8,
//     },
//     {
//         "id": "f4e8d2c6-7a91-4b35-8f12-test-doc-002",
//         "original_filename": "Financial Report 2024.xlsx",
//         "file_size": 82456,
//         "document_type": "xlsx",
//         "collection_id": "a12b34c5-6d78-9e01-2f34-56789abcdef0",
//         "status": DocumentStatus.PROCESSED,
//         "created_at": "2025-07-03T14:22:17.894756",
//         "processed_at": "2025-07-03T14:24:03.156789",
//         "metadata": {
//             "sheets": 5,
//             "last_modified": "2025-06-30T18:00:00Z"
//         },
//         "chunk_count": 15,
//     },
//     {
//         "id": "b9c3f7e1-2d46-4a78-91b5-test-doc-003",
//         "original_filename": "Team Meeting Notes.txt",
//         "file_size": 3847,
//         "document_type": "txt",
//         "collection_id": "699e163a-5e18-4d70-8ea5-bb4cad5922fb",
//         "status": DocumentStatus.FAILED,
//         "created_at": "2025-07-06T11:30:45.123456",
//         "processed_at": "2025-07-06T11:31:12.789012",
//         "metadata": {},
//         "chunk_count": 0,
//         "error_message": "File corrupted during upload. Please re-upload the document."
//     },
//     {
//         "id": "e5a8b2d4-9c17-4f63-8e92-test-doc-004",
//         "original_filename": "Product Requirements Document.docx",
//         "file_size": 67893,
//         "document_type": "docx",
//         "collection_id": "c78d91e2-3f45-6g78-9h01-234567890abc",
//         "status": DocumentStatus.PROCESSED,
//         "created_at": "2025-07-02T16:45:22.567890",
//         "processed_at": "2025-07-02T16:47:18.234567",
//         "metadata": {
//             "version": "2.1",
//             "author": "Alex Chen",
//             "word_count": 4250
//         },
//         "chunk_count": 12,
//     },
//     {
//         "id": "d7f1a3c8-5b29-4e84-97c6-test-doc-005",
//         "original_filename": "User Research Findings.pdf",
//         "file_size": 91234,
//         "document_type": "pdf",
//         "collection_id": "a12b34c5-6d78-9e01-2f34-56789abcdef0",
//         "status": DocumentStatus.PROCESSING,
//         "created_at": "2025-07-07T08:12:55.678901",
//         "processed_at": "2025-07-07T08:13:22.345678",
//         "metadata": {
//             "pages": 24,
//             "research_method": "interviews"
//         },
//         "chunk_count": 0,
//     },
//     {
//         "id": "c2e6b4f9-8a35-4d71-92b8-test-doc-006",
//         "original_filename": "API Documentation v3.2.md",
//         "file_size": 28567,
//         "document_type": "md",
//         "collection_id": "c78d91e2-3f45-6g78-9h01-234567890abc",
//         "status": DocumentStatus.PROCESSED,
//         "created_at": "2025-07-01T13:28:41.789012",
//         "processed_at": "2025-07-01T13:30:15.456789",
//         "metadata": {
//             "version": "3.2",
//             "last_updated": "2025-06-28T10:00:00Z",
//             "endpoints": 47
//         },
//         "chunk_count": 6,
//     },
//     {
//         "id": "a9b5c1e7-4f83-4d26-98a4-test-doc-007",
//         "original_filename": "Training Materials.pptx",
//         "file_size": 156789,
//         "document_type": "pptx",
//         "collection_id": "699e163a-5e18-4d70-8ea5-bb4cad5922fb",
//         "status": DocumentStatus.UPLOADED,
//         "created_at": "2025-07-08T10:05:18.234567",
//         "processed_at": "2025-07-08T10:05:18.234567",
//         "metadata": {
//             "slides": 45,
//             "template": "corporate"
//         },
//         "chunk_count": 0
//     },
//     {
//         "id": "f8c4d2a6-7e91-4b58-83f1-test-doc-008",
//         "original_filename": "Database Schema Design.sql",
//         "file_size": 12345,
//         "document_type": "sql",
//         "collection_id": "c78d91e2-3f45-6g78-9h01-234567890abc",
//         "status": DocumentStatus.PROCESSED,
//         "created_at": "2025-06-29T15:42:07.890123",
//         "processed_at": "2025-06-29T15:43:33.567890",
//         "metadata": {
//             "tables": 18,
//             "relationships": 12,
//             "database_type": "PostgreSQL"
//         },
//         "chunk_count": 4,
//     }
// ];

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
          // ...initialState,
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
            <h2 className="text-lg leading-6 font-medium text-gray-900">Documents</h2>
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
                className="bg-blue-500 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center text-sm disabled:opacity-50"
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
            <h2 className="text-lg leading-6 font-medium text-gray-900">Chat Sessions</h2>
            <button
              onClick={() => this.setState({ showSessionForm: true })}
              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
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
