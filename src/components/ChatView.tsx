import React from 'react';
import { Send, Loader2 } from 'lucide-react';

import { API_BASE } from '../config';
import { ChatViewProps } from '../custom-types';

interface ChatViewState {
  newMessage: string;
  sending: boolean;
}

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
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">{session.name}</h3>
          <p className="text-sm text-gray-500">{messages.length} messages</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-3">
              {/* User Message */}
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-lg w-[85%]">
                  {message.user_message}
                </div>
              </div>

              {/* Assistant Response */}
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg w-[85%]">
                  {message.assistant_response}
                </div>
              </div>

              {/* Retrieved Chunks (if any) */}
              {message.retrieved_chunks && message.retrieved_chunks.length > 0 && (
                <div className="text-xs text-gray-500 ml-4">
                  <details>
                    <summary className="cursor-pointer hover:text-gray-700">
                      {message.retrieved_chunks.length} source chunks used
                    </summary>
                    <div className="mt-2 space-y-1">
                      {message.retrieved_chunks.map((chunk, idx) => (
                        <div key={idx} className="bg-gray-50 p-2 rounded text-xs">
                          {chunk}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}

          <div ref={this.messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => this.setState({ newMessage: e.target.value })}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  this.handleSendMessage();
                }
              }}
            />
            <button
              onClick={this.handleSendMessage}
              disabled={sending || !newMessage.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }
}
