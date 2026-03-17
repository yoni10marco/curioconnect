import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../lib/theme';
import { APP_VERSION } from '../../lib/version';

export default function AboutScreen() {
    const navigation = useNavigation();

    const handleEmail = () => {
        Linking.openURL('mailto:curioconnecforyou@gmail.com');
    };

    const handleInstagram = () => {
        Linking.openURL('https://instagram.com/mynameiscurio');
    };

    const handlePrivacyPolicy = () => {
        Linking.openURL('https://yoni10marco.github.io/curioconnect/privacy-policy.html');
    };

    const handleTermsOfService = () => {
        Linking.openURL('https://yoni10marco.github.io/curioconnect/terms-of-service.html');
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>About Us</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Logo & App Info */}
                <View style={styles.brandSection}>
                    <Image
                        source={require('../../../assets/icon.png')}
                        style={styles.logoImage}
                    />
                    <Text style={styles.appName}>CurioConnect</Text>
                    <Text style={styles.appVersion}>Version {APP_VERSION}</Text>
                </View>

                {/* Description */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Our Mission</Text>
                    <Text style={styles.cardText}>
                        CurioConnect is an AI-powered learning journey designed to bridge the gap between your unique interests and the vast world of knowledge.
                        {"\n\n"}
                        By blending what you already love with new, exciting topics, we make daily learning addictive, personalized, and fun. Compete with friends, build your streak, and watch your knowledge library grow!
                    </Text>
                </View>

                {/* Contact & Socials */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Get in Touch</Text>
                    <Text style={styles.cardText}>
                        Have questions, suggestions, or just want to say hi? We'd love to hear from you!
                    </Text>

                    <TouchableOpacity style={styles.contactRow} onPress={handleEmail} activeOpacity={0.7}>
                        <View style={styles.contactIconBox}>
                            <Ionicons name="mail" size={22} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.contactLabel}>Email Us</Text>
                            <Text style={styles.contactValue}>curioconnecforyou@gmail.com</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactRow} onPress={handleInstagram} activeOpacity={0.7}>
                        <View style={[styles.contactIconBox, { backgroundColor: '#FFE8EC' }]}>
                            <Ionicons name="logo-instagram" size={22} color={COLORS.streak} />
                        </View>
                        <View>
                            <Text style={styles.contactLabel}>Instagram</Text>
                            <Text style={styles.contactValue}>@mynameiscurio</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Legal */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Legal</Text>

                    <TouchableOpacity style={styles.contactRow} onPress={handlePrivacyPolicy} activeOpacity={0.7}>
                        <View style={[styles.contactIconBox, { backgroundColor: '#E8F0FF' }]}>
                            <Ionicons name="shield-checkmark" size={22} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.contactLabel}>Privacy Policy</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactRow} onPress={handleTermsOfService} activeOpacity={0.7}>
                        <View style={[styles.contactIconBox, { backgroundColor: '#FFF3E8' }]}>
                            <Ionicons name="document-text" size={22} color={COLORS.accent} />
                        </View>
                        <View>
                            <Text style={styles.contactLabel}>Terms of Service</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Footer text */}
                <Text style={styles.footerText}>Made with love for curious minds.</Text>
            </ScrollView>
        </View>
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
        paddingBottom: 60,
    },
    brandSection: {
        alignItems: 'center',
        marginVertical: SPACING.xl,
    },
    logoImage: {
        width: 100,
        height: 100,
        borderRadius: 24,
        marginBottom: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    appName: {
        fontSize: FONTS.sizes.xxl,
        fontWeight: FONTS.weights.heavy,
        color: COLORS.textDark,
        marginBottom: 4,
    },
    appVersion: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textMedium,
        fontWeight: FONTS.weights.medium,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        marginBottom: SPACING.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    cardTitle: {
        fontSize: FONTS.sizes.xl,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
        marginBottom: SPACING.md,
    },
    cardText: {
        fontSize: FONTS.sizes.md,
        color: COLORS.textMedium,
        lineHeight: 24,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.lg,
    },
    contactIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E8F7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    contactIcon: {
        fontSize: 20,
    },
    contactLabel: {
        fontSize: FONTS.sizes.sm,
        color: COLORS.textMedium,
        marginBottom: 2,
    },
    contactValue: {
        fontSize: FONTS.sizes.md,
        fontWeight: FONTS.weights.bold,
        color: COLORS.textDark,
    },
    footerText: {
        textAlign: 'center',
        fontSize: FONTS.sizes.sm,
        color: COLORS.textLight,
        marginTop: SPACING.xl,
        marginBottom: SPACING.xxl,
    },
});
