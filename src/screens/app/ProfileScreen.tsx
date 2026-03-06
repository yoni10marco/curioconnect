import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ComingSoon from '../../components/ComingSoon';

type UserInterestData = { id: string; topics: { id: string; name: string } };

export default function ProfileScreen() {
    const { profile, session, signOut } = useAuthStore();
    const [interests, setInterests] = useState<UserInterestData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showComingSoon, setShowComingSoon] = useState(false);

    useEffect(() => {
        const fetchInterests = async () => {
            if (!session) return;
            const { data } = await supabase
                .from('user_interests')
                .select('id, topics(id, name)')
                .eq('user_id', session.user.id);
            setInterests((data as any) || []);
            setLoading(false);
        };
        fetchInterests();
    }, [session]);

    if (showComingSoon) {
        return (
            <View style={{ flex: 1 }}>
                <ComingSoon
                    title="Add Interests via AI"
                    description="Soon you'll be able to type to CurioConnect and it will magically extract and organize your new hobbies!"
                    icon="robot-outline"
                />
                <TouchableOpacity
                    style={{ position: 'absolute', top: 50, left: 20 }}
                    onPress={() => setShowComingSoon(false)}
                >
                    <MaterialCommunityIcons name="close-circle" size={32} color={COLORS.textMedium} />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{profile?.username?.charAt(0).toUpperCase() || 'U'}</Text>
                </View>
                <Text style={styles.username}>{profile?.username}</Text>
                <Text style={styles.email}>{session?.user.email}</Text>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Interests</Text>
                    <TouchableOpacity
                        style={styles.aiButton}
                        onPress={() => setShowComingSoon(true)}
                    >
                        <MaterialCommunityIcons name="robot-outline" size={16} color={COLORS.white} />
                        <Text style={styles.aiButtonText}>Add with AI</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
                ) : (
                    <View style={styles.chipContainer}>
                        {interests.map((item) => (
                            <View key={item.id} style={styles.chip}>
                                <Text style={styles.chipText}>{item.topics?.name}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            <View style={styles.footer}>
                <TouchableOpacity onPress={signOut} style={styles.signOutBtn} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="logout" size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
                    <Text style={styles.signOutText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        alignItems: 'center',
        padding: SPACING.xxl,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    avatarText: {
        fontSize: 36,
        fontWeight: FONTS.weights.bold,
        color: COLORS.white,
    },
    username: {
        fontSize: FONTS.sizes.xl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginBottom: 2,
    },
    email: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
    },
    section: {
        padding: SPACING.xl,
        backgroundColor: COLORS.white,
        marginTop: SPACING.lg,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
    },
    aiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
    },
    aiButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.sm,
        fontWeight: FONTS.weights.bold,
        marginLeft: 4,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    chip: {
        backgroundColor: `${COLORS.accent}20`,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: `${COLORS.accent}40`,
    },
    chipText: {
        color: COLORS.textDark,
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.medium,
    },
    footer: {
        padding: SPACING.xl,
        marginTop: 'auto',
    },
    signOutBtn: {
        flexDirection: 'row',
        backgroundColor: `${COLORS.danger}15`,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: `${COLORS.danger}30`,
    },
    signOutText: {
        fontSize: FONTS.sizes.md,
        color: COLORS.danger,
        fontWeight: FONTS.weights.bold,
    }
});
