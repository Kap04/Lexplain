// pages/performance-dashboard.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import CacheManager from '../components/CacheManager';
import TokenUsageDashboard from '../components/TokenUsageDashboard';
import { Settings, Database, TrendingUp } from 'lucide-react';

export default function PerformanceDashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'cache' | 'tokens'>('cache');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Settings className="mx-auto mb-4 text-gray-400" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Performance Dashboard</h1>
          <p className="text-gray-600">Please sign in to view performance metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Settings className="text-blue-600" size={24} />
              <h1 className="text-xl font-semibold text-gray-900">Performance Dashboard</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Welcome, {user.displayName || user.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm border mb-6">
          <button
            onClick={() => setActiveTab('cache')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'cache'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Database size={16} />
            Cache Management
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'tokens'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <TrendingUp size={16} />
            Token Usage & Cost
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'cache' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Cache Management</h2>
              <p className="text-gray-600">
                Monitor and manage document content caches to optimize performance and reduce API costs.
              </p>
            </div>
            <CacheManager user={user} />
          </div>
        )}

        {activeTab === 'tokens' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Token Usage & Cost Analysis</h2>
              <p className="text-gray-600">
                Track token consumption, monitor costs, and optimize your AI requests for better efficiency.
              </p>
            </div>
            <TokenUsageDashboard user={user} />
          </div>
        )}
      </div>

      {/* Footer with Performance Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Performance Optimization Tips</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Cache Management:</h4>
              <ul className="space-y-1">
                <li>• Document caches last 2 hours by default</li>
                <li>• Cached content reduces token costs by 75%</li>
                <li>• Large documents ({'>'}50k tokens) benefit most from caching</li>
                <li>• Clean up expired caches to free memory</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Token Optimization:</h4>
              <ul className="space-y-1">
                <li>• Use MMR chunking for large documents</li>
                <li>• Implement content summarization for repeated queries</li>
                <li>• Monitor daily usage to stay within budget</li>
                <li>• Cache efficiency {'>'}70% indicates good performance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
