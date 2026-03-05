import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const { signIn, signUp, loading } = useAuthStore();

    const handleSubmit = async () => {
        if (!email || !password) {
            Alert.alert('Missing Fields', 'Please enter your email and password.');
            return;
        }
        if (!isLogin && !username) {
            Alert.alert('Missing Fields', 'Please enter a username.');
            return;
        }

        let error: string | null;
        if (isLogin) {
            ({ error } = await signIn(email.trim(), password));
        } else {
            ({ error } = await signUp(email.trim(), password, username.trim()));
        }

        if (error) {
            Alert.alert('Error', error);
        }
    };

    return (
        <LinearGradient
            colors={['#58CC02', '#3D9A00']}
            style={styles.gradient}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    {/* Logo / Hero */}
                    <View style={styles.hero}>
                        <Text style={styles.emoji}>🦉</Text>
                        <Text style={styles.appName}>CurioConnect</Text>
                        <Text style={styles.tagline}>Learn anything through what you love</Text>
                    </View>

                    {/* Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{isLogin ? 'Welcome back!' : 'Create an account'}</Text>

                        {!isLogin && (
                            <TextInput
                                style={styles.input}
                                placeholder="Username"
                                placeholderTextColor={COLORS.textLight}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                            />
                        )}

                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor={COLORS.textLight}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={COLORS.textLight}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={handleSubmit}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.primaryButtonText}>
                                    {isLogin ? 'Log In' : 'Get Started'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.toggleRow}>
                            <Text style={styles.toggleText}>
                                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                                <Text style={styles.toggleLink}>{isLogin ? 'Sign Up' : 'Log In'}</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    hero: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    emoji: {
        fontSize: 72,
        marginBottom: SPACING.sm,
    },
    appName: {
        fontSize: FONTS.sizes.title,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.white,
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: FONTS.sizes.md,
        color: 'rgba(255,255,255,0.85)',
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    cardTitle: {
        fontSize: FONTS.sizes.xl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    input: {
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        fontSize: FONTS.sizes.md,
        color: COLORS.textDark,
        marginBottom: SPACING.sm,
        backgroundColor: COLORS.background,
    },
    primaryButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
        marginTop: SPACING.sm,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    primaryButtonText: {
        color: COLORS.white,
        fontSize: FONTS.sizes.lg,
        fontWeight: FONTS.weights.bold,
        letterSpacing: 0.3,
    },
    toggleRow: {
        marginTop: SPACING.md,
        alignItems: 'center',
    },
    toggleText: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textMedium,
    },
    toggleLink: {
        color: COLORS.primary,
        fontWeight: FONTS.weights.bold,
    },
});
