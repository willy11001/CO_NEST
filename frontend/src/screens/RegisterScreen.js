import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { AuthContext } from '../../App';

export default function RegisterScreen({ navigation }) {
  const { login, serverUrl } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('buyer'); // buyer or agent
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validation
    if (!name || !name.trim()) {
      Alert.alert('Error', 'Please enter your full legal name.');
      return;
    }
    if (!email || !email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter a password.');
      return;
    }
    if (password.length < 3) {
      Alert.alert('Weak Password', 'Password must be at least 3 characters long.');
      return;
    }


    setLoading(true);

    try {
      const response = await fetch(`${serverUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role
        })
      });

      // Parse response as text first to handle any content type
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        // Server returned non-JSON response
        if (response.ok) {
          Alert.alert('Success', 'Account created! (Non-JSON response)');
          login('mock-jwt-token-' + Date.now(), {
            id: (role === 'agent' ? 'AGT' : 'BYR') + Math.floor(1000000 + Math.random() * 9000000),
            fullName: name.trim(),
            email: email.trim().toLowerCase(),
            role,
            kycStatus: 'unverified'
          });
        } else {
          Alert.alert('Server Error', `Server returned: ${responseText || 'Empty response'}. Status: ${response.status}`);
        }
        return;
      }

      if (response.ok) {
        Alert.alert('Success', 'Account created successfully! Welcome to Co-Nest.');
        login(data.token, data.user);
      } else {
        Alert.alert('Registration Failed', data.message || 'An error occurred on the server.');
      }
    } catch (err) {
      const errMsg = err && err.message ? err.message : 'Unknown error';
      console.log('Registration fetch error:', errMsg);
      // Server unreachable - use offline fallback
      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail.includes('@') && name.trim().length >= 2) {
        const mockId = (role === 'agent' ? 'AGT' : 'BYR') + Math.floor(1000000 + Math.random() * 9000000);
        login('mock-jwt-token-' + Date.now(), {
          id: mockId,
          fullName: name.trim(),
          email: trimmedEmail,
          role,
          kycStatus: 'unverified'
        });
        Alert.alert(
          'Offline Registration',
          `Backend server unreachable at ${serverUrl}.\n\nAccount created in offline simulation mode.\n\nTo use the real backend: cd backend && npm start`
        );
      } else {
        Alert.alert(
          'Connection Error',
          `Cannot connect to server at ${serverUrl}.\n\nMake sure the backend is running (npm start in the backend folder).`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Co_Nest Trust Ecosystem</Text>



          <TextInput
            style={styles.input}
            placeholder="Legal Name (Matches CNI)"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />

          <TextInput
            style={styles.input}
            placeholder="Password (min 3 characters)"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
          />

          <Text style={styles.label}>Select Account Type:</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleButton, role === 'buyer' && styles.roleActive]}
              onPress={() => setRole('buyer')}
            >
              <Text style={[styles.roleText, role === 'buyer' && styles.roleTextActive]}>Buyer / Renter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, role === 'agent' && styles.roleActive]}
              onPress={() => setRole('agent')}
            >
              <Text style={[styles.roleText, role === 'agent' && styles.roleTextActive]}>Real Estate Agent</Text>
            </TouchableOpacity>
          </View>



          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Register Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backLink}
          >
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 80
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
    marginBottom: 20
  },
  warningBox: {
    backgroundColor: '#451a03',
    borderWidth: 1,
    borderColor: '#b45309',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20
  },
  warningTitle: {
    color: '#fbbf24',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4
  },
  warningText: {
    color: '#fcd34d',
    fontSize: 11,
    lineHeight: 15
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
  label: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8
  },
  hintText: {
    color: '#fbbf24',
    fontSize: 11,
    marginBottom: 8,
    fontStyle: 'italic'
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#475569'
  },
  roleActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  roleText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 13
  },
  roleTextActive: {
    color: '#ffffff'
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