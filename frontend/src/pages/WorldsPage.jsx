import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { API } from '@/utils/api';
import { useWorld } from '@/context/WorldContext';
import { toast } from 'sonner';
import { Plus, Loader2, Globe, Users, TrendingUp, Play, Trash2 } from 'lucide-react';

export const WorldsPage = () => {
  const [worlds, setWorlds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newWorldName, setNewWorldName] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const navigate = useNavigate();
  const { setCurrentWorld } = useWorld();

  useEffect(() => {
    fetchWorlds();
  }, []);

  const fetchWorlds = async () => {
    try {
      const response = await axios.get(`${API}/worlds`);
      setWorlds(response.data);
    } catch (error) {
      toast.error('Failed to load worlds');
    } finally {
      setLoading(false);
    }
  };

  const createWorld = async () => {
    if (!newWorldName.trim()) {
      toast.error('Please enter a world name');
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post(`${API}/worlds`, { name: newWorldName });
      toast.success('World created with 100 agents!');
      setWorlds([...worlds, response.data]);
      setNewWorldName('');
      setOpenDialog(false);
    } catch (error) {
      toast.error('Failed to create world');
    } finally {
      setCreating(false);
    }
  };

  const enterWorld = (world) => {
    setCurrentWorld(world);
    navigate('/dashboard');
  };

  const deleteWorld = async (worldId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this world?')) return;

    try {
      await axios.delete(`${API}/worlds/${worldId}`);
      toast.success('World deleted');
      setWorlds(worlds.filter(w => w.id !== worldId));
    } catch (error) {
      toast.error('Failed to delete world');
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
    <div className="min-h-screen p-8" data-testid="worlds-page">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-white mb-2" data-testid="worlds-title">YOUR WORLDS</h1>
            <p className="text-[#8C92A6]">Select or create a simulation world</p>
          </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button
                data-testid="create-world-button"
                className="bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/50 hover:bg-[#00F0FF] hover:text-black hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all font-mono uppercase"
              >
                <Plus className="mr-2" />
                NEW WORLD
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-white/20" data-testid="create-world-dialog">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-[#00F0FF]">CREATE NEW WORLD</DialogTitle>
                <DialogDescription className="text-[#8C92A6]">
                  Create a new simulation with 100 AI agents
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="worldName" className="text-white">World Name</Label>
                  <Input
                    id="worldName"
                    data-testid="world-name-input"
                    value={newWorldName}
                    onChange={(e) => setNewWorldName(e.target.value)}
                    placeholder="Enter world name..."
                    className="bg-black/60 border-white/20 text-white mt-2"
                  />
                </div>
                <Button
                  data-testid="confirm-create-world-button"
                  onClick={createWorld}
                  disabled={creating}
                  className="w-full bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/50 hover:bg-[#00F0FF] hover:text-black"
                >
                  {creating ? <Loader2 className="animate-spin" /> : 'CREATE WORLD'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {worlds.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="w-24 h-24 text-[#00F0FF]/30 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">No worlds yet</h3>
            <p className="text-[#8C92A6] mb-6">Create your first simulation world to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {worlds.map((world) => (
              <Card
                key={world.id}
                data-testid={`world-card-${world.id}`}
                className="glass-panel hover:border-[#00F0FF]/40 transition-all cursor-pointer group"
                onClick={() => enterWorld(world)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-bold text-white group-hover:text-[#00F0FF] transition-colors" data-testid="world-name">
                        {world.name}
                      </CardTitle>
                      <CardDescription className="text-[#5A607A] text-sm mt-1">
                        Created {new Date(world.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`delete-world-button-${world.id}`}
                      onClick={(e) => deleteWorld(world.id, e)}
                      className="text-[#FF003C] hover:bg-[#FF003C]/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-[#8C92A6]">
                    <Users className="w-4 h-4" />
                    <span className="font-mono text-sm">Population: {world.population || 0}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#8C92A6]">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-mono text-sm">Happiness: {world.average_happiness || 70}%</span>
                  </div>
                  <Button
                    data-testid={`enter-world-button-${world.id}`}
                    className="w-full mt-4 bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/50 hover:bg-[#00F0FF] hover:text-black"
                    onClick={(e) => {
                      e.stopPropagation();
                      enterWorld(world);
                    }}
                  >
                    <Play className="mr-2 w-4 h-4" />
                    ENTER WORLD
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
