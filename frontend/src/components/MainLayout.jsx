import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Map, Building2, Heart, Newspaper, BarChart3, Zap, Settings, LogOut, Globe } from 'lucide-react';

export const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/agents', icon: Users, label: 'Agents' },
    { to: '/map', icon: Map, label: 'City Map' },
    { to: '/economy', icon: Building2, label: 'Economy' },
    { to: '/relationships', icon: Heart, label: 'Relationships' },
    { to: '/stories', icon: Newspaper, label: 'Stories' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/god-mode', icon: Zap, label: 'God Mode' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#050505]/70 backdrop-blur-2xl border-r border-white/10 sticky top-0 h-screen overflow-y-auto scroll-hidden" data-testid="main-sidebar">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <Globe className="w-8 h-8 text-[#00F0FF]" />
            <h2 className="text-xl font-black tracking-tighter text-[#00F0FF]">AI CITY</h2>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30'
                      : 'text-[#8C92A6] hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 pt-8 border-t border-white/10">
            <div className="px-4 py-2 mb-4">
              <p className="text-xs text-[#5A607A] uppercase tracking-wider mb-1">Logged in as</p>
              <p className="text-sm text-white font-medium">{user?.username || user?.email}</p>
            </div>
            <Button
              data-testid="logout-button"
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-[#FF003C] hover:bg-[#FF003C]/10 hover:text-[#FF003C]"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};
