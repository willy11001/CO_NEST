import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '../../App';

export default function ResetPasswordScreen({ route, navigation }) {
    const { email, otpCode } = route.params;
    const { serverUrl } = useContext(AuthContext);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in both password fields.');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${serverUrl}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otpCode, newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert('Success', 'Your password has been reset successfully. You can now login with your new password.');
                navigation.navigate('Login');
            } else {
                Alert.alert('Error', data.message || 'Password reset failed.');
            }
        } catch (error) {
            Alert.alert('Offline Mode', 'Password reset simulated. In offline mode, your password would be updated.');
            navigation.navigate('Login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.card}>
                <Text style={styles.title}>🔐 Reset Password</Text>
                <Text style={styles.subtitle}>
                    Create a new password for <Text style={styles.emailHighlight}>{email}</Text>
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="New Password (min 6 chars)"
                    placeholderTextColor="#94a3b8"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                />

                <TextInput
                    style={styles.input}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#94a3b8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleResetPassword}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('Login')}
                    style={styles.backLink}
                >
                    <Text style={styles.backText}>← Back to Login</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        padding: 20
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#2563eb',
        textAlign: 'center',
        marginBottom: 4
    },
    subtitle: {
        fontSize: 13,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 18
    },
    emailHighlight: {
        color: '#2563eb',
        fontWeight: 'bold'
    },
    input: {
        backgroundColor: '#334155',
        color: '#ffffff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        fontSize: 16,
        marginBottom: 16
    },
    button: {
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold'
    },
    backLink: {
        marginTop: 20,
        alignItems: 'center'
    },
    backText: {
        color: '#2563eb',
        fontSize: 14,
        fontWeight: '600'
    }
});