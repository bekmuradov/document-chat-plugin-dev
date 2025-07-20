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

import { API_BASE } from '../config';
import { DocumentsViewProps } from '../custom-types';

interface DocumentsViewState {
  uploading: boolean;
  showSessionForm: boolean;
  newSessionName: string;
}

export class DocumentsView extends React.Component<DocumentsViewProps, DocumentsViewState> {
  fileInputRef: React.RefObject<HTMLInputElement>;

  constructor(props: DocumentsViewProps) {
    super(props);
    this.state = {
      uploading: false,
      showSessionForm: false,
      newSessionName: '',
    };
    this.fileInputRef = React.createRef();

    // bind handlers if not using property initializers
    this.handleFileUpload = this.handleFileUpload.bind(this);
    this.handleDocumentDelete = this.handleDocumentDelete.bind(this);
    this.handleCreateSession = this.handleCreateSession.bind(this);
  }

  async handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    this.setState({ uploading: true });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('collection_id', this.props.collection.id);

    try {
      const response = await fetch(`${API_BASE}/documents/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload document');
      this.props.onDocumentUpload();
    } catch (err: any) {
      this.props.setError(err.message);
    } finally {
      this.setState({ uploading: false });
      e.target.value = '';
    }
  }

  async handleDocumentDelete(documentId: string) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`${API_BASE}/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete document');
      this.props.onDocumentDelete();
    } catch (err: any) {
      this.props.setError(err.message);
    }
  }

  async handleCreateSession() {
    const { newSessionName } = this.state;
    if (!newSessionName.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/chat/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSessionName,
          collection_id: this.props.collection.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to create chat session');

      this.setState({ newSessionName: '', showSessionForm: false });
      this.props.onChatSessionCreate();
    } catch (err: any) {
      this.props.setError(err.message);
    }
  }

  getStatusIcon(status: string) {
    switch (status) {
      case 'PROCESSED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'PROCESSING':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'FAILED':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  }

  render() {
    const { documents, chatSessions, onChatSessionSelect } = this.props;
    const { uploading, showSessionForm, newSessionName } = this.state;

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

          <div className="bg-white rounded-lg shadow-sm border">
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                <p className="text-gray-600">Upload your first document to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {this.getStatusIcon(doc.status)}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{doc.original_filename}</h4>
                          <p className="text-sm text-gray-500">
                            {doc.document_type} • {(doc.file_size / 1024).toFixed(1)} KB
                            {doc.chunk_count > 0 && ` • ${doc.chunk_count} chunks`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => this.handleDocumentDelete(doc.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

          <div className="bg-white rounded-lg shadow-sm border">
            {chatSessions.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No chat sessions</h3>
                <p className="text-xs text-gray-600">Create a session to start chatting</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onChatSessionSelect(session)}
                  >
                    <h4 className="text-sm font-medium text-gray-900">{session.name}</h4>
                    <p className="text-xs text-gray-500">
                      {session.message_count} messages • {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
