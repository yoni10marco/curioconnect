import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function FeedbackScreen() {
    const navigation = useNavigation();
    const [feedback, setFeedback] = useState('');
    const [sending, setSending] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSend = async () => {
        if (!feedback.trim()) {
            Alert.alert('Empty', 'Please type some feedback before sending.');
            return;
        }

        setSending(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('feedbacks')
            .insert({ user_id: user?.id, content: feedback.trim() });
        setSending(false);

        if (error) {
            Alert.alert('Error', 'Failed to send feedback. Please try again.');
        } else {
            setIsSent(true);
        }
    };

    if (isSent) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Feedback Sent</Text>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.successContainer}>
                    <Ionicons name="heart-circle" size={72} color={COLORS.streak} />
                    <Text style={styles.successTitle}>Thank You!</Text>
                    <Text style={styles.successDesc}>Your feedback has been successfully sent. We really appreciate your input in helping us improve CurioConnect.</Text>
                    <TouchableOpacity style={styles.successButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.successButtonText}>Back to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Send Feedback</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.infoCard}>
                    <Ionicons name="chatbubble-ellipses-outline" size={48} color={COLORS.primary} />
                    <Text style={styles.infoTitle}>Help Us Improve</Text>
                    <Text style={styles.infoDesc}>
                        Have an idea, found a bug, or just want to tell us what you love? We read every single message.
                    </Text>
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Type your feedback here..."
                        placeholderTextColor={COLORS.textLight}
                        multiline
                        textAlignVertical="top"
                        value={feedback}
                        onChangeText={setFeedback}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.sendButton, !feedback.trim() && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={sending || !feedback.trim()}
                    activeOpacity={0.8}
                >
                    {sending ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.sendButtonText}>Send Message</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: SPACING.md,
        paddingHorizontal: SPACING.lg,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
    },
    backButtonText: {
        fontSize: 28,
        color: COLORS.primary,
        fontWeight: 'bold',
        marginTop: -4,
    },
    headerTitle: {
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
    },
    content: {
        padding: SPACING.lg,
        gap: SPACING.xl,
    },
    infoCard: {
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    emoji: {
        fontSize: 48,
        marginBottom: SPACING.sm,
    },
    infoTitle: {
        fontSize: FONTS.sizes.xl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginBottom: SPACING.xs,
    },
    infoDesc: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: SPACING.md,
    },
    inputContainer: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    textInput: {
        height: 200,
        fontSize: FONTS.sizes.md,
        color: COLORS.textDark,
        lineHeight: 24,
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.md,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.textLight,
        shadowOpacity: 0,
        elevation: 0,
    },
    sendButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    successEmoji: { fontSize: 72, marginBottom: SPACING.md },
    successTitle: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.textDark,
        marginBottom: SPACING.sm,
    },
    successDesc: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: SPACING.xxl,
    },
    successButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingHorizontal: SPACING.xxl,
        paddingVertical: SPACING.md,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    successButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.bold,
    },
});
