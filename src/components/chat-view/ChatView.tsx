import React from 'react';

import { API_BASE } from '../../config';
import { ChatViewProps } from '../../custom-types';
import { ChatInput } from './ChatInput';
import { ChatMessagesList } from './ChatMessagesList';
import { ChatHeader } from './ChatHeader';

interface ChatViewState {
  newMessage: string;
  sending: boolean;
}

// Receieve collection selected event
export class ChatView extends React.Component<ChatViewProps, ChatViewState> {
  private messagesEndRef: React.RefObject<HTMLDivElement>;

  constructor(props: ChatViewProps) {
    super(props);
    this.state = {
      newMessage: '',
      sending: false,
    };
    this.messagesEndRef = React.createRef();

    this.handleSendMessage = this.handleSendMessage.bind(this);
    this.scrollToBottom = this.scrollToBottom.bind(this);
  }

  componentDidMount() {
    this.scrollToBottom();
  }

  componentDidUpdate(prevProps: ChatViewProps) {
    if (prevProps.messages !== this.props.messages) {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    this.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  render() {
    const { session, messages } = this.props;
    const { newMessage, sending } = this.state;

    return (
      <div className="bg-white rounded-lg shadow-sm border h-[600px] flex flex-col">
        {/* Chat Header */}
        <ChatHeader sessionName={session.name} messagesLenght={messages.length} />

        {/* Messages */}
        <ChatMessagesList messages={messages} sending={sending} />

        {/* Message Input */}
        <ChatInput
          newMessage={newMessage}
          onChange={(newInput) => this.setState({ newMessage: newInput })}
          onMessageSend={this.handleSendMessage}
          sending={sending}
        />
      </div>
    );
  }
}
