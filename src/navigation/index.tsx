import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from '../screens/auth/LoginScreen';
import InterestSelectionScreen from '../screens/onboarding/InterestSelectionScreen';
import DashboardScreen from '../screens/app/DashboardScreen';
import LessonReaderScreen from '../screens/app/LessonReaderScreen';
import ProfileScreen from '../screens/app/ProfileScreen';
import LeaderboardScreen from '../screens/app/LeaderboardScreen';
import LearningJourneyScreen from '../screens/app/LearningJourneyScreen';
import KnowledgeLibraryScreen from '../screens/app/KnowledgeLibraryScreen';
import AboutScreen from '../screens/app/AboutScreen';
import FeedbackScreen from '../screens/app/FeedbackScreen';

import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS } from '../lib/theme';

export type AuthStackParamList = {
    Login: undefined;
};

export type OnboardingStackParamList = {
    InterestSelection: undefined;
};

export type AppStackParamList = {
    Dashboard: undefined;
    LessonReader: undefined;
    Profile: undefined;
    Leaderboard: undefined;
    LearningJourney: undefined;
    KnowledgeLibrary: undefined;
    About: undefined;
    Feedback: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

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

function AppNavigator() {
    return (
        <AppStack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: COLORS.white },
                headerTintColor: COLORS.primary,
                headerTitleStyle: { fontWeight: '700', color: COLORS.textDark },
                animation: 'none', // Tab-like instant switching
            }}
        >
            <AppStack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ headerShown: false }}
            />
            <AppStack.Screen
                name="LearningJourney"
                component={LearningJourneyScreen}
                options={{ headerShown: false }}
            />
            <AppStack.Screen
                name="KnowledgeLibrary"
                component={KnowledgeLibraryScreen}
                options={{ headerShown: false }}
            />
            <AppStack.Screen
                name="Leaderboard"
                component={LeaderboardScreen}
                options={{ headerShown: false }}
            />
            <AppStack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ headerShown: false }}
            />
            <AppStack.Screen
                name="LessonReader"
                component={LessonReaderScreen}
                options={{
                    title: 'Today\'s Lesson',
                    headerBackTitle: 'Dashboard',
                    animation: 'default', // Restore normal slide for lessons
                }}
            />
            <AppStack.Screen
                name="About"
                component={AboutScreen}
                options={{ headerShown: false, animation: 'slide_from_right' }}
            />
            <AppStack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{ headerShown: false, animation: 'slide_from_right' }}
            />
        </AppStack.Navigator>
    );
}

export default function RootNavigator() {
    const PERSISTENCE_KEY = 'CURIO_CONNECT_NAV_STATE_V1';
    const { session, setSession, fetchProfile, profile } = useAuthStore();
    const [hasInterests, setHasInterests] = useState<boolean | null>(null);
    const [checkingInterests, setCheckingInterests] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [initialState, setInitialState] = useState();

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

    useEffect(() => {
        const restoreState = async () => {
            try {
                const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY);
                const state = savedStateString ? JSON.parse(savedStateString) : undefined;
                if (state !== undefined) {
                    setInitialState(state);
                }
            } catch (e) {
                // Ignore err
            } finally {
                setIsReady(true);
            }
        };

        if (!isReady) {
            restoreState();
        }
    }, [isReady]);

    if (!isReady || !useAuthStore.getState().initialized || checkingInterests) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer
            initialState={initialState}
            onStateChange={(state) => {
                if (state) {
                    AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
                }
            }}
        >
            {!session
                ? <AuthNavigator />
                : hasInterests === false
                    ? <OnboardingNavigator />
                    : <AppNavigator />
            }
        </NavigationContainer>
    );
}
