import React, { useState, useEffect } from 'react';
import { useWorld } from '@/context/WorldContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Pause, Users, DollarSign, Heart, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const DashboardPage = () => {
  const { currentWorld, isSimulationRunning, setIsSimulationRunning } = useWorld();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentWorld) {
      navigate('/worlds');
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [currentWorld, navigate]);

  const fetchData = async () => {
    if (!currentWorld) return;
    
    try {
      const [statsRes, eventsRes] = await Promise.all([
        axios.get(`${API}/worlds/${currentWorld.id}/stats`),
        axios.get(`${API}/worlds/${currentWorld.id}/events?limit=20`)
      ]);
      setStats(statsRes.data);
      setEvents(eventsRes.data);
    } catch (error) {
      // Error fetching data - silent fail
    } finally {
      setLoading(false);
    }
  };

  const toggleSimulation = async () => {
    try {
      const endpoint = isSimulationRunning ? 'pause' : 'start';
      await axios.post(`${API}/worlds/${currentWorld.id}/simulation/${endpoint}`);
      setIsSimulationRunning(!isSimulationRunning);
      toast.success(isSimulationRunning ? 'Simulation paused' : 'Simulation started');
    } catch (error) {
      toast.error('Failed to toggle simulation');
    }
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#00F0FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white mb-2" data-testid="dashboard-title">
              {currentWorld?.name}
            </h1>
            <p className="text-[#8C92A6]">Real-time simulation dashboard</p>
          </div>
          <Button
            data-testid="toggle-simulation-button"
            onClick={toggleSimulation}
            size="lg"
            className={`font-mono uppercase ${
              isSimulationRunning
                ? 'bg-[#FF003C]/10 text-[#FF003C] border border-[#FF003C]/50 hover:bg-[#FF003C] hover:text-black'
                : 'bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/50 hover:bg-[#00FF66] hover:text-black'
            }`}
          >
            {isSimulationRunning ? (
              <>
                <Pause className="mr-2" /> PAUSE
              </>
            ) : (
              <>
                <Play className="mr-2" /> START
              </>
            )}
          </Button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="glass-panel hover:border-[#00F0FF]/40 transition-all tech-corners scan-lines holographic relative group" data-testid="kpi-population">
            <div className="absolute top-2 right-2 w-2 h-2 bg-[#00F0FF] rounded-full animate-pulse"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-[#00F0FF] font-mono flex items-center gap-2">
                <Users className="w-4 h-4" />
                POPULATION
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-white font-mono neon-text-cyan">{stats.population}</p>
              <p className="text-xs text-[#5A607A] mt-1">Active agents</p>
            </CardContent>
          </Card>

          <Card className="glass-panel hover:border-[#00FF66]/40 transition-all tech-corners scan-lines holographic relative group" data-testid="kpi-wealth">
            <div className="absolute top-2 right-2 w-2 h-2 bg-[#00FF66] rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-[#00FF66] font-mono flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                TOTAL WEALTH
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-white font-mono glow-green">
                ${(stats.total_wealth / 1000000).toFixed(1)}M
              </p>
              <p className="text-xs text-[#5A607A] mt-1">City economy</p>
            </CardContent>
          </Card>

          <Card className="glass-panel hover:border-[#FF003C]/40 transition-all tech-corners scan-lines holographic relative group" data-testid="kpi-happiness">
            <div className="absolute top-2 right-2 w-2 h-2 bg-[#FF003C] rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-[#FF003C] font-mono flex items-center gap-2">
                <Heart className="w-4 h-4" />
                HAPPINESS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-white font-mono neon-text-red">{stats.average_happiness}%</p>
              <p className="text-xs text-[#5A607A] mt-1">Avg satisfaction</p>
            </CardContent>
          </Card>

          <Card className="glass-panel hover:border-[#FFB000]/40 transition-all tech-corners scan-lines holographic relative group" data-testid="kpi-businesses">
            <div className="absolute top-2 right-2 w-2 h-2 bg-[#FFB000] rounded-full animate-pulse" style={{ animationDelay: '0.9s' }}></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-[#FFB000] font-mono flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                BUSINESSES
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-black text-white font-mono">{stats.business_count}</p>
              <p className="text-xs text-[#5A607A] mt-1">Active companies</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Event Feed */}
          <Card className="lg:col-span-2 glass-panel" data-testid="event-feed-card">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-[#00F0FF]" />
                LIVE EVENT FEED
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {events.length === 0 ? (
                    <p className="text-[#8C92A6] text-center py-8">No events yet. Start the simulation!</p>
                  ) : (
                    events.map((event, index) => (
                      <div
                        key={event.id || index}
                        data-testid={`event-item-${index}`}
                        className="p-4 bg-black/40 border border-white/10 rounded-lg hover:border-[#00F0FF]/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-white text-sm leading-relaxed">{event.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                variant="outline"
                                className="text-xs border-[#00F0FF]/30 text-[#00F0FF]"
                              >
                                {event.event_type}
                              </Badge>
                              <span className="text-xs text-[#5A607A]">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <Card className="glass-panel" data-testid="stats-summary-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">CITY STATS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#8C92A6] text-sm">Employment Rate</span>
                  <span className="text-white font-mono font-bold">{stats.employment_rate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8C92A6] text-sm">Avg Income</span>
                  <span className="text-white font-mono font-bold">${(stats.average_income / 1000).toFixed(1)}K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8C92A6] text-sm">Relationships</span>
                  <span className="text-white font-mono font-bold">{stats.relationship_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8C92A6] text-sm">Crime Rate</span>
                  <span className="text-white font-mono font-bold">{stats.crime_rate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8C92A6] text-sm">Trust Index</span>
                  <span className="text-white font-mono font-bold">{stats.trust_index}/100</span>
                </div>
              </div>

              {stats.mayor_name && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-xs text-[#5A607A] uppercase tracking-wider mb-2">MAYOR</p>
                  <p className="text-white font-bold text-lg">{stats.mayor_name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[#8C92A6] text-sm">Approval</span>
                    <span className="text-[#00FF66] font-mono font-bold">{stats.approval_rating}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
