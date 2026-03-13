import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { useAgent, useChatHistory, useSendMessage } from '@/lib/hooks';
import { sessionsDb } from '@/lib/db';

export default function AgentChatTab() {
    const { id: agentId } = useLocalSearchParams<{ id: string }>();
    const [inputText, setInputText] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    // Convex hooks
    const agent = useAgent(agentId as any);
    const messages = useChatHistory(agentId as any, sessionId || undefined);
    const sendMessage = useSendMessage();

    useEffect(() => {
        // Create or get session
        if (agentId && !sessionId) {
            sessionsDb.create(agentId).then(setSessionId);
        }
    }, [agentId, sessionId]);

    const scrollToBottom = useCallback(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleSend = async () => {
        if (!inputText.trim() || !agentId || !sessionId) return;

        const text = inputText.trim();
        setInputText('');
        setIsTyping(true);

        try {
            // Send via Convex mutation
            await sendMessage({
                agentId: agentId as any,
                content: text,
                sessionId,
            });
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setIsTyping(false);
        }
    };

    // Loading state
    if (agent === undefined) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // Agent not found
    if (!agent) {
        return (
            <View style={styles.container}>
                <View style={styles.error}>
                    <Ionicons name="alert-circle" size={48} color="#FF3B30" />
                    <Text style={styles.errorText}>Agent not found</Text>
                </View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={[]}>
            {/* Messages */}
            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messages}
                    contentContainerStyle={styles.messagesContent}
                    onContentSizeChange={scrollToBottom}
                    showsVerticalScrollIndicator={false}
                >
                    {messages && messages.length === 0 && (
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>💬</Text>
                            <Text style={styles.emptyText}>
                                Start a conversation with {agent.name}
                            </Text>
                        </View>
                    )}

                    {messages && messages.map((message) => (
                        <MessageBubble key={message._id} message={message} />
                    ))}

                    {isTyping && (
                        <View style={styles.typingIndicator}>
                            <Text style={styles.typingText}>●●●</Text>
                        </View>
                    )}
                </ScrollView>

                {/* Input */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachButton}>
                        <Ionicons name="attach" size={24} color="#8E8E93" />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Message..."
                        placeholderTextColor="#8E8E93"
                        multiline
                        maxLength={4000}
                    />

                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            !inputText.trim() && styles.sendButtonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={!inputText.trim()}
                    >
                        <Ionicons name="arrow-up" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function MessageBubble({ message }: { message: any }) {
    const isUser = message.role === 'user';

    return (
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
            {isUser ? (
                <Text style={styles.bubbleTextUser}>{message.content}</Text>
            ) : (
                <Markdown style={markdownStyles}>{message.content}</Markdown>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    error: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    errorText: {
        fontSize: 18,
        color: '#000',
    },
    content: {
        flex: 1,
    },
    messages: {
        flex: 1,
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 24,
    },
    empty: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#8E8E93',
    },
    bubble: {
        maxWidth: '85%',
        padding: 12,
        borderRadius: 18,
        marginBottom: 8,
    },
    bubbleUser: {
        alignSelf: 'flex-end',
        backgroundColor: '#007AFF',
        borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
        alignSelf: 'flex-start',
        backgroundColor: '#F2F2F7',
        borderBottomLeftRadius: 4,
    },
    bubbleTextUser: {
        fontSize: 16,
        color: '#FFF',
        lineHeight: 22,
    },
    typingIndicator: {
        alignSelf: 'flex-start',
        padding: 12,
        backgroundColor: '#F2F2F7',
        borderRadius: 18,
    },
    typingText: {
        fontSize: 14,
        color: '#8E8E93',
        letterSpacing: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 8,
        paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
        backgroundColor: '#FFF',
        gap: 8,
    },
    attachButton: {
        padding: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 120,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#F2F2F7',
        borderRadius: 20,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    sendButtonDisabled: {
        backgroundColor: '#C7C7CC',
    },
});

const markdownStyles = StyleSheet.create({
    body: {
        fontSize: 16,
        color: '#000',
        lineHeight: 22,
    },
    heading1: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
    },
    heading2: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000',
        marginBottom: 6,
    },
    heading3: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    code_inline: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
        backgroundColor: '#E5E5EA',
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    code_block: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
        backgroundColor: '#1C1C1E',
        color: '#FFF',
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
    },
    fence: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
        backgroundColor: '#1C1C1E',
        color: '#FFF',
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
    },
    blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
        paddingLeft: 12,
        marginVertical: 8,
    },
    bullet_list: {
        marginVertical: 4,
    },
    ordered_list: {
        marginVertical: 4,
    },
    link: {
        color: '#007AFF',
        textDecorationLine: 'underline',
    },
});
