import React from 'react';
import { useWorld } from '@/context/WorldContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Info } from 'lucide-react';

export const SettingsPage = () => {
  const { currentWorld } = useWorld();

  return (
    <div className="min-h-screen p-6" data-testid="settings-page">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-black tracking-tighter text-white mb-6">SETTINGS</h1>

        <div className="space-y-6">
          {/* World Info */}
          <Card className="glass-panel" data-testid="world-info-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-[#00F0FF]" />
                CURRENT WORLD
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#8C92A6]">World Name</span>
                <span className="text-white font-bold">{currentWorld?.name || 'No world selected'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8C92A6]">World ID</span>
                <span className="text-white font-mono text-sm">{currentWorld?.id || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8C92A6]">Created</span>
                <span className="text-white">
                  {currentWorld ? new Date(currentWorld.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8C92A6]">Population</span>
                <Badge variant="outline" className="border-[#00F0FF]/30 text-[#00F0FF]">
                  {currentWorld?.population || 0} agents
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* App Info */}
          <Card className="glass-panel" data-testid="app-info-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#00FF66]" />
                APPLICATION INFO
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#8C92A6]">Version</span>
                <span className="text-white font-mono">1.0.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8C92A6]">AI Models</span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-[#00F0FF]/30 text-[#00F0FF] text-xs">GPT-5.2</Badge>
                  <Badge variant="outline" className="border-[#FF003C]/30 text-[#FF003C] text-xs">Claude</Badge>
                  <Badge variant="outline" className="border-[#00FF66]/30 text-[#00FF66] text-xs">Gemini</Badge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8C92A6]">Simulation Type</span>
                <span className="text-white">Real-time Agent-based</span>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card className="glass-panel" data-testid="about-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">ABOUT AI CITY OF AGENTS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[#8C92A6] leading-relaxed">
                AI City of Agents is a living simulation where autonomous AI agents make decisions,
                form relationships, build businesses, and create emergent stories. Each agent has unique
                personalities, goals, and memories that shape their behavior.
              </p>
              <p className="text-[#8C92A6] leading-relaxed">
                The simulation uses advanced AI models (GPT-5.2, Claude Sonnet 4.5, and Gemini 3 Flash)
                to power agent decision-making and story generation, creating an ever-evolving digital society.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
