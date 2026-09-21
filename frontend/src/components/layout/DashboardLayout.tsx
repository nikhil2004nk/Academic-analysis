import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Menu } from 'lucide-react';
import { Button } from '../ui/button';
import { Sidebar } from './Sidebar';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background relative">
      {/* Sidebar */}
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Background gradient decorative */}
        <div className="absolute top-0 right-0 w-1/2 h-64 bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 glass sticky top-0 z-20 bg-background/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
              <Menu className="w-6 h-6 text-white" />
            </Button>
            <h1 className="text-xl font-bold text-primary">Academics</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="w-5 h-5 text-red-400" />
          </Button>
        </header>

        <div className="flex-1 overflow-auto p-6 lg:p-10 z-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
