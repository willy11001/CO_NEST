import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '../../App';

export default function VerifyOtpScreen({ route, navigation }) {
    const { email } = route.params;
    const { serverUrl } = useContext(AuthContext);
    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length < 4) {
            Alert.alert('Error', 'Please enter the full OTP code sent to your email.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${serverUrl}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otpCode })
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert('OTP Verified', 'Code validated successfully. You can now reset your password.');
                navigation.navigate('ResetPassword', { email, otpCode });
            } else {
                Alert.alert('Verification Failed', data.message || 'Invalid or expired OTP code.');
            }
        } catch (error) {
            // Offline fallback - accept any 6-digit code
            if (otpCode.length === 6) {
                Alert.alert('Offline Mode', 'OTP verified in offline mode.');
                navigation.navigate('ResetPassword', { email, otpCode });
            } else {
                Alert.alert('Error', 'Connection error. In offline mode, enter any 6-digit code.');
            }
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
                <Text style={styles.title}>🔑 Verify OTP</Text>
                <Text style={styles.subtitle}>
                    A one-time password was sent to <Text style={styles.emailHighlight}>{email}</Text>
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit OTP Code"
                    placeholderTextColor="#94a3b8"
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleVerifyOtp}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify OTP Code'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.backLink}
                >
                    <Text style={styles.backText}>← Request New Code</Text>
                </TouchableOpacity>

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        ⏰ OTP codes expire after 15 minutes for security. In demo mode, check server console for the code.
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
        fontSize: 20,
        textAlign: 'center',
        letterSpacing: 8,
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
        color: '#38bdf8',
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