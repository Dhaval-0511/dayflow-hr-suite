import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, User, LogOut, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { api, Notification } from '@/lib/api';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

const Header: React.FC = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refresh = async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch {}
  };

  useEffect(() => { refresh(); }, [user]);
  useEffect(() => {
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSignOut = () => { signOut(); navigate('/auth'); };

  const handleNotifClick = async (n: Notification) => {
    if (!n.isRead) { await api.markRead(n.id); refresh(); }
  };

  const handleMarkAll = async () => {
    await api.markAllRead(); refresh();
  };

  const iconForType = (t?: string) => {
    switch (t) { case 'success': return '✓'; case 'warning': return '⚠'; case 'error': return '✕'; default: return 'ℹ'; }
  };

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="font-semibold text-foreground">
          {getGreeting()}, {user?.firstName || 'User'}!
        </h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="w-56 pl-10 bg-muted/50 border-0 focus-visible:ring-1" />
        </div>

        <Popover open={notificationsOpen} onOpenChange={v => { setNotificationsOpen(v); if (v) refresh(); }}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-purple-600">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between p-4 border-b">
              <h4 className="font-semibold text-sm">Notifications</h4>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={handleMarkAll}>Mark all read</Button>
              )}
            </div>
            <ScrollArea className="h-[280px]">
              {notifications.length > 0 ? (
                <div className="divide-y divide-border">
                  {notifications.slice(0, 10).map(n => (
                    <div key={n.id}
                      className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}
                      onClick={() => handleNotifClick(n)}>
                      <div className="flex gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs flex-shrink-0">{iconForType(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${!n.isRead ? '' : 'text-muted-foreground'}`}>{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(n.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                          </p>
                        </div>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1" />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No notifications</p>
                </div>
              )}
            </ScrollArea>
            <div className="p-2 border-t">
              <Button variant="ghost" className="w-full text-xs" size="sm"
                onClick={() => { setNotificationsOpen(false); navigate('/notifications'); }}>
                View all notifications
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 pl-4 border-l border-border h-10">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium overflow-hidden">
                {user?.avatar
                  ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  : `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`
                }
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground font-mono">{user?.loginId}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/notifications')}>
              <Bell className="mr-2 h-4 w-4" />Notifications
              {unreadCount > 0 && <Badge variant="secondary" className="ml-auto text-xs">{unreadCount}</Badge>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
