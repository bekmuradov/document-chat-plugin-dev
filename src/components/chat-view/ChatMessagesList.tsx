// import React from "react";
// import { Loader2 } from 'lucide-react';

// import type { ChatMessage } from "../../custom-types";
// import { ChatMessageListItem } from "./ChatMessageListItem";

// interface ChatMessagesProps {
//     messages: ChatMessage[];
//     sending: boolean;
// }


// export const ChatMessagesList: React.FC<ChatMessagesProps> = ({
//     messages,
//     sending,
// }) => {
//   const messagesEndRef = React.useRef<HTMLDivElement>(null);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   React.useEffect(() => {
//     scrollToBottom();
//   }, [messages, sending]);
//   return (
//       <div className="flex-1 overflow-y-auto p-4 space-y-4">
//         {messages.map((message) => (
//           <ChatMessageListItem key={message.id} message={message} />
//         ))}

//         {sending && (
//           <div className="flex justify-start">
//             <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
//               <Loader2 className="h-4 w-4 animate-spin" />
//             </div>
//           </div>
//         )}

//         <div ref={messagesEndRef} />
//       </div>
//   )
// }

import React from "react";
import { Loader2 } from 'lucide-react';
import type { ChatMessage } from "../../custom-types";
import { ChatMessageListItem } from "./ChatMessageListItem";

interface ChatMessagesProps {
    messages: ChatMessage[];
    sending: boolean;
}

interface ChatMessagesState {}

export class ChatMessagesList extends React.Component<ChatMessagesProps, ChatMessagesState> {
  private messagesEndRef: React.RefObject<HTMLDivElement>;

  constructor(props: ChatMessagesProps) {
    super(props);
    this.messagesEndRef = React.createRef();
  }

  scrollToBottom = () => {
    this.messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  componentDidMount() {
    this.scrollToBottom();
  }

  componentDidUpdate() {
    this.scrollToBottom();
  }

  render() {
    const { messages, sending } = this.props;
    
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessageListItem key={message.id} message={message} />
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
    );
  }
}
