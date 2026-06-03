import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { API } from '@/utils/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const data = isLogin ? { email, password } : { email, password, username };
      
      const response = await axios.post(`${API}${endpoint}`, data);
      
      login(response.data.user, response.data.token);
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
      navigate('/worlds');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'radial-gradient(circle at 30% 40%, rgba(0, 240, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(255, 0, 60, 0.1) 0%, transparent 50%), #050505'
    }}>
      <Card className="w-full max-w-md glass-panel border-white/20" data-testid="auth-card">
        <CardHeader className="space-y-2">
          <CardTitle className="text-4xl font-black tracking-tighter text-center neon-text-cyan" data-testid="auth-title">
            AI CITY OF AGENTS
          </CardTitle>
          <CardDescription className="text-center text-[#8C92A6] text-base">
            {isLogin ? 'Enter the simulation' : 'Create your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">Username</Label>
                <Input
                  id="username"
                  data-testid="auth-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="bg-black/60 border-white/20 text-white focus:border-[#00F0FF]/50"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                data-testid="auth-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/60 border-white/20 text-white focus:border-[#00F0FF]/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                data-testid="auth-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-black/60 border-white/20 text-white focus:border-[#00F0FF]/50"
              />
            </div>
            <Button
              type="submit"
              data-testid="auth-submit-button"
              disabled={loading}
              className="w-full bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/50 hover:bg-[#00F0FF] hover:text-black hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all font-mono uppercase text-sm"
            >
              {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'LOGIN' : 'REGISTER')}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              data-testid="auth-toggle-button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#00F0FF] hover:underline text-sm"
            >
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
