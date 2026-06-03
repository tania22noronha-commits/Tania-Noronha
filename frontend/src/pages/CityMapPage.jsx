import React, { useState, useEffect } from 'react';
import { useWorld } from '@/context/WorldContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Users, Building2, Home, Factory, Music, TreePine, Landmark, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DISTRICTS = [
  { name: 'Residential', color: '#00F0FF', icon: Home, x: 50, y: 50, width: 250, height: 200 },
  { name: 'Commercial', color: '#00FF66', icon: Building2, x: 320, y: 50, width: 280, height: 200 },
  { name: 'Industrial', color: '#FFB000', icon: Factory, x: 50, y: 270, width: 250, height: 200 },
  { name: 'Entertainment', color: '#FF003C', icon: Music, x: 320, y: 270, width: 150, height: 200 },
  { name: 'Government', color: '#8B5CF6', icon: Landmark, x: 490, y: 270, width: 110, height: 150 },
  { name: 'Parks', color: '#10B981', icon: TreePine, x: 490, y: 440, width: 110, height: 30 },
];

export const CityMapPage = () => {
  const { currentWorld } = useWorld();
  const [agents, setAgents] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const [showRelationships, setShowRelationships] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentWorld) {
      navigate('/worlds');
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [currentWorld, navigate]);

  const fetchData = async () => {
    try {
      const [agentsRes, relationshipsRes] = await Promise.all([
        axios.get(`${API}/worlds/${currentWorld.id}/agents?limit=100`),
        axios.get(`${API}/worlds/${currentWorld.id}/relationships`)
      ]);
      setAgents(agentsRes.data);
      setRelationships(relationshipsRes.data);
    } catch (error) {
      // Error fetching data - silent fail
    } finally {
      setLoading(false);
    }
  };

  const getAgentsByDistrict = (districtName) => {
    return agents.filter(a => a.location?.district === districtName);
  };

  const getAgentPosition = (agent, district) => {
    const agentsInDistrict = getAgentsByDistrict(district.name);
    const index = agentsInDistrict.findIndex(a => a.id === agent.id);
    const total = agentsInDistrict.length;
    
    // Distribute agents in a grid pattern within the district
    const cols = Math.ceil(Math.sqrt(total));
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    const cellWidth = district.width / cols;
    const cellHeight = district.height / Math.ceil(total / cols);
    
    return {
      x: district.x + col * cellWidth + cellWidth / 2,
      y: district.y + row * cellHeight + cellHeight / 2
    };
  };

  const getAgentPositionById = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return null;
    
    const district = DISTRICTS.find(d => d.name === agent.location?.district);
    if (!district) return null;
    
    return getAgentPosition(agent, district);
  };

  const getRelationshipColor = (type) => {
    const colors = {
      friendship: '#00F0FF',
      romantic: '#FF003C',
      professional: '#00FF66',
      rivalry: '#FFB000'
    };
    return colors[type] || '#FFFFFF';
  };

  const handleDistrictClick = (district) => {
    setSelectedDistrict(district);
    setSelectedAgent(null);
  };

  const handleAgentClick = async (agent) => {
    try {
      const response = await axios.get(`${API}/worlds/${currentWorld.id}/agents/${agent.id}`);
      setSelectedAgent(response.data);
      setSelectedDistrict(null);
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
    <div className="min-h-screen p-6" data-testid="city-map-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-5xl font-black tracking-tighter text-white mb-2">CITY MAP</h1>
          <p className="text-[#8C92A6]">Interactive visualization of agent locations and districts</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Canvas */}
          <Card className="lg:col-span-2 glass-panel" data-testid="city-map-canvas">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#00F0FF]" />
                  LIVE CITY VIEW
                </CardTitle>
                <Button
                  data-testid="toggle-relationships-button"
                  onClick={() => setShowRelationships(!showRelationships)}
                  size="sm"
                  variant={showRelationships ? "default" : "outline"}
                  className={showRelationships 
                    ? "bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50 hover:bg-[#00F0FF]/30"
                    : "text-[#8C92A6] border-[#8C92A6]/30 hover:text-white"
                  }
                >
                  <Heart className="w-4 h-4 mr-2" />
                  {showRelationships ? 'Hide' : 'Show'} Relationships
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative w-full" style={{ height: '500px', background: 'linear-gradient(135deg, #0A0A1A 0%, #050505 100%)' }}>
                <svg width="100%" height="100%" viewBox="0 0 650 500" className="rounded-lg">
                  {/* Grid background */}
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="650" height="500" fill="url(#grid)" />

                  {/* Relationship lines (drawn first, behind agents) */}
                  {showRelationships && relationships.map((rel) => {
                    const pos1 = getAgentPositionById(rel.agent1_id);
                    const pos2 = getAgentPositionById(rel.agent2_id);
                    
                    if (!pos1 || !pos2) return null;
                    
                    const color = getRelationshipColor(rel.relationship_type);
                    const opacity = rel.strength / 200; // Scale strength to opacity
                    
                    return (
                      <g key={rel.id}>
                        <line
                          x1={pos1.x}
                          y1={pos1.y}
                          x2={pos2.x}
                          y2={pos2.y}
                          stroke={color}
                          strokeWidth="1.5"
                          strokeOpacity={opacity}
                          strokeDasharray={rel.relationship_type === 'rivalry' ? '4,4' : 'none'}
                        />
                      </g>
                    );
                  })}

                  {/* Districts */}
                  {DISTRICTS.map((district) => {
                    const DistrictIcon = district.icon;
                    const agentCount = getAgentsByDistrict(district.name).length;
                    const isHovered = hoveredDistrict === district.name;
                    
                    return (
                      <g key={district.name}>
                        {/* District boundary */}
                        <rect
                          x={district.x}
                          y={district.y}
                          width={district.width}
                          height={district.height}
                          fill={`${district.color}08`}
                          stroke={district.color}
                          strokeWidth={isHovered ? "3" : "1.5"}
                          strokeOpacity={isHovered ? "0.8" : "0.3"}
                          rx="8"
                          className="cursor-pointer transition-all"
                          onMouseEnter={() => setHoveredDistrict(district.name)}
                          onMouseLeave={() => setHoveredDistrict(null)}
                          onClick={() => handleDistrictClick(district)}
                        />
                        
                        {/* District label */}
                        <text
                          x={district.x + district.width / 2}
                          y={district.y + 20}
                          textAnchor="middle"
                          fill={district.color}
                          fontSize="12"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono"
                          className="pointer-events-none"
                        >
                          {district.name.toUpperCase()}
                        </text>
                        
                        {/* Agent count badge */}
                        <rect
                          x={district.x + district.width - 40}
                          y={district.y + 5}
                          width="35"
                          height="18"
                          fill={district.color}
                          fillOpacity="0.2"
                          stroke={district.color}
                          strokeWidth="1"
                          rx="4"
                          className="pointer-events-none"
                        />
                        <text
                          x={district.x + district.width - 22}
                          y={district.y + 17}
                          textAnchor="middle"
                          fill={district.color}
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono"
                          className="pointer-events-none"
                        >
                          {agentCount}
                        </text>
                      </g>
                    );
                  })}

                  {/* Agent markers */}
                  {agents.map((agent) => {
                    const district = DISTRICTS.find(d => d.name === agent.location?.district);
                    if (!district) return null;
                    
                    const pos = getAgentPosition(agent, district);
                    const happiness = agent.emotional_state?.happiness || 70;
                    const markerColor = happiness > 70 ? '#00FF66' : happiness > 40 ? '#FFB000' : '#FF003C';
                    
                    return (
                      <g key={agent.id}>
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="4"
                          fill={markerColor}
                          stroke="white"
                          strokeWidth="1"
                          className="cursor-pointer hover:r-6 transition-all"
                          onClick={() => handleAgentClick(agent)}
                        >
                          <title>{agent.name}</title>
                        </circle>
                        {/* Glow effect */}
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="8"
                          fill={markerColor}
                          fillOpacity="0.2"
                          className="pointer-events-none animate-pulse"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Legend */}
                <div className="absolute bottom-4 right-4 glass-panel p-3 text-xs space-y-3">
                  <div>
                    <p className="text-white font-bold mb-2 font-mono">AGENT STATUS</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#00FF66]"></div>
                        <span className="text-[#8C92A6]">Happy (70+)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#FFB000]"></div>
                        <span className="text-[#8C92A6]">Neutral (40-70)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#FF003C]"></div>
                        <span className="text-[#8C92A6]">Stressed (&lt;40)</span>
                      </div>
                    </div>
                  </div>
                  
                  {showRelationships && (
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-white font-bold mb-2 font-mono">RELATIONSHIPS</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-px bg-[#00F0FF]"></div>
                          <span className="text-[#8C92A6]">Friendship</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-px bg-[#FF003C]"></div>
                          <span className="text-[#8C92A6]">Romance</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-px bg-[#00FF66]"></div>
                          <span className="text-[#8C92A6]">Professional</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-px bg-[#FFB000] border-dashed"></div>
                          <span className="text-[#8C92A6]">Rivalry</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-[#5A607A] text-xs mt-4 text-center">
                Click on districts to view details • Click on agent dots to view profiles
              </p>
            </CardContent>
          </Card>

          {/* Info Panel */}
          <Card className="glass-panel" data-testid="map-info-panel">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">DISTRICT INFO</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDistrict && !selectedAgent && (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-[#00F0FF]/30 mx-auto mb-4" />
                  <p className="text-[#8C92A6] mb-4">Click on a district or agent to view details</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between px-4">
                      <span className="text-[#8C92A6]">Total Agents</span>
                      <Badge variant="outline" className="border-[#00F0FF]/30 text-[#00F0FF]">
                        {agents.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between px-4">
                      <span className="text-[#8C92A6]">Relationships</span>
                      <Badge variant="outline" className="border-[#FF003C]/30 text-[#FF003C]">
                        {relationships.length}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {selectedDistrict && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {React.createElement(selectedDistrict.icon, { 
                        className: "w-8 h-8",
                        style: { color: selectedDistrict.color }
                      })}
                      <div>
                        <h3 className="text-2xl font-black text-white">{selectedDistrict.name}</h3>
                        <Badge variant="outline" style={{ 
                          borderColor: `${selectedDistrict.color}40`,
                          color: selectedDistrict.color 
                        }}>
                          {getAgentsByDistrict(selectedDistrict.name).length} agents
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedDistrict(null)}
                      className="text-[#8C92A6] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <ScrollArea className="h-96">
                    <div className="space-y-2 pr-4">
                      {getAgentsByDistrict(selectedDistrict.name).map((agent) => (
                        <div
                          key={agent.id}
                          className="p-3 bg-black/40 border border-white/10 rounded-lg hover:border-[#00F0FF]/30 transition-all cursor-pointer"
                          onClick={() => handleAgentClick(agent)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">{agent.name}</p>
                              <p className="text-xs text-[#8C92A6]">{agent.occupation}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-[#8C92A6]">Happiness</p>
                              <p className="text-white font-mono font-bold">{agent.emotional_state?.happiness || 70}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Agent Details Modal */}
        <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
          <DialogContent className="glass-panel border-white/20 max-w-2xl" data-testid="agent-map-details">
            {selectedAgent && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-white">
                    {selectedAgent.name}
                  </DialogTitle>
                  <p className="text-[#8C92A6]">{selectedAgent.age} years • {selectedAgent.gender} • {selectedAgent.occupation}</p>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass-panel p-3">
                      <p className="text-xs text-[#8C92A6] mb-1">Location</p>
                      <p className="text-white font-bold">{selectedAgent.location?.district || 'Unknown'}</p>
                    </div>
                    <div className="glass-panel p-3">
                      <p className="text-xs text-[#8C92A6] mb-1">Wealth</p>
                      <p className="text-white font-mono font-bold">${(selectedAgent.resources?.wealth || 0).toFixed(0)}</p>
                    </div>
                    <div className="glass-panel p-3">
                      <p className="text-xs text-[#8C92A6] mb-1">Happiness</p>
                      <p className="text-[#00FF66] font-mono font-bold">{selectedAgent.emotional_state?.happiness || 70}%</p>
                    </div>
                    <div className="glass-panel p-3">
                      <p className="text-xs text-[#8C92A6] mb-1">Stress</p>
                      <p className="text-[#FF003C] font-mono font-bold">{selectedAgent.emotional_state?.stress || 30}%</p>
                    </div>
                  </div>

                  {selectedAgent.goals && selectedAgent.goals.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-[#00F0FF] mb-2">Current Goals</h4>
                      <div className="space-y-2">
                        {selectedAgent.goals.slice(0, 3).map((goal, index) => (
                          <div key={goal.id || index} className="glass-panel p-2">
                            <p className="text-white text-sm">{goal.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden">
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
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
