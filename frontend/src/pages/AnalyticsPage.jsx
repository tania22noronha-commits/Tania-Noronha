import React, { useState, useEffect } from 'react';
import { useWorld } from '@/context/WorldContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';

export const AnalyticsPage = () => {
  const { currentWorld } = useWorld();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentWorld) {
      navigate('/worlds');
      return;
    }
    fetchAnalytics();
  }, [currentWorld, navigate]);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/worlds/${currentWorld.id}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      // Error fetching analytics - silent fail
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#00F0FF]" />
      </div>
    );
  }

  const wealthData = Object.entries(analytics.wealth_distribution || {}).map(([range, count]) => ({
    range,
    count
  }));

  const occupationsData = Object.entries(analytics.occupations || {}).slice(0, 10).map(([occupation, count]) => ({
    occupation,
    count
  }));

  const COLORS = ['#00F0FF', '#FF003C', '#00FF66', '#FFB000'];

  return (
    <div className="min-h-screen p-6" data-testid="analytics-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-5xl font-black tracking-tighter text-white mb-2">ANALYTICS</h1>
          <p className="text-[#8C92A6]">Population insights and trends</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wealth Distribution */}
          <Card className="glass-panel" data-testid="wealth-distribution-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#00F0FF]" />
                WEALTH DISTRIBUTION
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={wealthData}>
                  <XAxis 
                    dataKey="range" 
                    stroke="#8C92A6" 
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis 
                    stroke="#8C92A6" 
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#11111A', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#8C92A6' }}
                    itemStyle={{ color: '#00F0FF' }}
                  />
                  <Bar dataKey="count" fill="#00F0FF" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Occupations */}
          <Card className="glass-panel" data-testid="occupations-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">TOP OCCUPATIONS</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={occupationsData}
                    dataKey="count"
                    nameKey="occupation"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.occupation}: ${entry.count}`}
                    labelStyle={{ fill: '#FFFFFF', fontSize: '10px' }}
                  >
                    {occupationsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#11111A', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Population Stats */}
          <Card className="glass-panel lg:col-span-2" data-testid="population-stats-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">POPULATION STATISTICS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[#8C92A6] text-sm mb-2">Total Population</p>
                  <p className="text-3xl font-black text-white font-mono">{analytics.total_population}</p>
                </div>
                <div>
                  <p className="text-[#8C92A6] text-sm mb-2">Avg Happiness</p>
                  <p className="text-3xl font-black text-[#00FF66] font-mono">{analytics.average_happiness?.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-[#8C92A6] text-sm mb-2">Occupations</p>
                  <p className="text-3xl font-black text-[#00F0FF] font-mono">{Object.keys(analytics.occupations || {}).length}</p>
                </div>
                <div>
                  <p className="text-[#8C92A6] text-sm mb-2">Wealth Ranges</p>
                  <p className="text-3xl font-black text-[#FFB000] font-mono">{Object.keys(analytics.wealth_distribution || {}).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
