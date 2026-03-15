import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import BottomNav from '../../components/BottomNav';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../lib/types';
import { useAuthStore } from '../../store/useAuthStore';
import { AppStackParamList } from '../../navigation';

type Tab = 'xp' | 'streak';

export default function LeaderboardScreen() {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<AppStackParamList, 'Leaderboard'>>();
    const { session } = useAuthStore();
    const [activeTab, setActiveTab] = useState<Tab>(route.params?.initialTab ?? 'xp');
    const [leaders, setLeaders] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    const scrollRef = React.useRef<ScrollView>(null);

    useFocusEffect(
        React.useCallback(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: false });
        }, [])
    );

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.functions.invoke('get-leaderboard', {
                    body: { activeTab },
                });

                if (error) {
                    console.error("Error from get-leaderboard Edge Function:", error);
                } else if (data) {
                    setLeaders(data as Profile[]);
                }
            } catch (err) {
                console.error("Network or invoke error:", err);
            }
            setLoading(false);
        };

        fetchLeaderboard();
    }, [activeTab]);

    const renderMedal = (index: number) => {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return `${index + 1}`;
    };

    return (
        <View style={styles.container}>
            {/* Header Area */}
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <Ionicons name="trophy" size={28} color={COLORS.xp} />
                    <Text style={styles.headerTitle}> Leaderboard</Text>
                </View>

                {/* Custom Segment Control */}
                <View style={styles.segmentContainer}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, activeTab === 'xp' && styles.segmentBtnActive]}
                        onPress={() => setActiveTab('xp')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.segmentInner}>
                            <Ionicons name="star" size={14} color={activeTab === 'xp' ? COLORS.xp : COLORS.textMedium} />
                            <Text style={[styles.segmentText, activeTab === 'xp' && styles.segmentTextActive]}> Total XP</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, activeTab === 'streak' && styles.segmentBtnActive]}
                        onPress={() => setActiveTab('streak')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.segmentInner}>
                            <Ionicons name="flame" size={14} color={activeTab === 'streak' ? COLORS.streak : COLORS.textMedium} />
                            <Text style={[styles.segmentText, activeTab === 'streak' && styles.segmentTextActive]}> Streak</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* List Area */}
            <View style={styles.listContainer}>
                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : (
                    <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {leaders.length === 0 ? (
                            <Text style={styles.emptyText}>No users found.</Text>
                        ) : (
                            leaders.map((user, index) => {
                                const isMe = session?.user?.id === user.id;
                                const val = activeTab === 'xp' ? user.total_xp : ((user as any).effective_streak ?? user.streak_count);

                                return (
                                    <View key={user.id} style={[styles.userRow, isMe && styles.myRow]}>
                                        <View style={styles.rankBox}>
                                            <Text style={styles.rankText}>{renderMedal(index)}</Text>
                                        </View>
                                        <View style={styles.userInfo}>
                                            <Text style={[styles.username, isMe && styles.myUsername]} numberOfLines={1}>
                                                {user.username || 'Anonymous'} {isMe && '(You)'}
                                            </Text>
                                        </View>
                                        <Text style={styles.statScore} numberOfLines={1}>
                                            {val} {activeTab === 'xp' ? 'XP' : 'Days'}
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                )}
            </View>

            <BottomNav currentRoute="Leaderboard" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        backgroundColor: COLORS.white,
        borderBottomLeftRadius: RADIUS.xl,
        borderBottomRightRadius: RADIUS.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        zIndex: 10,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    headerTitle: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.textDark,
    },
    segmentInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: 4,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: RADIUS.md,
    },
    segmentBtnActive: {
        backgroundColor: COLORS.white,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    segmentText: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textMedium,
        fontWeight: FONTS.weights.bold,
    },
    segmentTextActive: {
        color: COLORS.primaryDark,
    },
    listContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: 100, // accommodate bottom nav
        gap: SPACING.md,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    myRow: {
        backgroundColor: '#E8F7FF',
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    rankBox: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    rankText: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textMedium,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
    },
    myUsername: {
        color: COLORS.primaryDark,
    },
    statScore: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.primary,
        textAlign: 'right',
        minWidth: 70,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        color: COLORS.textMedium,
        fontSize: FONTS.sizes.md,
    },
});
