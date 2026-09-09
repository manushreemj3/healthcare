import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, authorizeSupabaseChat } from "@/lib/supabase";

export type ChatMessage = { id: string; senderId: string; text: string; timestamp: number };
export type ChatConnectionState = "idle" | "connecting" | "open" | "error";
type Row = { id: string; sender_id: number; content: string; created_at: string; read_at: string | null };

function toMessage(row: Row): ChatMessage {
  return { id: row.id, senderId: String(row.sender_id), text: row.content, timestamp: new Date(row.created_at).getTime() };
}

export function useChatRealtime(conversationId: string | null, currentUserId: number | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [connectionState, setConnectionState] = useState<ChatConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenIds = useRef(new Set<string>());

  const addMessages = useCallback((rows: Row[]) => {
    setMessages((current) => {
      const next = [...current];
      for (const row of rows) {
        if (seenIds.current.has(row.id)) continue;
        seenIds.current.add(row.id);
        next.push(toMessage(row));
      }
      next.sort((a, b) => a.timestamp - b.timestamp);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    seenIds.current = new Set();
    setMessages([]);
    setLoaded(false);
    setError(null);
    if (!conversationId) return undefined;

    async function connect() {
      setConnectionState("connecting");
      try {
        await authorizeSupabaseChat();
        const { data, error: queryError } = await supabase.from("messages").select("id,sender_id,content,created_at,read_at").eq("conversation_id", conversationId).order("created_at", { ascending: true });
        if (queryError) throw queryError;
        if (cancelled) return;
        addMessages((data ?? []) as Row[]);
        setUnreadCount((data ?? []).filter((row) => row.sender_id !== currentUserId && !row.read_at).length);
        await supabase.rpc("mark_conversation_read", { target_conversation: conversationId });
        setLoaded(true);
        channel = supabase.channel(`conversation:${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => addMessages([payload.new as Row])).subscribe((status) => {
          if (!cancelled) setConnectionState(status === "SUBSCRIBED" ? "open" : status === "CHANNEL_ERROR" ? "error" : "connecting");
        });
      } catch (cause) {
        if (!cancelled) {
          setLoaded(true);
          setConnectionState("error");
          setError(cause instanceof Error ? cause.message : "Unable to load this conversation");
        }
      }
    }
    void connect();
    return () => { cancelled = true; if (channel) void supabase.removeChannel(channel); };
  }, [addMessages, conversationId, currentUserId]);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!conversationId || !currentUserId || !content) return;
    const { data, error: insertError } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: currentUserId, content }).select("id,sender_id,content,created_at,read_at").single();
    if (insertError) throw insertError;
    if (data) addMessages([data as Row]);
  }, [addMessages, conversationId, currentUserId]);

  return { messages, loaded, connectionState, error, unreadCount, send };
}