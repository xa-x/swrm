import { useAuth } from '@clerk/clerk-expo'
import { useConvexAuth } from 'convex/react'
import { Redirect } from 'expo-router'
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native'
import * as WebBrowser from "expo-web-browser"
import { useOAuth } from "@clerk/clerk-expo"

WebBrowser.maybeCompleteAuthSession()

export default function MainScreen() {
    const { isLoaded, isSignedIn } = useAuth()
    const { isAuthenticated } = useConvexAuth()
    const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" })

    if (!isLoaded) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
            </View>
        )
    }

    const onSignInWithGoogle = async () => {
        try {
            const { createdSessionId, setActive } = await startOAuthFlow()
            if (createdSessionId && setActive) {
                setActive({ session: createdSessionId })
            }
        } catch (err) {
            console.error("OAuth error", err)
        }
    }

    if (!isSignedIn) {
        return (
            <View style={styles.centered}>
                <Text style={styles.title}>Welcome back</Text>
                <TouchableOpacity style={styles.button} onPress={onSignInWithGoogle}>
                    <Text style={styles.buttonText}>Sign in with Google</Text>
                </TouchableOpacity>
            </View>
        )
    }

    // Wait for Convex to finish token exchange with Clerk before redirecting to the app
    if (!isAuthenticated) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        )
    }

    return <Redirect href="/(app)" />
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        backgroundColor: '#F2F2F7',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    }
})