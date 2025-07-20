import React from 'react';

import { ChatSession } from '../../custom-types';
import { NoChatSessions } from './NoChatSessions';
import { ChatSessionsList } from './ChatSessionsList';

interface ComponentProps {
    chatSessions: ChatSession[];
    onChatSessionSelect: (session: ChatSession) => void;
}

export const ChatSessions: React.FC<ComponentProps> = ({
    chatSessions,
    onChatSessionSelect
}) => {
    return (
        <div className="bg-white rounded-lg shadow-sm">
            {chatSessions.length === 0 ? (
                <NoChatSessions />
            ) : (
                <ChatSessionsList chatSessions={chatSessions} onChatSessionSelect={onChatSessionSelect} />
            )}
        </div>
    )
}
