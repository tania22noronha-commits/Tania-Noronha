import React, { useState, useEffect } from 'react';
import { useWorld } from '@/context/WorldContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, DollarSign, Users, TrendingUp, Loader2 } from 'lucide-react';

export const EconomyPage = () => {
  const { currentWorld } = useWorld();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentWorld) {
      navigate('/worlds');
      return;
    }
    fetchBusinesses();
    const interval = setInterval(fetchBusinesses, 10000);
    return () => clearInterval(interval);
  }, [currentWorld, navigate]);

  const fetchBusinesses = async () => {
    try {
      const response = await axios.get(`${API}/worlds/${currentWorld.id}/businesses`);
      setBusinesses(response.data);
    } catch (error) {
      // Error fetching businesses - silent fail
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#00F0FF]" />
      </div>
    );
  }

  const totalRevenue = businesses.reduce((sum, b) => sum + (b.revenue || 0), 0);
  const totalEmployees = businesses.reduce((sum, b) => sum + (b.employees?.length || 0), 0);

  return (
    <div className="min-h-screen p-6" data-testid="economy-page">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-black tracking-tighter text-white mb-6">ECONOMY</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="glass-panel" data-testid="economy-businesses-stat">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-[#00F0FF] font-mono flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                BUSINESSES
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-white font-mono">{businesses.length}</p>
            </CardContent>
          </Card>

          <Card className="glass-panel" data-testid="economy-revenue-stat">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-[#00FF66] font-mono flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                TOTAL REVENUE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-white font-mono">${(totalRevenue / 1000000).toFixed(1)}M</p>
            </CardContent>
          </Card>

          <Card className="glass-panel" data-testid="economy-employees-stat">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-[#FFB000] font-mono flex items-center gap-2">
                <Users className="w-4 h-4" />
                EMPLOYEES
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-white font-mono">{totalEmployees}</p>
            </CardContent>
          </Card>
        </div>

        {/* Business List */}
        <Card className="glass-panel" data-testid="business-list-card">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">ALL BUSINESSES</CardTitle>
          </CardHeader>
          <CardContent>
            {businesses.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-[#00F0FF]/30 mx-auto mb-4" />
                <p className="text-[#8C92A6]">No businesses yet. Agents will start companies as the simulation runs.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {businesses.map((business) => (
                  <div
                    key={business.id}
                    data-testid={`business-card-${business.id}`}
                    className="p-4 bg-black/40 border border-white/10 rounded-lg hover:border-[#00F0FF]/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">{business.name}</h3>
                        <Badge variant="outline" className="text-xs border-[#00F0FF]/30 text-[#00F0FF]">
                          {business.business_type}
                        </Badge>
                      </div>
                      <Building2 className="w-6 h-6 text-[#00F0FF]/50" />
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-[#8C92A6]">Owner</span>
                        <span className="text-white font-medium">{business.owner_name || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#8C92A6]">Revenue</span>
                        <span className="text-[#00FF66] font-mono font-bold">${(business.revenue || 0).toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#8C92A6]">Profit</span>
                        <span className="text-white font-mono font-bold">${(business.profit || 0).toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#8C92A6]">Employees</span>
                        <span className="text-white font-mono">{business.employees?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
