import { useMetrics, useWorkers, useQueueStatus } from '../hooks/useQueries';
import { 
  Activity, 
  Layers, 
  Clock, 
  Server
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';



export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useMetrics();
  const { data: workersData, isLoading: workersLoading } = useWorkers();
  const { data: queueData, isLoading: queueLoading } = useQueueStatus();

  if (metricsLoading || workersLoading || queueLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const summary = metrics?.summary;
  const hourlyData = metrics?.hourlyStats || [];
  const modelUsage = metrics?.modelUsage || {};
  
  const modelUsageData = Object.entries(modelUsage).map(([name, stats]) => ({
    name: name.split('-')[0].toUpperCase(),
    requests: stats.requests,
    tokens: stats.tokens,
  }));

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon,
    color = 'indigo'
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string;
    icon: any;
    color?: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          System Operational
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Requests"
          value={summary?.totalRequests.toLocaleString() || '0'}
          subtitle="All time"
          icon={Activity}
          color="indigo"
        />
        <StatCard
          title="Total Tokens"
          value={summary?.totalTokens.toLocaleString() || '0'}
          subtitle="Generated"
          icon={Layers}
          color="purple"
        />
        <StatCard
          title="Active Workers"
          value={workersData?.stats.online || 0}
          subtitle={`of ${workersData?.stats.total || 0} total`}
          icon={Server}
          color="green"
        />
        <StatCard
          title="Avg Latency"
          value={`${Math.round(summary?.avgLatencyMs || 0)}ms`}
          subtitle="Response time"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Queue Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: queueData?.stats.pending || 0, color: 'bg-yellow-500' },
          { label: 'Processing', value: queueData?.stats.processing || 0, color: 'bg-blue-500' },
          { label: 'Completed', value: queueData?.stats.completed || 0, color: 'bg-green-500' },
          { label: 'Failed', value: queueData?.stats.failed || 0, color: 'bg-red-500' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
            <div>
              <p className="text-sm text-gray-600">{item.label}</p>
              <p className="text-xl font-bold text-gray-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Requests</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={(value) => new Date(value).getHours() + ':00'}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="requests" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="tokens" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Usage */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Usage</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="requests" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Workers Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">GPU Workers</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hostname
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
                  Memory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workersData?.workers.map((worker) => (
                <tr key={worker.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {worker.hostname}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {worker.gpuInfo.name}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {worker.currentLoad} / {worker.maxCapacity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {worker.gpuInfo.memoryUsed} / {worker.gpuInfo.memoryTotal} GB
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
