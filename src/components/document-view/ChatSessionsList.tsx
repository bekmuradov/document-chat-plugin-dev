import React from "react";

import { ChatSession } from '../../custom-types';
import { ChatSessionsListItem } from "./ChatSessionsListItem";

interface ComponentProps {
    chatSessions: ChatSession[];
    onChatSessionSelect: (session: ChatSession) => void;
}

export const ChatSessionsList: React.FC<ComponentProps> = ({
    chatSessions,
    onChatSessionSelect,
}) => {
    return (
        <div className="divide-y divide-gray-200">
            {chatSessions.map((session) => (
                <div key={session.id}>
                    <ChatSessionsListItem chatSession={session} onChatSessionSelect={onChatSessionSelect} />
                    {/* Alternative list item */}
                    <div 
                        className="p-3 hover:bg-gray-50 cursor-pointer hidden"
                        onClick={() => onChatSessionSelect(session)}
                    >
                        <h4 className="text-sm font-medium text-gray-900">{session.name}</h4>
                        <p className="text-xs text-gray-500">
                            {session.message_count} messages • {new Date(session.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}
