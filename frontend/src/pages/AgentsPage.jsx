import React, { useState, useEffect } from 'react';
import { useWorld } from '@/context/WorldContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Briefcase, Heart, Target, Brain, Loader2, DollarSign } from 'lucide-react';

export const AgentsPage = () => {
  const { currentWorld } = useWorld();
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentWorld) {
      navigate('/worlds');
      return;
    }
    fetchAgents();
  }, [currentWorld, navigate]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredAgents(
        agents.filter(a => 
          a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.occupation.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredAgents(agents);
    }
  }, [searchTerm, agents, setFilteredAgents]);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API}/worlds/${currentWorld.id}/agents?limit=100`);
      setAgents(response.data);
      setFilteredAgents(response.data);
    } catch (error) {
      // Error fetching agents - silent fail
    } finally {
      setLoading(false);
    }
  };

  const viewAgentDetails = async (agentId) => {
    try {
      const response = await axios.get(`${API}/worlds/${currentWorld.id}/agents/${agentId}`);
      setSelectedAgent(response.data);
    } catch (error) {
      console.error('Failed to fetch agent details');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#00F0FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" data-testid="agents-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-5xl font-black tracking-tighter text-white mb-4">AGENTS</h1>
          <div className="flex items-center gap-4">
            <Input
              data-testid="agent-search-input"
              placeholder="Search agents by name or occupation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md bg-black/60 border-white/20 text-white"
            />
            <Badge variant="outline" className="border-[#00F0FF]/30 text-[#00F0FF]">
              {filteredAgents.length} agents
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAgents.map((agent) => (
            <Card
              key={agent.id}
              data-testid={`agent-card-${agent.id}`}
              className="glass-panel hover:border-[#00F0FF]/40 transition-all cursor-pointer"
              onClick={() => viewAgentDetails(agent.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12 border-2 border-[#00F0FF]/30">
                    <AvatarFallback className="bg-[#00F0FF]/20 text-[#00F0FF] font-bold">
                      {agent.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-bold text-white truncate">
                      {agent.name}
                    </CardTitle>
                    <p className="text-xs text-[#8C92A6]">{agent.age} years old</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="w-4 h-4 text-[#8C92A6]" />
                  <span className="text-[#8C92A6] truncate">{agent.occupation}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-[#00FF66]" />
                  <span className="text-white font-mono">${(agent.resources?.wealth || 0).toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Heart className="w-4 h-4 text-[#FF003C]" />
                  <span className="text-white">Happiness: {agent.emotional_state?.happiness || 70}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Agent Details Dialog */}
        <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
          <DialogContent className="glass-panel border-white/20 max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="agent-details-dialog">
            {selectedAgent && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="w-16 h-16 border-2 border-[#00F0FF]/50">
                      <AvatarFallback className="bg-[#00F0FF]/20 text-[#00F0FF] font-bold text-xl">
                        {selectedAgent.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-3xl font-black text-white">{selectedAgent.name}</DialogTitle>
                      <p className="text-[#8C92A6]">{selectedAgent.age} years • {selectedAgent.gender}</p>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Stats */}
                  <div>
                    <h3 className="text-lg font-bold text-[#00F0FF] mb-3 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      PROFILE
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-panel p-3">
                        <p className="text-xs text-[#8C92A6] mb-1">Occupation</p>
                        <p className="text-white font-bold">{selectedAgent.occupation}</p>
                      </div>
                      <div className="glass-panel p-3">
                        <p className="text-xs text-[#8C92A6] mb-1">Wealth</p>
                        <p className="text-white font-mono font-bold">${(selectedAgent.resources?.wealth || 0).toFixed(0)}</p>
                      </div>
                      <div className="glass-panel p-3">
                        <p className="text-xs text-[#8C92A6] mb-1">Income</p>
                        <p className="text-white font-mono font-bold">${(selectedAgent.resources?.income || 0).toFixed(0)}/yr</p>
                      </div>
                      <div className="glass-panel p-3">
                        <p className="text-xs text-[#8C92A6] mb-1">Location</p>
                        <p className="text-white font-bold">{selectedAgent.location?.district || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Personality */}
                  <div>
                    <h3 className="text-lg font-bold text-[#FF003C] mb-3 flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      PERSONALITY
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(selectedAgent.personality || {}).map(([trait, value]) => (
                        <div key={trait} className="flex justify-between items-center p-2 bg-black/40 rounded">
                          <span className="text-[#8C92A6] capitalize">{trait}</span>
                          <span className="text-white font-mono font-bold">{value}/100</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Goals */}
                  {selectedAgent.goals && selectedAgent.goals.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-[#00FF66] mb-3 flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        GOALS
                      </h3>
                      <div className="space-y-2">
                        {selectedAgent.goals.map((goal, index) => (
                          <div key={goal.id || index} className="glass-panel p-3">
                            <p className="text-white">{goal.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-[#00FF66]"
                                  style={{ width: `${goal.progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-[#8C92A6] font-mono">{goal.progress}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Relationships */}
                  {selectedAgent.relationships && selectedAgent.relationships.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-[#FFB000] mb-3">RELATIONSHIPS</h3>
                      <div className="space-y-2">
                        {selectedAgent.relationships.map((rel, index) => (
                          <div key={rel.id || index} className="flex items-center justify-between p-3 bg-black/40 rounded">
                            <div>
                              <p className="text-white font-medium">{rel.other_agent_name}</p>
                              <Badge variant="outline" className="text-xs mt-1 border-[#FFB000]/30 text-[#FFB000]">
                                {rel.relationship_type}
                              </Badge>
                            </div>
                            <span className="text-white font-mono">Strength: {rel.strength}/100</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Memories */}
                  {selectedAgent.memories && selectedAgent.memories.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-[#00F0FF] mb-3">RECENT MEMORIES</h3>
                      <ScrollArea className="h-48">
                        <div className="space-y-2 pr-4">
                          {selectedAgent.memories.slice(-10).reverse().map((memory, index) => (
                            <div key={memory.id || index} className="p-3 bg-black/40 rounded text-sm">
                              <p className="text-white">{memory.description}</p>
                              <p className="text-xs text-[#5A607A] mt-1">{memory.event_type}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
