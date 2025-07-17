import {useState, useEffect, useRef} from 'react';
import { 
  Plus, 
  Upload, 
  Trash2, 
  MessageSquare, 
  FileText, 
  Send, 
  Loader2,
  ArrowLeft,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

import { API_BASE } from '../config';
import { CollectionsViewProps, Collection } from '../custom-types';

// Collections View Component
export const CollectionsView: React.FC<CollectionsViewProps> = ({ collections, onCollectionSelect, onCollectionCreate, setError }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollection, setNewCollection] = useState<Partial<Collection>>({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const handleCreateCollection = async () => {
    try {
      const response = await fetch(`${API_BASE}/collections/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCollection),
      });
      
      if (!response.ok) throw new Error('Failed to create collection');
      
      setNewCollection({ name: '', description: '', color: '#3B82F6' });
      setShowCreateForm(false);
      onCollectionCreate();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Your Collections</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Collection
        </button>
      </div>

      {/* Create Collection Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Create New Collection</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newCollection.name}
                onChange={(e) => setNewCollection({...newCollection, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter collection name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newCollection.description}
                onChange={(e) => setNewCollection({...newCollection, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter collection description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={newCollection.color}
                onChange={(e) => setNewCollection({...newCollection, color: e.target.value})}
                className="w-20 h-10 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleCreateCollection}
                disabled={!newCollection.name?.trim() || !newCollection.description?.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Create Collection
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collections.map((collection) => (
          <div
            key={collection.id}
            className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onCollectionSelect(collection)}
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: collection.color }}
                />
                <h3 className="text-lg font-medium text-gray-900">{collection.name}</h3>
              </div>
              <p className="text-gray-600 mb-4">{collection.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{collection.document_count} documents</span>
                <span>{new Date(collection.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {collections.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No collections yet</h3>
          <p className="text-gray-600">Create your first collection to get started</p>
        </div>
      )}
    </div>
  );
};
