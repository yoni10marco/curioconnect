import React from 'react';
import { View, Text, ScrollView } from 'react-native';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, backgroundColor: '#b91c1c', padding: 24, paddingTop: 60 }}>
                    <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
                        App Crashed!
                    </Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={{ color: 'white', fontSize: 16, fontFamily: 'monospace', marginBottom: 20 }}>
                            {this.state.error?.toString()}
                        </Text>
                        <Text style={{ color: '#fca5a5', fontSize: 12, fontFamily: 'monospace' }}>
                            {this.state.error?.stack}
                        </Text>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}
