import React, { useState, useEffect } from 'react';
import { useWorld } from '@/context/WorldContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Users, Loader2 } from 'lucide-react';

export const RelationshipsPage = () => {
  const { currentWorld } = useWorld();
  const [relationships, setRelationships] = useState([]);
  const [filteredRelationships, setFilteredRelationships] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentWorld) {
      navigate('/worlds');
      return;
    }
    fetchRelationships();
  }, [currentWorld]);

  useEffect(() => {
    if (filterType === 'all') {
      setFilteredRelationships(relationships);
    } else {
      setFilteredRelationships(relationships.filter(r => r.relationship_type === filterType));
    }
  }, [filterType, relationships]);

  const fetchRelationships = async () => {
    try {
      const response = await axios.get(`${API}/worlds/${currentWorld.id}/relationships`);
      setRelationships(response.data);
      setFilteredRelationships(response.data);
    } catch (error) {
      console.error('Failed to fetch relationships');
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

  const relationshipColors = {
    friendship: '#00F0FF',
    romantic: '#FF003C',
    professional: '#00FF66',
    rivalry: '#FFB000'
  };

  return (
    <div className="min-h-screen p-6" data-testid="relationships-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-white mb-2">RELATIONSHIPS</h1>
            <p className="text-[#8C92A6]">Social connections between agents</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48 bg-black/60 border-white/20 text-white" data-testid="relationship-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#11111A] border-white/20">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="friendship">Friendship</SelectItem>
                <SelectItem value="romantic">Romantic</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="rivalry">Rivalry</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="border-[#00F0FF]/30 text-[#00F0FF]">
              {filteredRelationships.length} relationships
            </Badge>
          </div>
        </div>

        {filteredRelationships.length === 0 ? (
          <Card className="glass-panel">
            <CardContent className="py-12 text-center">
              <Heart className="w-16 h-16 text-[#00F0FF]/30 mx-auto mb-4" />
              <p className="text-[#8C92A6]">
                {filterType === 'all' 
                  ? 'No relationships yet. Agents will form connections as the simulation runs.'
                  : `No ${filterType} relationships found.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRelationships.map((rel) => (
              <Card
                key={rel.id}
                data-testid={`relationship-card-${rel.id}`}
                className="glass-panel hover:border-white/30 transition-all"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="text-xs capitalize"
                      style={{
                        borderColor: `${relationshipColors[rel.relationship_type]}40`,
                        color: relationshipColors[rel.relationship_type]
                      }}
                    >
                      {rel.relationship_type}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-[#FF003C]" />
                      <span className="text-white font-mono text-sm">{rel.strength}/100</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#8C92A6]" />
                      <span className="text-white font-medium">{rel.agent1_name}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#8C92A6]" />
                      <span className="text-white font-medium">{rel.agent2_name}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
