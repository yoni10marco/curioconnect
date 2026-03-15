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
import { AntDesign } from '@expo/vector-icons';
import { Image } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginScreen() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const { signIn, signUp, signInWithGoogle, loading } = useAuthStore();

    const friendlyError = (raw: string) => {
        if (raw.includes('Invalid login credentials')) return 'Wrong email or password. Please try again.';
        if (raw.includes('Email address') && raw.includes('invalid')) return 'Please use a real email address (e.g. yourname@gmail.com).';
        if (raw.includes('rate limit')) return 'Too many attempts. Please wait a few minutes and try again.';
        if (raw.includes('already registered')) return 'This email is already registered. Try logging in instead.';
        if (raw.includes('Password should be')) return 'Password must be at least 6 characters.';
        return raw;
    };

    const handleGoogleSignIn = async () => {
        const { error } = await signInWithGoogle(referralCode.trim() || undefined);
        if (error) Alert.alert('Google Sign-In Failed', error);
    };

    const handleSubmit = async () => {
        if (!email || !password) {
            Alert.alert('Missing Fields', 'Please enter your email and password.');
            return;
        }
        if (!isLogin && !username) {
            Alert.alert('Missing Fields', 'Please enter a username.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters.');
            return;
        }

        let error: string | null;
        if (isLogin) {
            ({ error } = await signIn(email.trim(), password));
        } else {
            ({ error } = await signUp(email.trim(), password, username.trim(), referralCode.trim() || undefined));
            if (!error) {
                // Success — if email confirmation is ON, the user needs to check email
                Alert.alert(
                    'Check your email ✉️',
                    `We sent a confirmation link to ${email.trim()}. Click it to activate your account, then come back and log in.\n\nTip: Disable email confirmation in Supabase dashboard to skip this step during development.`,
                    [{ text: 'OK', onPress: () => setIsLogin(true) }]
                );
                return;
            }
        }

        if (error) {
            Alert.alert('Oops!', friendlyError(error));
        }
    };


    return (
        <LinearGradient
            colors={['#00D4FF', '#0066FF']}
            style={styles.gradient}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    {/* Logo / Hero */}
                    <View style={styles.hero}>
                        <Image
                            source={require('../../../assets/icon.png')}
                            style={styles.logoImage}
                        />
                        <Text style={styles.appName}>CurioConnect</Text>
                        <Text style={styles.tagline}>Learn anything through what you love</Text>
                    </View>

                    {/* Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{isLogin ? 'Welcome back!' : 'Create an account'}</Text>

                        {/* Google Sign-In */}
                        <TouchableOpacity
                            style={styles.googleButton}
                            onPress={handleGoogleSignIn}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#444" />
                            ) : (
                                <>
                                    <AntDesign name="google" size={18} color="#EA4335" style={styles.googleIcon} />
                                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {!isLogin && (
                            <>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Username"
                                    placeholderTextColor={COLORS.textLight}
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Referral code (optional)"
                                    placeholderTextColor={COLORS.textLight}
                                    value={referralCode}
                                    onChangeText={setReferralCode}
                                    autoCapitalize="characters"
                                />
                            </>
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
    logoImage: {
        width: 100,
        height: 100,
        borderRadius: 24,
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
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#DADCE0',
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        backgroundColor: COLORS.white,
    },
    googleIcon: {
        marginRight: SPACING.sm,
    },
    googleButtonText: {
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.semibold,
        color: '#3C4043',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACING.sm,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    dividerText: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textLight,
        marginHorizontal: SPACING.sm,
    },
});
