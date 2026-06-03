import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Zap } from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: `
        radial-gradient(circle at 20% 30%, rgba(0, 240, 255, 0.15) 0%, transparent 40%),
        radial-gradient(circle at 80% 70%, rgba(255, 0, 60, 0.15) 0%, transparent 40%),
        radial-gradient(circle at 50% 50%, rgba(0, 255, 102, 0.05) 0%, transparent 50%),
        #050505
      `
    }}>
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF003C] to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Zap className="w-12 h-12 text-[#00F0FF] animate-pulse" />
            </div>
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter" style={{
              background: 'linear-gradient(135deg, #00F0FF 0%, #FF003C 50%, #00FF66 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }} data-testid="landing-title">
              AI CITY OF AGENTS
            </h1>
            <p className="text-xl sm:text-2xl text-[#8C92A6] max-w-3xl mx-auto leading-relaxed">
              Watch a living civilization evolve in real time. Autonomous AI agents live, work, build relationships, and create emergent stories.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button
              data-testid="landing-get-started-button"
              onClick={() => navigate('/auth')}
              size="lg"
              className="bg-[#00F0FF]/10 text-[#00F0FF] border-2 border-[#00F0FF]/50 hover:bg-[#00F0FF] hover:text-black hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-all font-mono uppercase text-lg px-8 py-6 rounded-lg"
            >
              <Play className="mr-2" />
              START SIMULATION
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16">
            <div className="glass-panel p-6 hover:border-[#00F0FF]/40 transition-all" data-testid="landing-feature-1">
              <h3 className="text-2xl font-bold text-[#00F0FF] mb-3">100 AI AGENTS</h3>
              <p className="text-[#8C92A6]">Each with unique personalities, goals, emotions, and memories that shape their decisions.</p>
            </div>
            <div className="glass-panel p-6 hover:border-[#FF003C]/40 transition-all" data-testid="landing-feature-2">
              <h3 className="text-2xl font-bold text-[#FF003C] mb-3">EMERGENT STORIES</h3>
              <p className="text-[#8C92A6]">No scripted narratives. Watch unique stories unfold from natural agent interactions.</p>
            </div>
            <div className="glass-panel p-6 hover:border-[#00FF66]/40 transition-all" data-testid="landing-feature-3">
              <h3 className="text-2xl font-bold text-[#00FF66] mb-3">GOD MODE</h3>
              <p className="text-[#8C92A6]">Trigger world events, create disasters, or boost the economy and watch agents adapt.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
