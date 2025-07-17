import React, {useState, useEffect, useRef, KeyboardEvent} from 'react';
import { 
  Send, 
  Loader2,
} from 'lucide-react';

import { API_BASE } from '../config';
import { ChatViewProps } from '../custom-types';

// Chat View Component
export const ChatView: React.FC<ChatViewProps> = ({ session, messages, onMessageSent, setError }) => {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    const messageToSend = newMessage;
    setNewMessage('');

    try {
      const response = await fetch(`${API_BASE}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: session.id,
          user_message: messageToSend,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      onMessageSent();
    } catch (err: any) {
      setError(err.message);
      setNewMessage(messageToSend); // Restore message on error
    } finally {
      setSending(false);
    }
  };

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
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg max-w-xs lg:max-w-md">
                {message.user_message}
              </div>
            </div>
            
            {/* Assistant Response */}
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg max-w-xs lg:max-w-md">
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
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                    handleSendMessage();
                }
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
