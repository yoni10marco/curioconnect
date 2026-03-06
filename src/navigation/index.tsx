import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import LoginScreen from '../screens/auth/LoginScreen';
import InterestSelectionScreen from '../screens/onboarding/InterestSelectionScreen';
import DashboardScreen from '../screens/app/DashboardScreen';
import LessonReaderScreen from '../screens/app/LessonReaderScreen';
import ProfileScreen from '../screens/app/ProfileScreen';
import KnowledgeLibraryScreen from '../screens/app/KnowledgeLibraryScreen';
import LeaderboardScreen from '../screens/app/LeaderboardScreen';
import LearningJourneyScreen from '../screens/app/LearningJourneyScreen';

import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS } from '../lib/theme';

// Type exports for screens
export type AuthStackParamList = {
    Login: undefined;
};

export type OnboardingStackParamList = {
    InterestSelection: undefined;
};

export type TabParamList = {
    DashboardHome: undefined;
    Library: undefined;
    Journey: undefined;
    Leaderboard: undefined;
    Profile: undefined;
};

export type AppStackParamList = {
    Tabs: undefined;
    LessonReader: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function AuthNavigator() {
    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
    );
}

function OnboardingNavigator() {
    return (
        <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
            <OnboardingStack.Screen name="InterestSelection" component={InterestSelectionScreen} />
        </OnboardingStack.Navigator>
    );
}

function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textMedium,
                tabBarStyle: {
                    borderTopWidth: 1,
                    borderTopColor: COLORS.border,
                    backgroundColor: COLORS.white,
                    elevation: 0,
                    shadowOpacity: 0,
                    paddingTop: 8,
                },
                tabBarIcon: ({ color, size }) => {
                    let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'home';
                    if (route.name === 'DashboardHome') iconName = 'home-outline';
                    if (route.name === 'Library') iconName = 'bookshelf';
                    if (route.name === 'Journey') iconName = 'map-search-outline';
                    if (route.name === 'Leaderboard') iconName = 'trophy-outline';
                    if (route.name === 'Profile') iconName = 'account-outline';
                    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="DashboardHome" component={DashboardScreen} options={{ title: 'Home' }} />
            <Tab.Screen name="Library" component={KnowledgeLibraryScreen} />
            <Tab.Screen name="Journey" component={LearningJourneyScreen} />
            <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

function AppNavigator() {
    return (
        <AppStack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: COLORS.white },
                headerTintColor: COLORS.primary,
                headerTitleStyle: { fontWeight: '700', color: COLORS.textDark },
            }}
        >
            <AppStack.Screen
                name="Tabs"
                component={TabNavigator}
                options={{ headerShown: false }}
            />
            <AppStack.Screen
                name="LessonReader"
                component={LessonReaderScreen}
                options={{
                    title: 'Today\'s Lesson',
                    headerBackTitle: 'Dashboard',
                }}
            />
        </AppStack.Navigator>
    );
}

export default function RootNavigator() {
    const { session, setSession, fetchProfile, profile, initialized } = useAuthStore();
    const [hasInterests, setHasInterests] = useState<boolean | null>(null);
    const [checkingInterests, setCheckingInterests] = useState(false);

    // Listen for auth state changes
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchProfile(session.user.id);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Check if user has completed onboarding (has interests)
    useEffect(() => {
        const checkInterests = async () => {
            if (!session) {
                setHasInterests(null);
                return;
            }
            setCheckingInterests(true);
            const { data } = await supabase
                .from('user_interests')
                .select('id')
                .eq('user_id', session.user.id)
                .limit(1);
            setHasInterests((data?.length ?? 0) > 0);
            setCheckingInterests(false);
        };
        checkInterests();
    }, [session, profile]);

    // Show loading spinner while determining state
    if (!initialized || checkingInterests) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {!session
                ? <AuthNavigator />
                : hasInterests === false
                    ? <OnboardingNavigator />
                    : <AppNavigator />
            }
        </NavigationContainer>
    );
}
