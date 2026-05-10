import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Image as ImageIcon, MessageCircle, Loader2 } from "lucide-react";
import { ProfileAvatar } from "@/components/profile-avatar";
import { RequireAuth } from "@/components/require-auth";
import { cn } from "@/lib/utils";

interface Thread {
  id: number;
  other: { id: number; username: string; displayName?: string | null; avatar?: string | null; lastSeenAt?: string | null };
  lastMessage?: { content?: string | null; imageUrl?: string | null; createdAt: string; senderId: number };
  unreadCount: number;
}

interface Msg {
  id: number;
  senderId: number;
  content?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  read: boolean;
}

function ThreadItem({ thread, selected, onClick, currentUserId }: { thread: Thread; selected: boolean; onClick: () => void; currentUserId: number }) {
  const name = thread.other?.displayName || thread.other?.username || "?";
  const last = thread.lastMessage;
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent",
        selected && "bg-accent"
      )}
    >
      <ProfileAvatar src={thread.other?.avatar} name={name} xp={0} size="sm" showBadge={false} lastSeenAt={thread.other?.lastSeenAt} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">{name}</span>
          {thread.unreadCount > 0 && (
            <span className="ml-2 shrink-0 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold">
              {thread.unreadCount}
            </span>
          )}
        </div>
        {last && (
          <p className="text-xs text-muted-foreground truncate">
            {last.senderId === currentUserId ? "Vous : " : ""}
            {last.content || (last.imageUrl ? "📷 Image" : "")}
          </p>
        )}
      </div>
    </div>
  );
}

function ChatWindow({ thread, currentUserId, onBack }: { thread: Thread; currentUserId: number; onBack: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const name = thread.other?.displayName || thread.other?.username || "?";

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/messages/threads/${thread.id}`, { credentials: "include" });
      if (r.ok) setMessages(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [thread.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [thread.id]);

  const send = async (content?: string, imageUrl?: string) => {
    if ((!content?.trim() && !imageUrl) || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/messages/threads/${thread.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: content?.trim() || null, imageUrl: imageUrl || null }),
      });
      if (r.ok) {
        const msg = await r.json();
        setMessages(prev => [...prev, msg]);
        setText("");
      }
    } finally { setSending(false); }
  };

  const handleImage = async (file: File) => {
    const formData = new FormData();
    const metaRes = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    });
    if (!metaRes.ok) return;
    const { uploadURL, objectPath } = await metaRes.json();
    await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    send(undefined, `/api/storage${objectPath}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 h-14 border-b border-border flex items-center gap-3 px-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <ProfileAvatar src={thread.other?.avatar} name={name} xp={0} size="sm" showBadge={false} lastSeenAt={thread.other?.lastSeenAt} showOnline />
        <div>
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-[11px] text-muted-foreground">@{thread.other?.username}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
        {messages.map((m) => {
          const isMe = m.senderId === currentUserId;
          return (
            <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm break-words",
                  isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                )}
              >
                {m.imageUrl && <img src={m.imageUrl} alt="Image" className="rounded-lg max-w-[240px] mb-1" />}
                {m.content && <p>{m.content}</p>}
                <p className={cn("text-[10px] mt-0.5 opacity-60 text-right", isMe ? "text-primary-foreground" : "text-muted-foreground")}>
                  {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-3 py-2 flex items-end gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileRef.current?.click()}>
          <ImageIcon className="w-4 h-4" />
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f); e.target.value = ""; }} />
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
          placeholder="Message…"
          className="min-h-[40px] max-h-[120px] resize-none text-sm py-2"
          rows={1}
        />
        <Button size="icon" className="h-9 w-9 shrink-0" disabled={!text.trim() || sending} onClick={() => send(text)}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const params = useParams<{ threadId?: string }>();
  const [, setLocation] = useLocation();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [newRecipient, setNewRecipient] = useState("");
  const [startingDM, setStartingDM] = useState(false);

  const loadThreads = async () => {
    try {
      const r = await fetch("/api/messages/threads", { credentials: "include" });
      if (r.ok) {
        const data = await r.json();
        setThreads(data);
        if (params.threadId) {
          const t = data.find((th: Thread) => th.id === Number(params.threadId));
          if (t) setSelectedThread(t);
        }
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { loadThreads(); }, []);

  const startDM = async () => {
    if (!newRecipient.trim()) return;
    setStartingDM(true);
    try {
      const search = await fetch(`/api/users/search?q=${encodeURIComponent(newRecipient.trim())}`, { credentials: "include" });
      if (!search.ok) return;
      const users = await search.json();
      const target = users[0];
      if (!target) return;
      const r = await fetch("/api/messages/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientId: target.id }),
      });
      if (r.ok) {
        const thread = await r.json();
        await loadThreads();
        setSelectedThread({ ...thread, other: target, unreadCount: 0 });
        setNewRecipient("");
      }
    } finally { setStartingDM(false); }
  };

  if (!user) return <RequireAuth />;

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-64px)] flex border-x border-border">
      {/* Sidebar */}
      <div className={cn("w-full md:w-80 shrink-0 border-r border-border flex flex-col", selectedThread && "hidden md:flex")}>
        <div className="shrink-0 px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm mb-2">Messages</h2>
          <div className="flex gap-1">
            <Input
              placeholder="Nouveau message (@pseudo)…"
              value={newRecipient}
              onChange={e => setNewRecipient(e.target.value)}
              onKeyDown={e => e.key === "Enter" && startDM()}
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8 px-2 shrink-0" onClick={startDM} disabled={startingDM}>
              {startingDM ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}
          {!loading && threads.length === 0 && (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucun message.<br />Recherchez un utilisateur pour commencer.</p>
            </div>
          )}
          {threads.map(t => (
            <ThreadItem
              key={t.id}
              thread={t}
              selected={selectedThread?.id === t.id}
              onClick={() => setSelectedThread(t)}
              currentUserId={user.id}
            />
          ))}
        </div>
      </div>

      {/* Chat pane */}
      <div className={cn("flex-1 min-w-0", !selectedThread && "hidden md:flex md:items-center md:justify-center")}>
        {selectedThread ? (
          <ChatWindow
            thread={selectedThread}
            currentUserId={user.id}
            onBack={() => setSelectedThread(null)}
          />
        ) : (
          <div className="text-center text-muted-foreground">
            <MessageCircle className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Sélectionnez une conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
