import { useGetNotifications, useMarkAllNotificationsRead, useMarkNotificationRead, getGetNotificationsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Check, BookOpen, Heart, MessageCircle, UserPlus, Info } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const iconMap: Record<string, any> = {
  new_chapter: BookOpen,
  new_follower: UserPlus,
  like: Heart,
  comment: MessageCircle,
  system: Info,
};

export default function Notifications() {
  const { data: notifications, isLoading } = useGetNotifications();
  const markAllRead = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined as any, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    });
  };

  const handleMarkRead = (id: number) => {
    markRead.mutate({ notificationId: id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="page-notifications">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold">Notifications</h1>
        {(notifications as any[])?.some((n: any) => !n.read) && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} data-testid="button-mark-all-read">
            <Check className="w-3 h-3 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : (notifications as any[])?.length ? (
        <div className="space-y-2">
          {(notifications as any[]).map((n: any) => {
            const Icon = iconMap[n.type] || Bell;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${n.read ? "border-border" : "border-foreground/20 bg-accent/30"}`}
                onClick={() => !n.read && handleMarkRead(n.id)}
                data-testid={`notification-${n.id}`}
              >
                <div className="mt-0.5 shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-foreground mt-2 shrink-0" />}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm mt-1">You're all caught up!</p>
        </div>
      )}
    </div>
  );
}
