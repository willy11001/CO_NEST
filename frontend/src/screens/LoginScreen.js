import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '../../App';

export default function LoginScreen({ navigation }) {
  const { login, serverUrl } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token, data.user);
      } else {
        Alert.alert('Authentication Failed', data.message || 'Check your credentials.');
      }
    } catch (error) {
      // Fallback mockup in case API is offline
      if (email === 'agent@conest.com' && password === 'agent123') {
        login('mock-jwt-token-agent', {
          id: 'AGT2000002',
          fullName: 'Jean Pierre',
          email: 'agent@conest.com',
          role: 'agent',
          kycStatus: 'verified'
        });
      } else if (email === 'buyer@conest.com' && password === 'buyer123') {
        login('mock-jwt-token-buyer', {
          id: 'BYR3000003',
          fullName: 'Elie Kamga',
          email: 'buyer@conest.com',
          role: 'buyer',
          kycStatus: 'unverified'
        });
      } else if (email === 'admin@conest.com' && password === 'admin123') {
        login('mock-jwt-token-admin', {
          id: 'ADM1000001',
          fullName: 'System Administrator',
          email: 'admin@conest.com',
          role: 'admin',
          kycStatus: 'verified'
        });
      } else {
        Alert.alert('Connection Error', 'Unable to connect to server. Try credentials (agent@conest.com / agent123) for offline testing.');
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
        <Text style={styles.title}>Co_Nest</Text>
        <Text style={styles.subtitle}>Trust Verification & Real Estate</Text>

        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotLink}
        >
          <Text style={styles.forgotText}>🔐 Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.registerLink}
        >
          <Text style={styles.registerText}>Don't have an account? <Text style={styles.highlight}>Sign Up</Text></Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 30
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
  forgotLink: {
    marginTop: 16,
    alignItems: 'center'
  },
  forgotText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600'
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center'
  },
  registerText: {
    color: '#94a3b8',
    fontSize: 14
  },
  highlight: {
    color: '#2563eb',
    fontWeight: 'bold'
  },
  demoBox: {
    marginTop: 25,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#0f172a'
  },
  demoTitle: {
    color: '#cbd5e1',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4
  },
  demoText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16
  }
});
