import React, { useState, useEffect } from 'react';
import { api, Notification } from '@/lib/api';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const typeIcon: Record<string, string> = { success: '✓', warning: '⚠', error: '✕', info: 'ℹ' };
const typeColor: Record<string, string> = {
  success: 'text-green-400 bg-green-500/10',
  warning: 'text-yellow-400 bg-yellow-500/10',
  error: 'text-red-400 bg-red-500/10',
  info: 'text-blue-400 bg-blue-500/10',
};

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await api.markRead(id);
    load();
  };

  const markAll = async () => {
    await api.markAllRead();
    load();
  };

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unread} unread</p>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="outline" onClick={markAll} className="h-8 text-xs">
            <Check className="h-3.5 w-3.5 mr-1" />Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id}
              className={`border rounded-lg p-4 transition-all ${!n.isRead ? 'border-purple-500/30 bg-purple-500/5' : 'border-border bg-card'}`}
              onClick={() => !n.isRead && markRead(n.id)}>
              <div className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${typeColor[n.type] || typeColor.info}`}>
                  {typeIcon[n.type] || 'ℹ'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${!n.isRead ? '' : 'text-muted-foreground'}`}>{n.title}</p>
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
