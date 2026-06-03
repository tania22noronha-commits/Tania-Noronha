import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Zap, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const ParticleField = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 10,
      duration: 10 + Math.random() * 10,
      size: 1 + Math.random() * 2
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute particle"
          style={{
            left: particle.left,
            bottom: 0,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`
          }}
        />
      ))}
    </div>
  );
};

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: `
        radial-gradient(circle at 20% 30%, rgba(0, 240, 255, 0.15) 0%, transparent 40%),
        radial-gradient(circle at 80% 70%, rgba(255, 0, 60, 0.15) 0%, transparent 40%),
        radial-gradient(circle at 50% 50%, rgba(0, 255, 102, 0.08) 0%, transparent 50%),
        #050505
      `
    }}>
      {/* Particle Field */}
      <ParticleField />
      
      {/* Scan Lines */}
      <div className="fixed inset-0 scan-lines pointer-events-none z-10"></div>
      
      {/* Hexagon Pattern */}
      <div className="hex-pattern"></div>

      {/* Animated borders */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF003C] to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-[#00FF66] to-transparent animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-[#FFB000] to-transparent animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8">
          {/* Animated Icon */}
          <motion.div 
            className="flex items-center justify-center gap-2 mb-6"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 1, type: "spring" }}
          >
            <div className="relative">
              <Zap className="w-16 h-16 text-[#00F0FF] glow-cyan" />
              <div className="absolute inset-0 w-16 h-16 animate-ping">
                <Zap className="w-16 h-16 text-[#00F0FF] opacity-30" />
              </div>
            </div>
          </motion.div>

          {/* Main Title */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="space-y-4"
          >
            <h1 
              className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter gradient-text relative"
              data-testid="landing-title"
            >
              AI CITY OF AGENTS
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00F0FF] via-[#FF003C] to-[#00FF66] opacity-20 blur-3xl -z-10"></div>
            </h1>
            
            <motion.div
              className="relative inline-block"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Activity className="w-8 h-8 text-[#00FF66] mx-auto" />
            </motion.div>

            <p className="text-xl sm:text-2xl text-[#8C92A6] max-w-3xl mx-auto leading-relaxed">
              Watch a <span className="text-[#00F0FF] font-bold neon-text-cyan">living civilization</span> evolve in real time. 
              Autonomous AI agents live, work, build relationships, and create emergent stories.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8"
          >
            <Button
              data-testid="landing-get-started-button"
              onClick={() => navigate('/auth')}
              size="lg"
              className="relative bg-[#00F0FF]/10 text-[#00F0FF] border-2 border-[#00F0FF]/50 hover:bg-[#00F0FF] hover:text-black hover:shadow-[0_0_40px_rgba(0,240,255,0.6)] transition-all font-mono uppercase text-lg px-8 py-6 rounded-lg glow-cyan group overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                <Play className="mr-2" />
                START SIMULATION
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF]/0 via-[#00F0FF]/30 to-[#00F0FF]/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </Button>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16"
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -10 }}
              className="glass-panel p-6 hover:border-[#00F0FF]/40 transition-all relative tech-corners scan-lines holographic"
              data-testid="landing-feature-1"
            >
              <div className="absolute top-2 right-2 w-2 h-2 bg-[#00F0FF] rounded-full animate-pulse"></div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-[#00F0FF] mb-3 neon-text-cyan">100 AI AGENTS</h3>
                <p className="text-[#8C92A6]">Each with unique personalities, goals, emotions, and memories that shape their decisions.</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, y: -10 }}
              className="glass-panel p-6 hover:border-[#FF003C]/40 transition-all relative tech-corners scan-lines holographic"
              data-testid="landing-feature-2"
            >
              <div className="absolute top-2 right-2 w-2 h-2 bg-[#FF003C] rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-[#FF003C] mb-3 neon-text-red">EMERGENT STORIES</h3>
                <p className="text-[#8C92A6]">No scripted narratives. Watch unique stories unfold from natural agent interactions.</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, y: -10 }}
              className="glass-panel p-6 hover:border-[#00FF66]/40 transition-all relative tech-corners scan-lines holographic"
              data-testid="landing-feature-3"
            >
              <div className="absolute top-2 right-2 w-2 h-2 bg-[#00FF66] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-[#00FF66] mb-3">GOD MODE</h3>
                <p className="text-[#8C92A6]">Trigger world events, create disasters, or boost the economy and watch agents adapt.</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="flex flex-wrap justify-center gap-8 pt-12 text-sm font-mono"
          >
            <div className="text-center data-stream">
              <div className="text-3xl font-black text-[#00F0FF] mb-1">100+</div>
              <div className="text-[#8C92A6]">AI AGENTS</div>
            </div>
            <div className="text-center data-stream" style={{ animationDelay: '0.3s' }}>
              <div className="text-3xl font-black text-[#FF003C] mb-1">∞</div>
              <div className="text-[#8C92A6]">EMERGENT STORIES</div>
            </div>
            <div className="text-center data-stream" style={{ animationDelay: '0.6s' }}>
              <div className="text-3xl font-black text-[#00FF66] mb-1">24/7</div>
              <div className="text-[#8C92A6]">LIVE SIMULATION</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
