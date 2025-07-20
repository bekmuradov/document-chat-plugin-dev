import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatCollectionsPlugin from './PluginTemplate';
import './PluginTemplate.css';
import type { Services } from './types';

// Mock services for standalone development
const mockServices: Services = {
  api: {
    get: async (url: string) => {
      console.log('Mock API GET:', url);
      
      // Mock different endpoints
      if (url.includes('/collections/')) {
        return [
          {
            id: '1',
            name: 'Sample Collection 1',
            description: 'A sample collection for testing',
            created_at: new Date().toISOString(),
            document_count: 5
          },
          {
            id: '2',
            name: 'Sample Collection 2',
            description: 'Another sample collection',
            created_at: new Date().toISOString(),
            document_count: 3
          }
        ];
      }
      
      if (url.includes('/documents/')) {
        return [
          {
            id: '1',
            name: 'Sample Document 1.pdf',
            collection_id: '1',
            size: 1024000,
            type: 'pdf',
            uploaded_at: new Date().toISOString()
          },
          {
            id: '2',
            name: 'Sample Document 2.docx',
            collection_id: '1',
            size: 512000,
            type: 'docx',
            uploaded_at: new Date().toISOString()
          }
        ];
      }
      
      if (url.includes('/chat/sessions')) {
        return [
          {
            id: '1',
            name: 'Chat Session 1',
            collection_id: '1',
            created_at: new Date().toISOString(),
            message_count: 10
          }
        ];
      }
      
      if (url.includes('/chat/messages')) {
        return [
          {
            id: '1',
            session_id: '1',
            role: 'user',
            content: 'Hello, can you help me with this document?',
            timestamp: new Date().toISOString()
          },
          {
            id: '2',
            session_id: '1',
            role: 'assistant',
            content: 'Of course! I can help you analyze the documents in your collection. What would you like to know?',
            timestamp: new Date().toISOString()
          }
        ];
      }
      
      return [];
    },
    
    post: async (url: string, data?: any) => {
      console.log('Mock API POST:', url, data);
      return { success: true, id: Math.random().toString(36) };
    },
    
    // put: async (url: string, data?: any) => {
    //   console.log('Mock API PUT:', url, data);
    //   return { success: true };
    // },
    
    // delete: async (url: string) => {
    //   console.log('Mock API DELETE:', url);
    //   return { success: true };
    // }
  },
  
  theme: {
    getCurrentTheme: () => 'light' as const,
    addThemeChangeListener: (listener: (theme: 'dark' | 'light') => void) => {
      console.log('Mock Theme Listener Added');
      // Simulate theme changes for testing
      setTimeout(() => listener('dark'), 5000);
      setTimeout(() => listener('light'), 10000);
    },
    removeThemeChangeListener: (listener: (theme: 'dark' | 'light') => void) => {
      console.log('Mock Theme Listener Removed');
    }
  },
  
  settings: {
    getSetting: async (key: string) => {
      console.log('Mock Settings Get:', key);
      return null;
    },
    setSetting: async (key: string, value: any) => {
      console.log('Mock Settings Set:', key, value);
    }
  },
  
  pageContext: {
    getCurrentPageContext: () => ({
      pageId: 'dev-page',
      pageName: 'Development Page',
      pageRoute: '/dev',
      isStudioPage: false
    }),
    onPageContextChange: (handler: (context: any) => void) => {
      console.log('Mock Page Context Listener Added');
      return () => console.log('Mock Page Context Listener Removed');
    }
  }
};

function isDOMException(error: unknown): error is DOMException {
  return error instanceof DOMException;
}

function isTypeError(error: unknown): error is TypeError {
  return error instanceof TypeError;
}

function isError(error: unknown): error is Error {
  return error instanceof Error;
}

const componentServices: Services = {
  api: {
    get: async (url) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✓ API GET response received: ${JSON.stringify(data).substring(0, 100)}...`);
        return data;
      } catch (error) {
        clearTimeout(timeoutId);

        // Handle fetch timeout/abort errors (DOMException)
        if (isDOMException(error) && error.name === 'AbortError') {
          console.error('❌ API request timed out:', url);
          throw new Error('Request timed out after 10 seconds');
        }
        // Handle network/fetch errors (TypeError)
        else if (isTypeError(error)) {
          console.error('❌ Network error:', error);
          throw new Error(`Network error: ${error.message}`);
        }
        // Handle other known Error types
        else if (isError(error)) {
          console.error('❌ API GET error:', error);
          throw error; // Re-throw original error to preserve stack trace
        }
        // Fallback for unknown error types
        else {
          console.error('❌ Unknown error type:', error);
          throw new Error(`An unknown error occurred: ${String(error)}`);
        }
      }
    },
    post: async (url, data) => {
      console.log(`Making API POST request to: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    }
  }
}

// Development wrapper component
const DevWrapper: React.FC = () => {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    // Update mock theme service
    // mockServices.theme.getCurrentTheme = () => theme === 'light' ? 'dark' : 'light';
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
      padding: '20px'
    }}>
      {/* Development Controls */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: theme === 'dark' ? '#333' : '#f5f5f5',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>
          Dev Controls
        </h3>
        <button
          onClick={toggleTheme}
          style={{
            padding: '5px 10px',
            backgroundColor: theme === 'dark' ? '#555' : '#e0e0e0',
            color: theme === 'dark' ? '#fff' : '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Toggle Theme: {theme}
        </button>
        <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
          <div>✅ Mock API Active</div>
          <div>✅ Hot Reload Enabled</div>
        </div>
      </div>

      {/* Plugin Component */}
      <ChatCollectionsPlugin
        title="Chat Collections Plugin - Development Mode"
        description="Testing plugin in standalone mode"
        pluginId="chat-collections-dev"
        moduleId="dev-module"
        instanceId="dev-instance"
        config={{
          apiBaseUrl: 'http://localhost:8000',
          refreshInterval: 30,
          showAdvancedOptions: true,
          maxDocuments: 100,
          chatSettings: {
            maxMessages: 100,
            autoSave: true
          }
        }}
        services={componentServices}
      />
    </div>
  );
};

// Mount the development version
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<DevWrapper />);

// Add some global styles for development
const style = document.createElement('style');
style.textContent = `
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  /* Development-specific styles */
  .plugin-template {
    max-width: 1200px;
    margin: 0 auto;
    box-shadow: 0 0 20px rgba(0,0,0,0.1);
    border-radius: 8px;
    overflow: hidden;
  }
`;
document.head.appendChild(style);
