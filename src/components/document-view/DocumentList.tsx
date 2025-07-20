import React from 'react';

import { Document } from '../../custom-types';
import { DocumentListItem } from './DocumentListItem';
import { NoDocuments } from './NoDocuments';

interface ComponentProps {
    documents: Document[];
    onDocumentDelete: (docId: string, docFileName: string) => void;
}

export const DocumentList: React.FC<ComponentProps> = ({
    documents,
    onDocumentDelete,
}) => {
    return (
        <div className="bg-white rounded-lg">
            {documents.length === 0 ? (
                <NoDocuments />
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-full">
                {documents.map((doc) => (
                  <DocumentListItem key={doc.id} document={doc} onDocumentDelete={onDocumentDelete} />
                ))}
              </div>
            )}
        </div>
    )
}