import React from 'react';

import { API_BASE } from '../../config';
import { ChatMessage, ChatViewProps, MessageRole } from '../../custom-types';
import { ChatInput } from './ChatInput';
import { ChatMessagesList } from './ChatMessagesList';
import { ChatHeader } from './ChatHeader';
import { fetchEventSource } from '@microsoft/fetch-event-source';

interface ChatViewState {
  newMessage: string;
  sending: boolean;
  userMessageQueued: ChatMessage | null;
  streamingAssistantMessage: ChatMessage | null;
  optimisticMessages: ChatMessage[];
}

// Receieve collection selected event
export class ChatView extends React.Component<ChatViewProps, ChatViewState> {
  private messagesEndRef: React.RefObject<HTMLDivElement>;
  private abortController: AbortController | null = null;
  private currentStreamingMessageId: string | null = null;

  constructor(props: ChatViewProps) {
    super(props);
    this.state = {
      newMessage: '',
      sending: false,
      userMessageQueued: null,
      streamingAssistantMessage: null,
      optimisticMessages: [],
    };
    this.messagesEndRef = React.createRef();
    
    this.stopStreaming = this.stopStreaming.bind(this);
    this.scrollToBottom = this.scrollToBottom.bind(this);
    this.createOptimisticMessage = this.createOptimisticMessage.bind(this);
    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.handleSendStreamingMessage = this.handleSendStreamingMessage.bind(this);
    this.handleSendStreamingRequest = this.handleSendStreamingRequest.bind(this);
    this.updateStreamingMessage = this.updateStreamingMessage.bind(this);
    this.handleStreamComplete = this.handleStreamComplete.bind(this);
    this.handleStreamError = this.handleStreamError.bind(this);
    this.syncWithServer = this.syncWithServer.bind(this);
  }

  componentWillUnmount() {
    this.stopStreaming();
  }

  stopStreaming() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  componentDidMount() {
    this.scrollToBottom();
  }

  // componentDidUpdate(prevProps: ChatViewProps) {
  //   if (prevProps.messages !== this.props.messages) {
  //     this.scrollToBottom();
  //   }
  // }
  componentDidUpdate(prevProps: ChatViewProps, prevState: ChatViewState) {
    // Scroll when messages change OR when streaming message updates
    if (prevProps.messages !== this.props.messages || 
        prevState.streamingAssistantMessage !== this.state.streamingAssistantMessage) {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    this.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  createOptimisticMessage = (userMessage: string, role: MessageRole, isStreaming = false): ChatMessage => {
    const timestamp = new Date().toISOString();
    return {
      id: `${role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      session_id: this.props.session.id,
      created_at: timestamp,
      user_message: userMessage,
      assistant_response: '',
      retrieved_chunks: [],
      isStreaming,
    };
  }

  async handleSendMessage() {
    const { newMessage } = this.state;
    const { session, onMessageSent, setError } = this.props;
    if (!newMessage.trim()) return;

    this.setState({ sending: true });
    const messageToSend = newMessage;
    this.setState({ newMessage: '' });

    try {
      const response = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          user_message: messageToSend,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      onMessageSent();
    } catch (err: any) {
      setError(err.message);
      this.setState({ newMessage: messageToSend });
    } finally {
      this.setState({ sending: false });
    }
  }

  async handleSendStreamingMessage() {
    console.log('handleSendStreamingMessage triggered');
    const { newMessage } = this.state;
    const { session, onMessageSent, setError } = this.props;

    if (!newMessage.trim()) {
      console.log('No message to sent');
      return;
    };

    this.stopStreaming();

    this.setState({ sending: true });
    const messageToSend = newMessage;
    this.setState({ newMessage: '' });

    // Create initial streaming assistant message
    const initialAssistantMessage = this.createOptimisticMessage(messageToSend, MessageRole.USER, true);
    this.currentStreamingMessageId = initialAssistantMessage.id;

    this.setState(prev => ({
      optimisticMessages: [...prev.optimisticMessages, initialAssistantMessage]
    }));

    try {
      this.abortController = new AbortController();
      let fullAssistantResponse = '';
      let finalRetrievedChunks: any[] = [];

      await fetchEventSource(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          user_message: messageToSend,
        }),
        signal: this.abortController.signal,
        onopen: async (response) => {
          if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
            console.log('SSE connection opened successfully.');
            // No need to set state here, initial state for streamingAssistantMessage is already set
          } else if (!response.ok) {
            const errorText = await response.text();
            console.error('SSE connection failed to open:', response.status, response.statusText, errorText);
            throw new Error(`Failed to connect to SSE: ${response.status} ${response.statusText} - ${errorText}`);
          } else {
            console.error('Server did not return text/event-stream content type:', response.headers.get('content-type'));
            throw new Error('Server did not return text/event-stream content type. Check backend.');
          }
        },
        onmessage: (event) => {
          try {
            const data = JSON.parse(event.data);
          
            if (data.error) {
              throw new Error(data.error);
            }

            if (data.complete && data.message_id && data.created_at) {
              this.handleStreamComplete(data.message_id, data.created_at);
              return;
            }

            // Accumulate response parts
            if (data.response) {
              fullAssistantResponse += data.response;
            }

            // Update retrieved chunks if provided
            if (data.retrieved_chunks && Array.isArray(data.retrieved_chunks)) {
              finalRetrievedChunks = data.retrieved_chunks;
            }

            // Update the streaming message in optimistic messages
            this.updateStreamingMessage(fullAssistantResponse, finalRetrievedChunks);

          } catch (parseError) {
            console.error('Error parsing SSE event data or during onmessage processing:', parseError, 'Event data was:', event.data);
            console.error('Error parsing SSE event data:', parseError);
            this.handleStreamError(messageToSend, 'Error processing streaming response data.');
            setError('Error processing streaming response data.');
          }
        },
        onerror: (error) => {
          console.error('fetchEventSource error:', error);
          this.handleStreamError(messageToSend, 'Error processing streaming response data.');
          if (error.name === 'AbortError') {
            console.log('Streaming was aborted by user or component unmount.');
          } else {
            setError(error.message || 'Connection error occurred during streaming.');
          }
        },
        onclose: () => {
          console.log('SSE connection closed by server or client.');
          // This might fire after `complete` is handled, or on unexpected close.
          // No explicit setState needed here if 'complete' already handles cleanup.
        },
        openWhenHidden: true, // Keep connection open even if browser tab is in background
      });

    } catch (err: any) {
      console.error('Stream setup error:', err);
      this.handleStreamError(messageToSend, err.message || 'Failed to start streaming');
      if (err.name === 'AbortError') {
        console.log('Stream was aborted');
      } else {
        setError(err.message || 'Failed to start streaming');
      }
    }
  }

  handleSendStreamingRequest = async () => {
    const { newMessage } = this.state;
    const { session, setError, apiService } = this.props;
    
    if (!apiService || !apiService.postStreaming) {
      // falback in case api service is undefined
      console.log("falling back to in app streaming request")
      await this.handleSendStreamingMessage();
      return;
    }

    if (!newMessage.trim()) {
      return;
    };

    this.stopStreaming();
    this.setState({ sending: true });
    const messageToSend = newMessage;
    this.setState({ newMessage: '' });

    // Create initial streaming assistant message
    const initialAssistantMessage = this.createOptimisticMessage(messageToSend, MessageRole.USER, true);
    this.currentStreamingMessageId = initialAssistantMessage.id;

    this.setState(prev => ({
      optimisticMessages: [...prev.optimisticMessages, initialAssistantMessage]
    }));

    try {
      this.abortController = new AbortController();
      let fullAssistantResponse = '';
      let finalRetrievedChunks: any[] = [];

      const onChunk = (chunk: string) => {
        try {
          const data = JSON.parse(chunk);
          
          if (data.error) {
            throw new Error(data.error);
          }

          if (data.complete && data.message_id && data.created_at) {
            this.handleStreamComplete(data.message_id, data.created_at);
            return;
          }

          // Accumulate response parts
          if (data.response) {
            fullAssistantResponse += data.response;
          }

          // Update retrieved chunks if provided
          if (data.retrieved_chunks && Array.isArray(data.retrieved_chunks)) {
            finalRetrievedChunks = data.retrieved_chunks;
          }

          // Update the streaming message in optimistic messages
          this.updateStreamingMessage(fullAssistantResponse, finalRetrievedChunks);

        } catch (parseError) {
          console.error('Error parsing SSE event data:', parseError);
          this.handleStreamError(messageToSend, 'Error processing streaming response data.');
        }
      };

      await apiService.postStreaming(
        `${API_BASE}/chat/stream`,
        {
          session_id: session.id,
          user_message: messageToSend,
        },
        onChunk,
      )

      // await fetchEventSource(`${API_BASE}/chat/stream`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     session_id: session.id,
      //     user_message: messageToSend,
      //   }),
      //   signal: this.abortController.signal,
        
      //   onopen: async (response) => {
      //     if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream')) {
      //       const errorText = await response.text();
      //       throw new Error(`Failed to connect to SSE: ${response.status} ${response.statusText} - ${errorText}`);
      //     }
      //   },

      //   onmessage: (event) => {
      //     try {
      //       const data = JSON.parse(event.data);
            
      //       if (data.error) {
      //         throw new Error(data.error);
      //       }

      //       if (data.complete && data.message_id && data.created_at) {
      //         this.handleStreamComplete(data.message_id, data.created_at);
      //         return;
      //       }

      //       // Accumulate response parts
      //       if (data.response) {
      //         fullAssistantResponse += data.response;
      //       }

      //       // Update retrieved chunks if provided
      //       if (data.retrieved_chunks && Array.isArray(data.retrieved_chunks)) {
      //         finalRetrievedChunks = data.retrieved_chunks;
      //       }

      //       // Update the streaming message in optimistic messages
      //       this.updateStreamingMessage(fullAssistantResponse, finalRetrievedChunks);

      //     } catch (parseError) {
      //       console.error('Error parsing SSE event data:', parseError);
      //       this.handleStreamError(messageToSend, 'Error processing streaming response data.');
      //     }
      //   },

      //   onerror: (error) => {
      //     if (error.name === 'AbortError') {
      //       console.log('Streaming was aborted by user or component unmount.');
      //     } else {
      //       this.handleStreamError(messageToSend, error.message || 'Connection error occurred during streaming.');
      //     }
      //   },

      //   onclose: () => {
      //     console.log('SSE connection closed.');
      //   },

      //   openWhenHidden: true,
      // });

    } catch (err: any) {
      this.handleStreamError(messageToSend, err.message || 'Failed to start streaming');
    }
  }

  updateStreamingMessage = (content: string, retrievedChunks: any[]) => {
    if (!this.currentStreamingMessageId) return;

    this.setState((prev) => ({
      optimisticMessages: prev.optimisticMessages.map(msg => 
        msg.id === this.currentStreamingMessageId
          ? {
              ...msg,
              assistant_response: content,
              retrieved_chunks: retrievedChunks,
            }
          : msg
      )
    }));
  }

  handleStreamComplete = (savedMessageId: string, savedCreatedAt: string) => {
    this.stopStreaming();
    this.setState({ sending: false });
    
    // Convert streaming message to final message by removing streaming metadata
    this.setState((prev) => ({
      optimisticMessages: prev.optimisticMessages.map(msg => 
        msg.id === this.currentStreamingMessageId
          ? {
            ...msg,
            id: savedMessageId,
            created_at: savedCreatedAt,
            metadata: undefined
          }
          : msg
      )
    }));

    // Sync with server after a brief delay to ensure smooth UX
    setTimeout(() => {
      this.syncWithServer();
    }, 500);
  }

  handleStreamError = (originalMessage: string, errorMessage: string) => {
    this.stopStreaming();
    this.setState({
      sending: false,
      optimisticMessages: [], // Clear all optimistic messages on error
      newMessage: originalMessage, // Restore original message
    });
    this.props.setError(errorMessage);
  }

  syncWithServer = () => {
    // Clear optimistic messages and trigger server sync
    this.setState({ optimisticMessages: [] });
    this.props.onMessageSent();
  }

  render() {
    const { session, messages } = this.props;
    const { newMessage, sending, userMessageQueued, streamingAssistantMessage, optimisticMessages } = this.state;

    const displayMessages = [...messages, ...optimisticMessages];

    // let displayMessages = [...messages];
    // // Prioritize streamingAssistantMessage as it's the one you're actively updating
    // if (userMessageQueued) {
    //     displayMessages.push(userMessageQueued);
    // }
    // if (streamingAssistantMessage) {
    //     displayMessages.push(streamingAssistantMessage);
    // }

    // console.log('ChatView render - current displayMessages count:', displayMessages.length);
    // console.log('ChatView render - streamingAssistantMessage state:', streamingAssistantMessage);

    return (
      <div className="bg-white rounded-lg shadow-sm border h-[600px] flex flex-col">
        {/* Chat Header */}
        <ChatHeader sessionName={session.name} messagesLenght={messages.length} />

        {/* Messages */}
        <ChatMessagesList messages={displayMessages} sending={sending} />

        {/* <div ref={this.messagesEndRef} /> */}

        {/* Message Input */}
        <ChatInput
          newMessage={newMessage}
          onChange={(newInput) => this.setState({ newMessage: newInput })}
          onMessageSend={this.handleSendStreamingRequest}
          sending={sending}
        />
      </div>
    );
  }
}
