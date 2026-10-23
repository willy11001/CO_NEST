import React, { useState, createContext, useContext } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Import Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import PropertyDetailScreen from './src/screens/PropertyDetailScreen';
import RentSplitterScreen from './src/screens/RentSplitterScreen';
import MindcafScreen from './src/screens/MindcafScreen';
import KycScreen from './src/screens/KycScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';

// New Screens
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import VerifyOtpScreen from './src/screens/VerifyOtpScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import CreateListingScreen from './src/screens/CreateListingScreen';
import AgentListingsScreen from './src/screens/AgentListingsScreen';


// Mock Icon component since we don't have vector-icons package compiled in headlessly
const TabIcon = ({ name, color }) => {
  const icons = {
    Explore: '🔍',
    MyListings: '🏢',
    MINDCAF: '📜',
    KYC: '🆔',
    Profile: '👤',
    Chats: '💬',
    Messages: '💬',
    Payments: '💳',
    CreateListing: '📢'
  };
  return <Text style={{ color, fontSize: 18 }}>{icons[name] || '•'}</Text>;
};

// Co-Nest Global Dark Theme
const CoNestDarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0f172a',
    card: '#1e293b',
    text: '#ffffff',
    border: '#334155',
    primary: '#2563eb'
  }
};

// Auth Context
export const AuthContext = createContext(null);

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigation
function MainTabs() {
  const { user } = useContext(AuthContext);
  const isAgent = user?.role?.toLowerCase() === 'agent';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopWidth: 0,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 10
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          paddingBottom: 2
        },
        headerStyle: {
          backgroundColor: '#2563eb'
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold'
        }
      })}
    >
      {isAgent ? (
        // --- AGENT INTERFACE ---
        <>
          <Tab.Screen
            name="MyListings"
            component={AgentListingsScreen}
            options={{ title: 'My Publications' }}
          />
          <Tab.Screen
            name="KYC"
            component={KycScreen}
            options={{ title: 'KYC Identity' }}
          />
          <Tab.Screen
            name="Messages"
            component={ChatListScreen}
            options={{ title: 'Client Inquiries' }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'Agent Account' }}
          />
        </>
      ) : (
        // --- BUYER / RENTER INTERFACE ---
        <>
          <Tab.Screen
            name="Explore"
            component={ExploreScreen}
            options={{ title: 'Explore Feed' }}
          />
          <Tab.Screen
            name="MINDCAF"
            component={MindcafScreen}
            options={{ title: 'Land Title Check' }}
          />
          <Tab.Screen
            name="Messages"
            component={ChatListScreen}
            options={{ title: 'My Chats' }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'My Account' }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null); // { id, name, email, role, kycStatus }
  const [loading, setLoading] = useState(false);

  const login = (jwtToken, userData) => {
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const updateKycStatus = (status) => {
    setUser(prev => prev ? { ...prev, kycStatus: status } : null);
  };

  const updateProfileImageState = (imgUrl) => {
    setUser(prev => prev ? { ...prev, profileImage: imgUrl } : null);
  };

  const [favorites, setFavorites] = useState([]);

  const toggleFavorite = (property) => {
    setFavorites(prev => {
      const exists = prev.find(p => p.id === property.id);
      if (exists) {
        return prev.filter(p => p.id !== property.id);
      }
      return [...prev, property];
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Co-Nest Cameroon...</Text>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateKycStatus, updateProfileImageState, favorites, toggleFavorite, serverUrl: 'http://localhost:5000/api' }}>
      <NavigationContainer theme={CoNestDarkTheme}>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#2563eb'
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: 'bold'
            }
          }}
        >
          {token === null ? (
            // Auth Stack
            <>
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Register"
                component={RegisterScreen}
                options={{ title: 'Create Account' }}
              />
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{ title: 'Reset Password' }}
              />
              <Stack.Screen
                name="VerifyOtp"
                component={VerifyOtpScreen}
                options={{ title: 'Verify OTP' }}
              />
              <Stack.Screen
                name="ResetPassword"
                component={ResetPasswordScreen}
                options={{ title: 'New Password' }}
              />
            </>
          ) : (
            // App Stack
            <>
              <Stack.Screen
                name="HomeTabs"
                component={MainTabs}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="PropertyDetail"
                component={PropertyDetailScreen}
                options={{ title: 'Property Details' }}
              />
              <Stack.Screen
                name="RentSplitter"
                component={RentSplitterScreen}
                options={{ title: 'Roommate Rent Splitter' }}
              />
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={({ route }) => ({ title: route.params?.agentName || 'Chat' })}
              />
              <Stack.Screen
                name="AdminDashboard"
                component={AdminDashboardScreen}
                options={{ title: 'Admin Control Center' }}
              />
              <Stack.Screen
                name="Payments"
                component={PaymentScreen}
                options={{ title: 'Payments' }}
              />
              <Stack.Screen
                name="CreateListing"
                component={CreateListingScreen}
                options={{ title: 'New Listing' }}
              />
              <Stack.Screen
                name="KycScreen"
                component={KycScreen}
                options={{ title: 'Identity Verification (KYC)' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a'
  },
  loadingText: {
    marginTop: 10,
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600'
  }
});