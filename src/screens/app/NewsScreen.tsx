import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { NewsMessage } from '../../lib/types';
import BottomNav from '../../components/BottomNav';

export default function NewsScreen() {
    const navigation = useNavigation();
    const { session } = useAuthStore();
    const [messages, setMessages] = useState<NewsMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<ScrollView>(null);

    useFocusEffect(
        React.useCallback(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: false });
            fetchNews();
        }, [session])
    );

    const fetchNews = async () => {
        if (!session) return;
        setLoading(true);

        try {
            // 1. Fetch all news messages
            const { data: newsData, error: newsErr } = await supabase
                .from('news_messages')
                .select('*')
                .order('created_at', { ascending: false });

            if (newsErr) throw newsErr;

            // 2. Fetch user reads
            const { data: readsData, error: readsErr } = await supabase
                .from('user_news_reads')
                .select('news_id')
                .eq('user_id', session.user.id);

            if (readsErr) throw readsErr;

            const readIds = new Set(readsData?.map(r => r.news_id) || []);
            const unreadIds: string[] = [];

            const processedMessages = (newsData || []).map(msg => {
                const isRead = readIds.has(msg.id);
                if (!isRead) unreadIds.push(msg.id);
                return { ...msg, is_read: isRead } as NewsMessage;
            });

            setMessages(processedMessages);

            // 3. Mark unread as read asynchronously
            if (unreadIds.length > 0) {
                const inserts = unreadIds.map(id => ({
                    user_id: session.user.id,
                    news_id: id,
                }));
                // We don't await this so UI shows them as 'New' this one time
                supabase.from('user_news_reads').insert(inserts).then(({ error }) => {
                    if (error) console.error('Failed to mark news reads', error);
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <Ionicons name="megaphone" size={24} color={COLORS.primary} />
                    <Text style={styles.headerTitle}> Curio News</Text>
                </View>
                <Text style={styles.headerSub}>Latest updates & broadcasts</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {messages.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="mail-open-outline" size={48} color={COLORS.textLight} />
                            <Text style={styles.emptyTitle}>No news right now</Text>
                            <Text style={styles.emptySub}>Check back later for updates!</Text>
                        </View>
                    ) : (
                        messages.map(msg => (
                            <View key={msg.id} style={[styles.card, !msg.is_read && styles.unreadCard]}>
                                <View style={styles.cardHeaderRow}>
                                    <Text style={styles.cardTitle}>{msg.title}</Text>
                                    {!msg.is_read && (
                                        <View style={styles.newBadge}>
                                            <Text style={styles.newBadgeText}>NEW</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.cardDate}>
                                    {new Date(msg.created_at).toLocaleDateString(undefined, {
                                        month: 'short', day: 'numeric', year: 'numeric'
                                    })}
                                </Text>
                                <Text style={styles.cardContent}>{msg.content}</Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            <View style={styles.footerRow}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.8}
                >
                    <Text style={styles.backButtonText}>Back to Dashboard</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        paddingTop: 60,
        paddingBottom: SPACING.md,
        paddingHorizontal: SPACING.lg,
        backgroundColor: COLORS.white,
        borderBottomLeftRadius: RADIUS.xl,
        borderBottomRightRadius: RADIUS.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3,
        zIndex: 10,
    },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    headerTitle: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.heavy, color: COLORS.textDark },
    headerSub: { fontSize: FONTS.sizes.md, color: COLORS.textMedium, marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: SPACING.lg, paddingBottom: 100, gap: SPACING.md },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
    emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textDark },
    emptySub: { fontSize: FONTS.sizes.sm, color: COLORS.textMedium, marginTop: 4 },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
    },
    unreadCard: {
        borderLeftColor: COLORS.primary,
        backgroundColor: '#F0F9FF',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    cardTitle: {
        flex: 1,
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginRight: SPACING.sm,
    },
    newBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    newBadgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: FONTS.weights.bold,
    },
    cardDate: {
        fontSize: FONTS.sizes.xs,
        color: '#9CA3AF',
        marginBottom: SPACING.md,
    },
    cardContent: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        lineHeight: 22,
    },
    footerRow: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.white,
        padding: SPACING.lg,
        paddingBottom: SPACING.xl,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    backButton: {
        backgroundColor: COLORS.textDark,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
    },
    backButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.bold,
    },
});
