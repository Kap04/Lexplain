// components/TokenUsageDashboard.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Zap, BarChart3, Calculator } from 'lucide-react';

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  total_cost: number;
  requests: number;
  start_time: number;
  duration_seconds: number;
  avg_tokens_per_request: number;
  cache_efficiency: number;
}

interface TokenUsageDashboardProps {
  user: any;
  sessionId?: string;
}

export default function TokenUsageDashboard({ user, sessionId }: TokenUsageDashboardProps) {
  const [sessionUsage, setSessionUsage] = useState<TokenUsage | null>(null);
  const [dailyUsage, setDailyUsage] = useState<Record<string, number>>({});
  const [tokenCount, setTokenCount] = useState<any>(null);
  const [testContent, setTestContent] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchSessionUsage = async () => {
    if (!user || !sessionId) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tokens/usage/${sessionId}`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessionUsage(data.usage);
      }
    } catch (error) {
      console.error('Error fetching session usage:', error);
    }
  };

  const fetchDailyUsage = async () => {
    if (!user) return;
    
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tokens/daily-usage`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDailyUsage(data.daily_usage);
      }
    } catch (error) {
      console.error('Error fetching daily usage:', error);
    }
  };

  const countTokens = async () => {
    if (!user || !testContent.trim()) return;
    
    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tokens/count`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: testContent })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTokenCount(data);
      }
    } catch (error) {
      console.error('Error counting tokens:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessionUsage();
    fetchDailyUsage();
  }, [user, sessionId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 4 
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num));
  };

  const getCacheEfficiencyColor = (efficiency: number) => {
    if (efficiency > 70) return 'text-green-600 bg-green-100';
    if (efficiency > 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Session Usage Stats */}
      {sessionUsage && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="text-blue-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Session Token Usage</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Zap className="mx-auto mb-2 text-blue-600" size={20} />
              <div className="text-xl font-bold text-blue-900">{formatNumber(sessionUsage.input_tokens)}</div>
              <div className="text-sm text-blue-600">Input Tokens</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="mx-auto mb-2 text-green-600" size={20} />
              <div className="text-xl font-bold text-green-900">{formatNumber(sessionUsage.output_tokens)}</div>
              <div className="text-sm text-green-600">Output Tokens</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Calculator className="mx-auto mb-2 text-purple-600" size={20} />
              <div className="text-xl font-bold text-purple-900">{formatNumber(sessionUsage.cached_tokens)}</div>
              <div className="text-sm text-purple-600">Cached Tokens</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <DollarSign className="mx-auto mb-2 text-gray-600" size={20} />
              <div className="text-xl font-bold text-gray-900">{formatCurrency(sessionUsage.total_cost)}</div>
              <div className="text-sm text-gray-600">Total Cost</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-gray-900">{sessionUsage.requests}</div>
              <div className="text-gray-600">Requests</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">{formatNumber(sessionUsage.avg_tokens_per_request)}</div>
              <div className="text-gray-600">Avg Tokens/Request</div>
            </div>
            <div className="text-center">
              <div className={`inline-block px-2 py-1 rounded text-sm font-medium ${getCacheEfficiencyColor(sessionUsage.cache_efficiency)}`}>
                {sessionUsage.cache_efficiency.toFixed(1)}%
              </div>
              <div className="text-gray-600">Cache Efficiency</div>
            </div>
          </div>
        </div>
      )}

      {/* Token Counter Tool */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="text-green-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">Token Counter & Cost Estimator</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="test-content" className="block text-sm font-medium text-gray-700 mb-1">
              Test Content
            </label>
            <textarea
              id="test-content"
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              placeholder="Enter text to count tokens and estimate costs..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none"
              rows={4}
            />
          </div>
          
          <button
            onClick={countTokens}
            disabled={!testContent.trim() || loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Counting...' : 'Count Tokens & Estimate Cost'}
          </button>
          
          {tokenCount && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{tokenCount.token_count.total_tokens}</div>
                <div className="text-sm text-gray-600">Total Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{formatCurrency(tokenCount.cost_estimate.total_estimated_cost)}</div>
                <div className="text-sm text-gray-600">Estimated Cost</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{tokenCount.cost_estimate.estimated_output_tokens}</div>
                <div className="text-sm text-gray-600">Est. Output Tokens</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${tokenCount.optimization.within_limit ? 'text-green-600' : 'text-red-600'}`}>
                  {tokenCount.optimization.within_limit ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-600">Within Limit</div>
              </div>
              
              {tokenCount.optimization.suggestions.length > 0 && (
                <div className="col-span-full mt-2">
                  <div className="text-sm font-medium text-gray-700 mb-1">Optimization Suggestions:</div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {tokenCount.optimization.suggestions.map((suggestion: string, index: number) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-yellow-500 mt-0.5">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Daily Usage Chart */}
      {Object.keys(dailyUsage).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-purple-600" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Daily Token Usage</h2>
          </div>
          
          <div className="space-y-2">
            {Object.entries(dailyUsage)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 7)
              .map(([date, tokens]) => {
                const maxTokens = Math.max(...Object.values(dailyUsage));
                const percentage = (tokens / maxTokens) * 100;
                
                return (
                  <div key={date} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-gray-600">{date}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-24 text-sm text-gray-900 text-right">{formatNumber(tokens)} tokens</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
