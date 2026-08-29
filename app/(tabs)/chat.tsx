import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDoctorAuth } from "@/lib/health/DoctorAuthContext";
import { commonStyles } from "@/components/health/ui";

const CHAT_HISTORY_KEY = "rural-health-access.chat-history.v1";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageTag = "urgent" | "referral" | "medicine" | "general";

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderInitials: string;
  text: string;
  timestamp: number;
  tag?: MessageTag;
};

const TAG_LABELS: Record<MessageTag, string> = {
  urgent: "🔴 Urgent",
  referral: "📋 Referral",
  medicine: "💊 Medicine",
  general: "💬 General",
};

const TAG_COLORS: Record<MessageTag, string> = {
  urgent: "#B42318",
  referral: "#087E7B",
  medicine: "#7B4F9A",
  general: "#4F6F7B",
};

const TAG_BG: Record<MessageTag, string> = {
  urgent: "#FDECEC",
  referral: "#E6F5F3",
  medicine: "#F5EEFF",
  general: "#EAF3F6",
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h > 12 ? h - 12 : h || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

function formatDateHeader(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function avatarColor(initials: string): string {
  const colors = ["#087E7B", "#B66A00", "#7B4F9A", "#1B6B93", "#5A7B18", "#2E7D32"];
  const charSum = initials.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[charSum % colors.length];
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
      {!isMine && (
        <View style={[styles.avatar, { backgroundColor: avatarColor(msg.senderInitials) }]}>
          <Text style={styles.avatarText}>{msg.senderInitials}</Text>
        </View>
      )}
      <View style={[styles.bubble, isMine && styles.bubbleMine]}>
        {!isMine && (
          <View style={styles.senderHeader}>
            <Text style={styles.senderName}>{msg.senderName}</Text>
            {msg.senderRole ? <Text style={styles.senderRole}> · {msg.senderRole}</Text> : null}
          </View>
        )}
        {msg.tag && (
          <View style={[styles.tagPill, { backgroundColor: TAG_BG[msg.tag] }]}>
            <Text style={[styles.tagText, { color: TAG_COLORS[msg.tag] }]}>
              {TAG_LABELS[msg.tag]}
            </Text>
          </View>
        )}
        <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{msg.text}</Text>
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, isMine && styles.timeTextMine]}>
            {formatTime(msg.timestamp)}
          </Text>
          {isMine && <Text style={styles.checkmark}> ✓✓</Text>}
        </View>
      </View>
      {isMine && (
        <View style={[styles.avatar, { backgroundColor: avatarColor(msg.senderInitials) }]}>
          <Text style={styles.avatarText}>{msg.senderInitials}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { doctor } = useDoctorAuth();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [inputText, setInputText] = useState("");
  const [selectedTag, setSelectedTag] = useState<MessageTag | undefined>(undefined);
  const [showTagPicker, setShowTagPicker] = useState(false);

  // ── Load persisted history on mount ──
  useEffect(() => {
    async function loadHistory() {
      try {
        const raw = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Message[];
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load chat history", e);
      } finally {
        setLoaded(true);
      }
    }
    void loadHistory();
  }, []);

  // ── Persist whenever messages change (after initial load) ──
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages)).catch((e) =>
      console.error("Failed to save chat history", e),
    );
  }, [messages, loaded]);

  const myId = doctor?.id ?? doctor?.doctorId ?? "doc-active";
  const myName = doctor?.name ?? "Attending Healthcare Worker";
  const myRole = doctor?.specialization ?? "Medical Staff";
  const myInitials = myName
    .replace(/^Dr\.\s*/i, "")
    .trim()
    .slice(0, 2)
    .toUpperCase() || "HW";

  const sendMessage = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: myId,
      senderName: myName,
      senderRole: myRole,
      senderInitials: myInitials,
      text,
      timestamp: Date.now(),
      tag: selectedTag,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setSelectedTag(undefined);
    setShowTagPicker(false);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [inputText, myId, myName, myRole, myInitials, selectedTag]);

  const TAGS: MessageTag[] = ["urgent", "referral", "medicine", "general"];

  return (
    <KeyboardAvoidingView
      style={commonStyles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.channelDot} />
          <View>
            <Text style={styles.headerTitle}>Clinical Staff Channel</Text>
            <Text style={styles.headerSub}>
              {doctor?.facilityName || "Nandipur Primary Health Centre"} · Team Chat
            </Text>
          </View>
        </View>
        <View style={styles.onlinePill}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Active</Text>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, messages.length === 0 && styles.listEmpty]}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            listRef.current?.scrollToEnd({ animated: false });
          }
        }}
        renderItem={({ item }) => (
          <MessageBubble msg={item} isMine={item.senderId === myId} />
        )}
        ListEmptyComponent={
          loaded ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="forum" size={38} color="#087E7B" />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyBody}>
                Start the communication thread. Healthcare workers and staff can exchange live patient notes, shift updates, and clinical alerts.
              </Text>
              <View style={styles.emptyHint}>
                <MaterialIcons name="verified-user" size={14} color="#087E7B" />
                <Text style={styles.emptyHintText}>
                  All conversation history is securely recorded and persisted.
                </Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Tag picker (slides up when label icon tapped) */}
      {showTagPicker && (
        <View style={styles.tagPicker}>
          <Text style={styles.tagPickerLabel}>Tag this clinical note:</Text>
          <View style={styles.tagRow}>
            {TAGS.map((tag) => {
              const active = selectedTag === tag;
              return (
                <Pressable
                  key={tag}
                  onPress={() => setSelectedTag(active ? undefined : tag)}
                  style={[
                    styles.tagOption,
                    {
                      backgroundColor: active ? TAG_BG[tag] : "#F2F6F4",
                      borderColor: active ? TAG_COLORS[tag] : "#D5E1DD",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagOptionText,
                      active && { color: TAG_COLORS[tag], fontWeight: "900" },
                    ]}
                  >
                    {TAG_LABELS[tag]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          onPress={() => setShowTagPicker((v) => !v)}
          style={[styles.iconBtn, showTagPicker && styles.iconBtnActive]}
          accessibilityLabel="Tag message"
        >
          <MaterialIcons
            name={showTagPicker ? "close" : "label-outline"}
            size={22}
            color={showTagPicker ? "#087E7B" : "#6C817C"}
          />
        </Pressable>

        {selectedTag && (
          <View style={[styles.activeTag, { backgroundColor: TAG_BG[selectedTag] }]}>
            <Text style={[styles.activeTagText, { color: TAG_COLORS[selectedTag] }]}>
              {TAG_LABELS[selectedTag]}
            </Text>
          </View>
        )}

        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a clinical note or message..."
          placeholderTextColor="#8CA19B"
          multiline
          style={styles.textInput}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />

        <Pressable
          onPress={sendMessage}
          disabled={!inputText.trim()}
          style={({ pressed }) => [
            styles.sendBtn,
            { opacity: !inputText.trim() ? 0.35 : pressed ? 0.75 : 1 },
          ]}
          accessibilityLabel="Send message"
        >
          <MaterialIcons name="send" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#E4EDE9",
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    elevation: 2,
    shadowColor: "#18332F",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  channelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#087E7B",
  },
  headerTitle: {
    color: "#18332F",
    fontSize: 17,
    fontWeight: "900",
  },
  headerSub: {
    color: "#6C817C",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E6F5F3",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C0E4E2",
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#12A875",
  },
  onlineText: {
    color: "#087E7B",
    fontSize: 11,
    fontWeight: "800",
  },
  list: {
    padding: 14,
    paddingBottom: 16,
    gap: 8,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    maxWidth: 420,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#E6F5F3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#C0E4E2",
  },
  emptyTitle: {
    color: "#18332F",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyBody: {
    color: "#54716B",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F6F4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D5E1DD",
  },
  emptyHintText: {
    color: "#54716B",
    fontSize: 11,
    fontWeight: "700",
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 4,
  },
  msgRowMine: {
    justifyContent: "flex-end",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  bubble: {
    maxWidth: "78%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E4EDE9",
    shadowColor: "#18332F",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bubbleMine: {
    backgroundColor: "#087E7B",
    borderRadius: 16,
    borderBottomRightRadius: 4,
    borderColor: "#065A57",
  },
  senderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  senderName: {
    color: "#087E7B",
    fontSize: 12,
    fontWeight: "900",
  },
  senderRole: {
    color: "#6C817C",
    fontSize: 11,
    fontWeight: "600",
  },
  tagPill: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "900",
  },
  msgText: {
    color: "#18332F",
    fontSize: 14,
    lineHeight: 20,
  },
  msgTextMine: {
    color: "#FFFFFF",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 4,
    gap: 2,
  },
  timeText: {
    color: "#8CA19B",
    fontSize: 10,
  },
  timeTextMine: {
    color: "rgba(255,255,255,0.7)",
  },
  checkmark: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
  },
  tagPicker: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E4EDE9",
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tagPickerLabel: {
    color: "#6C817C",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  tagOption: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  tagOptionText: {
    color: "#6C817C",
    fontSize: 12,
    fontWeight: "800",
  },
  inputBar: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E4EDE9",
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F2F6F4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D5E1DD",
    flexShrink: 0,
  },
  iconBtnActive: {
    backgroundColor: "#E6F5F3",
    borderColor: "#087E7B",
  },
  activeTag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
    alignSelf: "center",
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: "900",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F7FAF9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D5E1DD",
    paddingHorizontal: 13,
    paddingTop: 10,
    paddingBottom: 10,
    color: "#18332F",
    fontSize: 14,
    maxHeight: 110,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#087E7B",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: "#087E7B",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});
