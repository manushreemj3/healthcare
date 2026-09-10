import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUserAuth } from "@/lib/health/DoctorAuthContext";
import { useChatRealtime } from "@/lib/health/useChatRealtime";
import { getApiBaseUrl } from "@/constants/oauth";
import { getSessionToken } from "@/lib/_core/auth";
import { ensureServerSession } from "@/lib/health/userAuth";
import { commonStyles } from "@/components/health/ui";

type Contact = { id: number; name: string; role: string };
const roleName = (role: string) => role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const timeName = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function ChatScreen() {
  const { user } = useUserAuth();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { messages, loaded, connectionState, error: chatError, send } = useChatRealtime(
    conversationId,
    currentUserId && user ? { id: String(currentUserId), name: user.name, role: user.role } : null,
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const baseUrl = getApiBaseUrl();
        if (!baseUrl) throw new Error("Healthcare API server is not configured.");

        let token = await getSessionToken();
        if (!token && user) {
          token = await ensureServerSession(user);
        }
        if (!token) throw new Error("Sign in with a connected account to use chat.");

        const facilityParam = user?.facilityId ? `?facilityId=${encodeURIComponent(user.facilityId)}` : "";
        let response = await fetch(`${baseUrl}/api/auth/chat-contacts${facilityParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok && response.status === 401 && user) {
          const refreshed = await ensureServerSession(user);
          if (refreshed) {
            token = refreshed;
            response = await fetch(`${baseUrl}/api/auth/chat-contacts${facilityParam}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        }

        if (!response.ok) throw new Error("Unable to load healthcare contacts.");
        const data = (await response.json()) as { userId: number; contacts: Contact[] };
        if (!cancelled) {
          setCurrentUserId(data.userId);
          setContacts(data.contacts);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load contacts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [user]);

  const openConversation = useCallback(async (contact: Contact) => {
    if (!currentUserId) {
      setError("Your chat profile is still loading. Please try again.");
      return;
    }
    setBusy(true); setError(null);
    try {
      // The stable, sorted channel name gives each staff pair a private thread.
      const participantIds = [currentUserId, contact.id].sort((a, b) => a - b);
      setSelected(contact);
      setConversationId(`direct-${participantIds[0]}-${participantIds[1]}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to open conversation"); }
    finally { setBusy(false); }
  }, [currentUserId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || busy || !conversationId) return;
    setBusy(true); setError(null);
    try { await send(input); setInput(""); setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Message could not be sent"); }
    finally { setBusy(false); }
  }, [busy, conversationId, input, send]);

  const activeError = error || chatError;
  return <KeyboardAvoidingView style={commonStyles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View><Text style={styles.title}>{selected?.name || "Chat"}</Text><Text style={styles.subtitle}>{selected ? `${roleName(selected.role)} · ${connectionState === "open" ? "Online" : "Connecting"}` : "Private clinical conversations"}</Text></View>
      {selected ? <Pressable onPress={() => { setSelected(null); setConversationId(null); }} accessibilityLabel="Back to contacts"><MaterialIcons name="arrow-back" size={24} color="#087E7B" /></Pressable> : null}
    </View>
    {!selected ? <FlatList data={contacts} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.contacts} ListHeaderComponent={<Text style={styles.section}>Choose a healthcare contact</Text>} ListEmptyComponent={<Text style={styles.muted}>{loading ? "Loading contacts..." : "No authorized contacts found at your facility."}</Text>} renderItem={({ item }) => <Pressable style={styles.contact} onPress={() => void openConversation(item)} disabled={busy}><View style={styles.avatar}><Text style={styles.avatarText}>{item.name.slice(0, 2).toUpperCase()}</Text></View><View style={styles.contactText}><Text style={styles.contactName}>{item.name}</Text><Text style={styles.contactRole}>{roleName(item.role)}</Text></View><MaterialIcons name="chevron-right" size={24} color="#8CA19B" /></Pressable>} /> : <><FlatList ref={listRef} data={messages} keyExtractor={(item) => item.id} contentContainerStyle={[styles.messages, !messages.length && styles.empty]} onContentSizeChange={() => messages.length > 0 && listRef.current?.scrollToEnd({ animated: false })} ListEmptyComponent={<Text style={styles.muted}>{loaded ? "No messages yet. Start the conversation." : "Loading messages..."}</Text>} renderItem={({ item }) => { const mine = item.senderId === String(currentUserId); return <View style={[styles.row, mine && styles.rowMine]}><View style={[styles.bubble, mine && styles.bubbleMine]}><Text style={[styles.message, mine && styles.messageMine]}>{item.text}</Text><Text style={[styles.time, mine && styles.timeMine]}>{timeName(item.timestamp)}</Text></View></View>; }} /><View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}><TextInput value={input} onChangeText={setInput} placeholder="Type a message..." placeholderTextColor="#8CA19B" multiline style={styles.input} editable={!busy} onSubmitEditing={() => { if (Platform.OS === "web") void sendMessage(); }} blurOnSubmit={false} /><Pressable onPress={() => void sendMessage()} disabled={!input.trim() || busy} style={[styles.send, (!input.trim() || busy) && styles.disabled]} accessibilityLabel="Send message"><MaterialIcons name="send" size={20} color="#FFFFFF" /></Pressable></View></>}
    {activeError ? <Text style={styles.error}>{activeError}</Text> : null}
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  header: { backgroundColor: "#FFFFFF", borderBottomColor: "#E4EDE9", borderBottomWidth: 1, paddingHorizontal: 18, paddingBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#18332F", fontSize: 19, fontWeight: "900" }, subtitle: { color: "#6C817C", fontSize: 12, fontWeight: "700", marginTop: 3 }, section: { color: "#18332F", fontSize: 16, fontWeight: "900", marginBottom: 5 }, contacts: { padding: 16, gap: 10 }, contact: { backgroundColor: "#FFFFFF", borderColor: "#E4EDE9", borderWidth: 1, padding: 13, flexDirection: "row", alignItems: "center", borderRadius: 12 }, avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#087E7B", alignItems: "center", justifyContent: "center" }, avatarText: { color: "#FFFFFF", fontWeight: "900" }, contactText: { flex: 1, marginLeft: 12 }, contactName: { color: "#18332F", fontSize: 15, fontWeight: "800" }, contactRole: { color: "#6C817C", fontSize: 12, marginTop: 3 }, messages: { padding: 14, gap: 8 }, empty: { flexGrow: 1, justifyContent: "center" }, row: { alignItems: "flex-start" }, rowMine: { alignItems: "flex-end" }, bubble: { maxWidth: "80%", backgroundColor: "#FFFFFF", borderColor: "#E4EDE9", borderWidth: 1, borderRadius: 15, borderBottomLeftRadius: 4, paddingHorizontal: 13, paddingVertical: 9 }, bubbleMine: { backgroundColor: "#087E7B", borderColor: "#087E7B", borderBottomLeftRadius: 15, borderBottomRightRadius: 4 }, message: { color: "#18332F", fontSize: 14, lineHeight: 20 }, messageMine: { color: "#FFFFFF" }, time: { color: "#6C817C", fontSize: 10, alignSelf: "flex-end", marginTop: 4 }, timeMine: { color: "#D5F1ED" }, inputBar: { backgroundColor: "#FFFFFF", borderTopColor: "#E4EDE9", borderTopWidth: 1, paddingTop: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "flex-end", gap: 8 }, input: { flex: 1, maxHeight: 110, backgroundColor: "#F2F6F4", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, color: "#18332F", fontSize: 14 }, send: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#087E7B", alignItems: "center", justifyContent: "center" }, disabled: { opacity: 0.35 }, muted: { color: "#6C817C", textAlign: "center", padding: 20 }, error: { color: "#B42318", backgroundColor: "#FDECEC", padding: 10, textAlign: "center", fontSize: 12 },
});
