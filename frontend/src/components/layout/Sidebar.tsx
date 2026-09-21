import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, Users, LogOut, ChevronLeft, ChevronRight, Key, ClipboardList, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ...(user?.role === 'superadmin' 
      ? [
          { name: 'User Management', href: '/superadmin/users', icon: Users },
          { name: 'Exams', href: '/superadmin/exams', icon: ClipboardList },
          { name: 'Marks Entry', href: '/superadmin/marks', icon: Edit3 },
        ]
      : []),
  ];

  return (
    <aside 
      className={cn(
        "glass-panel flex-col hidden md:flex sticky top-0 h-screen transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h1 className="text-2xl font-bold text-glow text-primary transition-opacity duration-300">Academics</h1>
            <p className="text-xs text-muted-foreground mt-1 tracking-wider uppercase">{user?.role} Portal</p>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 flex items-center justify-center font-bold text-primary text-xl">A</div>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-2 mt-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={cn(
                "flex items-center px-3 py-2.5 rounded-lg transition-all duration-300 font-medium text-sm group active:scale-95",
                isCollapsed ? "justify-center" : "gap-3",
                isActive 
                  ? "bg-primary/10 text-primary box-glow" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-colors shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/5 space-y-2">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white/5">
            <div className="w-8 h-8 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold" title={user?.name}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        )}
        
        <Button 
          variant="ghost" 
          className={cn(
            "w-full text-muted-foreground hover:text-white hover:bg-white/5",
            isCollapsed ? "justify-center px-0" : "justify-start"
          )} 
          onClick={() => setIsChangePasswordOpen(true)}
          title={isCollapsed ? "Change Password" : undefined}
        >
          <Key className={cn("w-4 h-4 shrink-0", !isCollapsed && "mr-2")} />
          {!isCollapsed && "Change Password"}
        </Button>

        <Button 
          variant="ghost" 
          className={cn(
            "w-full text-red-400 hover:text-red-300 hover:bg-red-400/10",
            isCollapsed ? "justify-center px-0" : "justify-start"
          )} 
          onClick={logout}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className={cn("w-4 h-4 shrink-0", !isCollapsed && "mr-2")} />
          {!isCollapsed && "Logout"}
        </Button>
        
        <Button
          variant="ghost"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full justify-center text-muted-foreground hover:text-white"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      <ChangePasswordModal 
        isOpen={isChangePasswordOpen} 
        onClose={() => setIsChangePasswordOpen(false)} 
      />
    </aside>
  );
}
