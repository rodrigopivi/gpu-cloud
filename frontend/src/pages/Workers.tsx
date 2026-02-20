import { useState } from 'react';
import { useWorkers, useAddWorker, useRemoveWorker, useQueueStatus } from '../hooks/useQueries';
import { Plus, Trash2, Server, Activity, Clock, Cpu } from 'lucide-react';

export default function Workers() {
  const { data: workersData, isLoading: workersLoading } = useWorkers();
  const { data: queueData, isLoading: queueLoading } = useQueueStatus();
  const addWorker = useAddWorker();
  const removeWorker = useRemoveWorker();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');

  const handleAddWorker = async () => {
    if (!newWorkerName.trim()) return;
    
    try {
      await addWorker.mutateAsync(newWorkerName);
      setShowAddModal(false);
      setNewWorkerName('');
    } catch (error) {
      console.error('Failed to add worker:', error);
    }
  };

  const handleRemoveWorker = async (id: string) => {
    if (!confirm('Are you sure you want to remove this worker?')) return;
    
    try {
      await removeWorker.mutateAsync(id);
    } catch (error) {
      console.error('Failed to remove worker:', error);
    }
  };

  if (workersLoading || queueLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const stats = workersData?.stats;
  const workers = workersData?.workers || [];
  const tasks = queueData?.recentTasks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GPU Workers</h1>
          <p className="mt-1 text-gray-600">Monitor and manage distributed GPU workers</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          Add Worker
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Server className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Workers</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Online</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.online || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Cpu className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total GPU Memory</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalGpuMemory || 0} GB</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Utilization</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.avgUtilization || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workers List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Worker Nodes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Worker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GPU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Load
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Memory Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GPU Util
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Heartbeat
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workers.map((worker) => (
                <tr key={worker.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{worker.hostname}</div>
                    <div className="text-xs text-gray-500">{worker.id.substring(0, 8)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{worker.gpuInfo.name}</div>
                    <div className="text-xs text-gray-500">{worker.gpuInfo.memoryTotal} GB</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      worker.status === 'online' ? 'bg-green-100 text-green-800' :
                      worker.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {worker.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            worker.currentLoad / worker.maxCapacity > 0.8 ? 'bg-red-500' :
                            worker.currentLoad / worker.maxCapacity > 0.5 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${(worker.currentLoad / worker.maxCapacity) * 100}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-600">
                        {worker.currentLoad}/{worker.maxCapacity}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {worker.gpuInfo.memoryUsed} / {worker.gpuInfo.memoryTotal} GB
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round((worker.gpuInfo.memoryUsed / worker.gpuInfo.memoryTotal) * 100)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            worker.gpuInfo.utilization > 80 ? 'bg-red-500' :
                            worker.gpuInfo.utilization > 50 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${worker.gpuInfo.utilization}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-600">{worker.gpuInfo.utilization}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(worker.lastHeartbeat).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRemoveWorker(worker.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {workers.length === 0 && (
          <div className="text-center py-12">
            <Server className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No workers</h3>
            <p className="text-gray-500 mt-1">Add your first worker to start processing inference requests</p>
          </div>
        )}
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Worker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {task.id.substring(0, 12)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {task.priority}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {task.assignedWorker ? task.assignedWorker.substring(0, 8) + '...' : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(task.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Worker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add Worker</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Worker Hostname
                  </label>
                  <input
                    type="text"
                    value={newWorkerName}
                    onChange={(e) => setNewWorkerName(e.target.value)}
                    placeholder="e.g., gpu-worker-01"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddWorker}
                    disabled={!newWorkerName.trim() || addWorker.isPending}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {addWorker.isPending ? 'Adding...' : 'Add Worker'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
