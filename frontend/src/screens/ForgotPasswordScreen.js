import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '../../App';

export default function ForgotPasswordScreen({ navigation }) {
    const { serverUrl } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendOtp = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${serverUrl}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                // If SMTP failed but server returned debugOtp, show it
                if (data.debugOtp) {
                    Alert.alert(
                        'OTP Generated (SMTP Unavailable)',
                        `Debug Mode: Your OTP code is: ${data.debugOtp}\n\nIn production, this would be sent to your email. Check the server console as well.`
                    );
                } else {
                    Alert.alert('OTP Sent', 'A verification code has been sent to your email.');
                }
                navigation.navigate('VerifyOtp', { email });
            } else {
                Alert.alert('Error', data.message || 'Failed to send OTP.');
            }
        } catch (error) {
            // Offline fallback - generate a mock OTP
            const mockOtp = '123456';
            Alert.alert(
                'Offline Mode',
                `Server unreachable. Use OTP: ${mockOtp} for testing.\n\nNavigate to verification screen.`
            );
            navigation.navigate('VerifyOtp', { email });
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
                <Text style={styles.title}>🔐 Forgot Password</Text>
                <Text style={styles.subtitle}>
                    Enter your registered email to receive a one-time password (OTP) verification code.
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleSendOtp}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>{loading ? 'Sending OTP...' : 'Send OTP Code'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backLink}
                >
                    <Text style={styles.backText}>← Back to Login</Text>
                </TouchableOpacity>

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        📧 In production, OTP is sent via SMTP (Mailtrap). In demo/offline mode, codes are logged in the server console.
                    </Text>
                </View>
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
    },
    infoBox: {
        marginTop: 25,
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#0f172a'
    },
    infoText: {
        color: '#94a3b8',
        fontSize: 11,
        lineHeight: 16
    }
});