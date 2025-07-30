import { useState, useCallback } from 'react';
import { API_BASE } from '../config';
import { ChatMessage, MessageRole } from '../custom-types';

interface UseChatOptions {
  sessionId: string;
  onResponse?: (response: any) => void;
  onError?: (error: any) => void;
  onFinished?: () => void;
  initialMessages?: ChatMessage[];
}

interface ApiResponse {
  response: Response;
  eventSource: EventSource;
}

export function useChat(options: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    options.initialMessages || []
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentEventSource, setCurrentEventSource] = useState<EventSource | null>(null);

  const appendToLastMessage = useCallback((appendStr: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      
      const lastMessage = prev[prev.length - 1];
      const updatedMessage = {
        ...lastMessage,
        assistant_response: lastMessage.assistant_response + appendStr
      };
      
      return [...prev.slice(0, -1), updatedMessage];
    });
  }, []);

  const updateLastMessageChunks = useCallback((chunks: string[]) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      
      const lastMessage = prev[prev.length - 1];
      const updatedMessage = {
        ...lastMessage,
        retrieved_chunks: chunks
      };
      
      return [...prev.slice(0, -1), updatedMessage];
    });
  }, []);

  const api = async (input: string): Promise<ApiResponse> => {
    // First, send the message to initiate the stream
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: options.sessionId,
        user_message: input,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    // Create EventSource for the same endpoint (assuming your backend supports this)
    // Note: You might need to adjust this URL based on your backend implementation
    const eventSource = new EventSource(`${API_BASE}/chat/stream?session_id=${options.sessionId}&user_message=${encodeURIComponent(input)}`);
    
    return { response, eventSource };
  };

  const handleSubmit = async (userMessage: string) => {
    if (!userMessage.trim()) return;
    
    setInput('');
    setIsLoading(true);

    // Clean up any existing EventSource
    if (currentEventSource) {
      currentEventSource.close();
    }

    try {
      // Add user message and empty assistant message
      const tempId = `temp-${Date.now()}`;
      const newUserMessage: ChatMessage = {
        id: `user-${tempId}`,
        session_id: options.sessionId,
        user_message: userMessage,
        assistant_response: '',
        retrieved_chunks: [],
        created_at: new Date().toISOString(),
      };

      const newAssistantMessage: ChatMessage = {
        id: `assistant-${tempId}`,
        session_id: options.sessionId,
        user_message: userMessage,
        assistant_response: '',
        retrieved_chunks: [],
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newUserMessage, newAssistantMessage]);

      const { eventSource, response } = await api(userMessage);
      setCurrentEventSource(eventSource);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.error) {
            throw new Error(data.error);
          }

          // Handle streaming response
          if (data.response) {
            appendToLastMessage(data.response);
          }

          // Handle retrieved chunks (usually sent with first chunk)
          if (data.retrieved_chunks) {
            updateLastMessageChunks(data.retrieved_chunks);
          }

        } catch (parseError) {
          console.error('Error parsing SSE data:', parseError);
          options.onError?.(parseError);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        setCurrentEventSource(null);
        setIsLoading(false);
        options.onError?.(error);
      };

      eventSource.onopen = () => {
        console.log('EventSource connection opened');
      };

      // Note: Your backend should send a special "complete" message or close the connection
      // when streaming is finished. Adjust this based on your backend implementation.
      
      options.onResponse?.(response);

    } catch (error) {
      console.error('Chat error:', error);
      options.onError?.(error);
      setIsLoading(false);
      
      // Remove the empty assistant message on error
      setMessages((prev) => prev.slice(0, -1));
    }
  };

  const stopStreaming = () => {
    if (currentEventSource) {
      currentEventSource.close();
      setCurrentEventSource(null);
      setIsLoading(false);
      options.onFinished?.();
    }
  };

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    stopStreaming,
  };
}
