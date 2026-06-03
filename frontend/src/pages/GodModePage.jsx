import React, { useState } from 'react';
import { useWorld } from '@/context/WorldContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Zap, TrendingDown, TrendingUp, CloudRain, Sun, Cpu, Home, Loader2 } from 'lucide-react';

export const GodModePage = () => {
  const { currentWorld } = useWorld();
  const [triggering, setTriggering] = useState(false);
  const navigate = useNavigate();

  if (!currentWorld) {
    navigate('/worlds');
    return null;
  }

  const triggerEvent = async (eventType, eventName) => {
    setTriggering(true);
    try {
      const response = await axios.post(`${API}/worlds/${currentWorld.id}/god-mode/${eventType}`);
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Failed to trigger event');
    } finally {
      setTriggering(false);
    }
  };

  const events = [
    {
      category: 'ECONOMY',
      color: '#FF003C',
      icon: TrendingDown,
      items: [
        { type: 'recession', name: 'Economic Recession', description: 'Trigger a recession. Wealth decreases by 20%.' },
        { type: 'boom', name: 'Economic Boom', description: 'Trigger an economic boom. Wealth increases by 30%.' },
      ]
    },
    {
      category: 'SOCIETY',
      color: '#00F0FF',
      icon: Sun,
      items: [
        { type: 'festival', name: 'City Festival', description: 'Boost happiness with a city-wide celebration.' },
        { type: 'pandemic', name: 'Pandemic', description: 'Health crisis. Happiness decreases significantly.' },
      ]
    },
    {
      category: 'TECHNOLOGY',
      color: '#00FF66',
      icon: Cpu,
      items: [
        { type: 'tech_breakthrough', name: 'Tech Breakthrough', description: 'Major innovation. Employment opportunities surge.' },
      ]
    },
    {
      category: 'INFRASTRUCTURE',
      color: '#FFB000',
      icon: Home,
      items: [
        { type: 'housing_crisis', name: 'Housing Crisis', description: 'Real estate prices soar. Stress increases.' },
      ]
    },
  ];

  return (
    <div className="min-h-screen p-6" data-testid="god-mode-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-black tracking-tighter text-white mb-2 flex items-center gap-4">
            <Zap className="w-12 h-12 text-[#FF003C] animate-pulse" />
            GOD MODE
          </h1>
          <p className="text-[#8C92A6] text-lg">Trigger world-changing events and watch agents adapt</p>
        </div>

        {events.map((category) => (
          <div key={category.category} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <category.icon className="w-6 h-6" style={{ color: category.color }} />
              <h2 className="text-2xl font-bold" style={{ color: category.color }}>
                {category.category}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.items.map((event) => (
                <Card
                  key={event.type}
                  data-testid={`god-mode-event-${event.type}`}
                  className="glass-panel hover:border-white/30 transition-all"
                >
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-white">{event.name}</CardTitle>
                    <CardDescription className="text-[#8C92A6] text-sm">
                      {event.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      data-testid={`trigger-${event.type}-button`}
                      onClick={() => triggerEvent(event.type, event.name)}
                      disabled={triggering}
                      className="w-full bg-[#FF003C]/10 text-[#FF003C] border border-[#FF003C]/50 hover:bg-[#FF003C] hover:text-black hover:shadow-[0_0_20px_rgba(255,0,60,0.4)] transition-all font-mono uppercase text-sm"
                    >
                      {triggering ? <Loader2 className="animate-spin" /> : 'TRIGGER EVENT'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        <Card className="glass-panel border-[#FF003C]/30 mt-8" data-testid="god-mode-warning">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Zap className="w-8 h-8 text-[#FF003C] flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-[#FF003C] mb-2">WARNING</h3>
                <p className="text-[#8C92A6]">
                  God mode events have permanent effects on your simulation. Agents will adapt to changes,
                  but some events may cause irreversible consequences. Use wisely.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
