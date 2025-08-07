import { ApiService } from "./types";

// Enums
export enum ViewType {
  COLLECTIONS = 'collections',
  DOCUMENTS = 'documents',
  CHAT = 'chat'
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

export enum ChatSessionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

// Base Interfaces
export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  chat_session_count?: number;
}

export interface Document {
  id: string;
  original_filename: string;
  file_size: number;
  document_type: string;
  collection_id: string;
  status: DocumentStatus;
  created_at: string;
  processed_at: string;
  error_message?: string;
  metadata?: object;
  chunk_count: number;
}

export interface ChatSession {
  id: string;
  collection_id: string;
  name: string;
  description?: string;
  status: ChatSessionStatus;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  message_count?: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_message: string;
  assistant_response: string;
  created_at: string;
  retrieved_chunks: string[];
  isStreaming?: boolean;
  metadata?: {
    sources?: string[];
    confidence?: number;
    processing_time?: number;
  };
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Component Props Interfaces
export interface CollectionsViewProps {
  collections: Collection[];
  onCollectionSelect: (collection: Collection) => void;
  onCollectionCreate: () => void;
  setError: (error: string | null) => void;
}

// Collections View State Interface
export interface CollectionsViewState {
  showCreateForm: boolean;
  newCollection: CreateCollectionForm;
  isCreating: boolean;
}

export enum CollectionViewType {
  GRID = 'grid',
  LIST = 'list'
}

// Collection Form Event Handlers
export type CollectionFormSubmitHandler = (form: CreateCollectionForm) => Promise<void>;
export type CollectionFormChangeHandler = (field: keyof CreateCollectionForm, value: string) => void;
export type CollectionFormCancelHandler = () => void;

export interface DocumentsViewProps {
  apiService?: ApiService;
  collection: Collection;
  selectedSession?: ChatSession | null;
  documents: Document[];
  chatSessions: ChatSession[];
  onDocumentUpload: () => void;
  onDocumentDelete: () => void;
  onChatSessionCreate: () => void;
  onChatSessionSelect: (session: ChatSession) => void;
  onChatSessionDelete: () => void;
  setError: (error: string | null) => void;
}

export interface ChatViewProps {
  apiService?: ApiService;
  session: ChatSession;
  messages: ChatMessage[];
  onMessageSent: () => void;
  setError: (error: string | null) => void;
}

// Form Data Interfaces
export interface CreateCollectionForm {
  name: string;
  description: string;
  color: string;
}

export interface CreateChatSessionForm {
  name: string;
  description?: string;
  collection_id: string;
}

export interface SendMessageForm {
  content: string;
  session_id: string;
}

// File Upload Interfaces
export interface FileUpload {
  file: File;
  collection_id: string;
  progress?: number;
  status?: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

export interface UploadProgress {
  file_id: string;
  progress: number;
  status: DocumentStatus;
  error?: string;
}

// State Interfaces
export interface AppState {
  currentView: ViewType;
  selectedCollection: Collection | null;
  selectedChatSession: ChatSession | null;
  collections: Collection[];
  documents: Document[];
  chatSessions: ChatSession[];
  chatMessages: ChatMessage[];
  loading: boolean;
  error: string | null;
}

// Hook Return Types
export interface UseCollectionsReturn {
  collections: Collection[];
  loading: boolean;
  error: string | null;
  createCollection: (data: CreateCollectionForm) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  updateCollection: (id: string, data: Partial<CreateCollectionForm>) => Promise<void>;
  refreshCollections: () => Promise<void>;
}

export interface UseDocumentsReturn {
  documents: Document[];
  loading: boolean;
  error: string | null;
  uploadDocument: (file: File, collectionId: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  refreshDocuments: (collectionId: string) => Promise<void>;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string, sessionId: string) => Promise<void>;
  createSession: (data: CreateChatSessionForm) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  refreshMessages: (sessionId: string) => Promise<void>;
}

// Event Handler Types
export type ViewChangeHandler = (view: ViewType) => void;
export type CollectionSelectHandler = (collection: Collection) => void;
export type ChatSessionSelectHandler = (session: ChatSession) => void;
export type ErrorHandler = (error: string | null) => void;
export type BackHandler = () => void;

// API Function Types
export type LoadCollectionsFunction = () => Promise<void>;
export type LoadDocumentsFunction = (collectionId: string) => Promise<void>;
export type LoadChatSessionsFunction = () => Promise<void>;
export type LoadChatMessagesFunction = (sessionId: string) => Promise<void>;

// Configuration Types
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  headers?: Record<string, string>;
}

// Default Colors for Collections
export const DEFAULT_COLLECTION_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
] as const;

export type CollectionColor = typeof DEFAULT_COLLECTION_COLORS[number];

// Collection Form Validation
export interface CollectionFormValidation {
  name: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  description: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  color: {
    required: boolean;
    pattern: RegExp;
  };
}

export const COLLECTION_FORM_VALIDATION: CollectionFormValidation = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  description: {
    required: true,
    minLength: 1,
    maxLength: 500,
  },
  color: {
    required: true,
    pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  },
};

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Error Types
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// WebSocket Types (if implementing real-time features)
export interface WebSocketMessage {
  type: 'message' | 'status' | 'error' | 'typing';
  session_id: string;
  data: any;
  timestamp: string;
}

export interface TypingIndicator {
  session_id: string;
  user_id: string;
  is_typing: boolean;
}

// Search/Filter Types
export interface DocumentFilter {
  collection_id?: string;
  status?: DocumentStatus;
  file_type?: string;
  created_after?: string;
  created_before?: string;
  search_query?: string;
}

export interface ChatSessionFilter {
  collection_id?: string;
  status?: ChatSessionStatus;
  created_after?: string;
  created_before?: string;
  search_query?: string;
}

// Main App Component Props
export interface ChatCollectionsAppProps {
  initialView?: ViewType;
  apiConfig?: Partial<ApiConfig>;
  theme?: 'light' | 'dark';
}
