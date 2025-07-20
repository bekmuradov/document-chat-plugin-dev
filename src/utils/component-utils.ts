// utils.ts - Reusable utilities for plugin components

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  file?: File;
}

export class Utils {
  private static toastContainer: HTMLElement | null = null;
  private static toastCounter = 0;
  private static loadingOverlay: HTMLElement | null = null;
  private static activePollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize loading overlay - call this once when your app starts
   */
  static initLoadingOverlay(): void {
    if (document.getElementById('loading-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = `
      fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center hidden
      backdrop-blur-sm
    `.replace(/\s+/g, ' ').trim();

    overlay.innerHTML = `
      <div class="bg-white rounded-lg p-6 flex items-center space-x-4 shadow-xl">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="text-gray-700 font-medium">Loading...</span>
      </div>
    `;

    document.body.appendChild(overlay);
    this.loadingOverlay = overlay;
  }

  /**
   * Show loading overlay
   */
  static showLoading(message = 'Loading...'): void {
    if (!this.loadingOverlay) {
      this.initLoadingOverlay();
    }

    const messageEl = this.loadingOverlay!.querySelector('span');
    if (messageEl) {
      messageEl.textContent = message;
    }

    this.loadingOverlay!.classList.remove('hidden');
  }

  /**
   * Hide loading overlay
   */
  static hideLoading(): void {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.add('hidden');
    }
  }

  /**
   * Initialize toast container - call this once when your app starts
   */
  static initToastContainer(): void {
    if (document.getElementById('toast-container')) return;

    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-4 right-4 z-50 space-y-2 pointer-events-none';
    document.body.appendChild(container);
    this.toastContainer = container;
  }

  /**
   * Show toast notification
   */
  static showToast(message: string, type: ToastType = 'info', duration = 3000): void {
    // Ensure container exists
    if (!this.toastContainer) {
      this.initToastContainer();
    }

    const container = this.toastContainer!;
    const toastId = `toast-${++this.toastCounter}`;
    const toast = document.createElement('div');

    const bgColors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.id = toastId;
    toast.className = `
      ${bgColors[type]} text-white px-4 py-3 rounded-lg shadow-lg
      transform transition-all duration-300 translate-x-full opacity-0
      pointer-events-auto cursor-pointer flex items-center space-x-2
      max-w-sm
    `.replace(/\s+/g, ' ').trim();

    toast.innerHTML = `
      <span class="text-sm font-medium">${icons[type]}</span>
      <span class="text-sm flex-1">${this.escapeHtml(message)}</span>
      <button class="ml-2 text-white hover:text-gray-200 text-lg leading-none" onclick="this.parentElement.remove()">&times;</button>
    `;

    // Add click-to-dismiss
    toast.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName !== 'BUTTON') {
        this.removeToast(toast);
      }
    });

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-x-full', 'opacity-0');
    });

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => this.removeToast(toast), duration);
    }
  }

  /**
   * Remove a specific toast
   */
  private static removeToast(toast: HTMLElement): void {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Clear all toasts
   */
  static clearAllToasts(): void {
    if (this.toastContainer) {
      this.toastContainer.innerHTML = '';
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private static escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Validate file before upload
   */
  static validateFile(
    file: File,
    options: FileValidationOptions = {}
  ): FileValidationResult {
    const {
      maxSizeBytes = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      allowedExtensions = ['.pdf', '.doc', '.docx']
    } = options;

    // Check file size
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        error: `File "${file.name}" is too large (max ${this.formatFileSize(maxSizeBytes)})`
      };
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File "${file.name}" has an unsupported type. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file extension
    if (allowedExtensions.length > 0) {
      const fileExtension = this.getFileExtension(file.name);
      if (!allowedExtensions.some(ext => ext.toLowerCase() === fileExtension.toLowerCase())) {
        return {
          isValid: false,
          error: `File "${file.name}" has an unsupported extension. Allowed extensions: ${allowedExtensions.join(', ')}`
        };
      }
    }

    return {
      isValid: true,
      file
    };
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'));
  }

  /**
   * Format file size for human reading
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Debounce function for input handling
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function for scroll/resize events
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, wait);
      }
    };
  }

  /**
   * Generate a unique ID
   */
  static generateId(prefix = 'id'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Copy text to clipboard
   */
  static async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
      return false;
    }
  }

  /**
   * Check if user is on mobile device
   */
  static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Scroll element into view smoothly
   */
  static scrollToElement(element: Element, options: ScrollIntoViewOptions = {}): void {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
      ...options
    });
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    });
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  static formatRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return this.formatDate(dateObj);
  }

  /**
   * Truncate text with ellipsis
   */
  static truncateText(text: string, maxLength: number, suffix = '...'): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Wait for a specified number of milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Poll document status until processing is complete
   */
  static pollDocumentStatus(
    documentId: string,
    onStatusUpdate: (document: any) => void,
    options: {
      apiBase?: string;
      pollInterval?: number;
      maxAttempts?: number;
      onComplete?: (document: any) => void;
      onError?: (error: string) => void;
    } = {}
  ): void {
    const {
      apiBase = '/api', // Adjust based on your API base
      pollInterval = 2000,
      maxAttempts = 60,
      onComplete,
      onError
    } = options;

    // Clear any existing polling for this document
    this.stopPollingDocument(documentId);

    let attempts = 0;

    const intervalId = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch(`${apiBase}/documents/${documentId}`);
        
        if (!response.ok) {
          console.warn(`Polling document ${documentId} failed: ${response.status}`);
          if (response.status === 404) {
            // Document not found, stop polling
            this.stopPollingDocument(documentId);
            onError?.('Document not found');
            return;
          }
          return;
        }

        const updatedDocument = await response.json();
        
        // Call the status update callback
        onStatusUpdate(updatedDocument);

        // Check if processing is complete
        if (updatedDocument.status !== 'processing' && updatedDocument.status !== 'uploaded') {
          this.stopPollingDocument(documentId);
          
          if (updatedDocument.status === 'processed') {
            this.showToast(`Document "${updatedDocument.original_filename}" processed and ready.`, 'success');
          } else if (updatedDocument.status === 'failed') {
            this.showToast(`Document "${updatedDocument.original_filename}" processing failed.`, 'error');
          }
          
          onComplete?.(updatedDocument);
          return;
        }

      } catch (error) {
        console.error(`Error polling document status: ${error}`);
        
        // After too many errors, stop polling
        if (attempts >= 5) {
          this.stopPollingDocument(documentId);
          onError?.(`Failed to poll document status: ${error}`);
          return;
        }
      }

      // Stop after max attempts
      if (attempts >= maxAttempts) {
        this.stopPollingDocument(documentId);
        console.warn(`Stopped polling status for document ${documentId} after ${attempts} attempts.`);
        onError?.('Polling timeout - document may still be processing');
      }
    }, pollInterval);

    // Store the interval ID for potential cleanup
    this.activePollingIntervals.set(documentId, intervalId);
  }

  /**
   * Stop polling for a specific document
   */
  static stopPollingDocument(documentId: string): void {
    const intervalId = this.activePollingIntervals.get(documentId);
    if (intervalId) {
      clearInterval(intervalId);
      this.activePollingIntervals.delete(documentId);
    }
  }

  /**
   * Stop all active polling
   */
  static stopAllPolling(): void {
    this.activePollingIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.activePollingIntervals.clear();
  }

  /**
   * Create a temporary placeholder document for immediate UI feedback
   */
  static createPlaceholderDocument(file: File, collectionId: string): any {
    const tempId = 'temp-' + Math.random().toString(36).substring(2, 9);
    return {
      id: tempId,
      filename: '',
      original_filename: file.name,
      file_path: '',
      file_size: file.size,
      document_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
      collection_id: collectionId,
      status: 'processing',
      created_at: new Date().toISOString(),
      processed_at: null,
      metadata: {},
      chunk_count: 0,
      isPlaceholder: true
    };
  }
}

// Create a global utils instance for easy access
if (typeof window !== 'undefined') {
  (window as any).utils = Utils;
  // Initialize toast container on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Utils.initToastContainer());
  } else {
    Utils.initToastContainer();
  }
}

export default Utils;
