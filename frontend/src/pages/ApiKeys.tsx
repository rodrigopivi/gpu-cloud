import { useState } from 'react';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '../hooks/useQueries';
import { Key, Copy, Check, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

export default function ApiKeys() {
  const { data: apiKeys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [rateLimit, setRateLimit] = useState(60);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    
    try {
      const result = await createKey.mutateAsync({
        name: newKeyName,
        rateLimitPerMinute: rateLimit,
      });
      setCreatedKey(result.key);
      
      // Store key mapping in localStorage for Playground use
      const keyMap = JSON.parse(localStorage.getItem('apiKeyMap') || '{}');
      keyMap[result.id] = result.key;
      localStorage.setItem('apiKeyMap', JSON.stringify(keyMap));
      
      setNewKeyName('');
      setRateLimit(60);
    } catch (error) {
      console.error('Failed to create key:', error);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      await revokeKey.mutateAsync(id);
    } catch (error) {
      console.error('Failed to revoke key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReveal = (id: string) => {
    const newRevealed = new Set(revealedKeys);
    if (newRevealed.has(id)) {
      newRevealed.delete(id);
    } else {
      newRevealed.add(id);
    }
    setRevealedKeys(newRevealed);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="mt-1 text-gray-600">Manage your API keys for accessing inference endpoints</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {/* Keys List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiKeys?.map((key) => (
                <tr key={key.id} className={!key.isActive ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Key className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{key.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {revealedKeys.has(key.id) 
                          ? `${key.id}...` 
                          : '••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => toggleReveal(key.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {revealedKeys.has(key.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{key.usageCount.toLocaleString()} requests</div>
                    {key.lastUsedAt && (
                      <div className="text-xs text-gray-500">
                        Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{key.rateLimitPerMinute}/min</span>
                    <div className="text-xs text-gray-500">{key.remainingRequests} remaining</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      key.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {key.isActive ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {key.isActive && (
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Revoke"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {apiKeys?.length === 0 && (
          <div className="text-center py-12">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No API keys</h3>
            <p className="text-gray-500 mt-1">Create your first API key to start using the inference API</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {createdKey ? 'API Key Created' : 'Create API Key'}
              </h2>
              
              {createdKey ? (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 mb-2">
                      Copy your API key now. You won't be able to see it again!
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white border rounded px-3 py-2 text-sm break-all">
                        {createdKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(createdKey)}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreatedKey(null);
                    }}
                    className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Key Name
                    </label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production, Development"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rate Limit (requests per minute)
                    </label>
                    <input
                      type="number"
                      value={rateLimit}
                      onChange={(e) => setRateLimit(parseInt(e.target.value))}
                      min={1}
                      max={10000}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!newKeyName.trim() || createKey.isPending}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {createKey.isPending ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
