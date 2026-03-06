import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from '../screens/auth/LoginScreen';
import InterestSelectionScreen from '../screens/onboarding/InterestSelectionScreen';
import DashboardScreen from '../screens/app/DashboardScreen';
import LessonReaderScreen from '../screens/app/LessonReaderScreen';
import LeaderboardScreen from '../screens/app/LeaderboardScreen';
import LearningJourneyScreen from '../screens/app/LearningJourneyScreen';
import KnowledgeLibraryScreen from '../screens/app/KnowledgeLibraryScreen';
import ProfileScreen from '../screens/app/ProfileScreen';

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
    KnowledgeLibrary: undefined;
    LearningJourney: undefined;
    Leaderboard: undefined;
    Profile: undefined;
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
            }}
        >
            <AppStack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
            <AppStack.Screen name="LessonReader" component={LessonReaderScreen} options={{ title: 'Today\'s Lesson', headerBackTitle: 'Back' }} />
            <AppStack.Screen name="KnowledgeLibrary" component={KnowledgeLibraryScreen} options={{ title: 'Knowledge Library' }} />
            <AppStack.Screen name="LearningJourney" component={LearningJourneyScreen} options={{ title: 'Learning Journey' }} />
            <AppStack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
            <AppStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
        </AppStack.Navigator>
    );
}

export default function RootNavigator() {
    const { session, setSession, fetchProfile, profile, initialized } = useAuthStore();
    const [hasInterests, setHasInterests] = useState<boolean | null>(null);
    const [checkingInterests, setCheckingInterests] = useState(false);

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
