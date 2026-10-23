import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Modal, ScrollView } from 'react-native';
import { AuthContext } from '../../App';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen({ navigation }) {
  const { user, token, serverUrl, updateProfileImageState, updateKycStatus, favorites, logout } = useContext(AuthContext);
  const [favoritesModalVisible, setFavoritesModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      if (!token) return;
      try {
        const response = await fetch(`${serverUrl}/kyc/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data && data.kycStatus) {
          updateKycStatus(data.kycStatus);
        }
      } catch (error) {
        console.log('Error fetching KYC status on profile focus:', error.message);
      }
    });
    return unsubscribe;
  }, [navigation, token]);

  const getPropertyImageUri = (imgUrl) => {
    if (!imgUrl) return 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800';
    if (imgUrl.startsWith('http') || imgUrl.startsWith('data:')) return imgUrl;
    return `${serverUrl.replace('/api', '')}${imgUrl}`;
  };

  const mockFavorites = (favorites || []).map(item => {
    const mainImg = item.images && item.images[0]?.imageUrl
      ? getPropertyImageUri(item.images[0].imageUrl)
      : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800';
    return {
      id: item.id,
      title: item.title,
      price: parseFloat(item.price),
      city: item.city,
      category: item.category,
      landTitleNumber: item.landTitleNumber || (item.landTitle ? item.landTitle.titleNumber : null),
      image: mainImg
    };
  });

  const handleLogout = () => {
    logout();
  };

  const updateAvatar = async (url) => {
    try {
      const response = await fetch(`${serverUrl}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profileImage: url })
      });
      if (response.ok) {
        updateProfileImageState(url);
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        const errData = await response.json();
        Alert.alert('Error', errData.message || 'Failed to update avatar.');
      }
    } catch (e) {
      console.log('Error updating avatar offline...');
      updateProfileImageState(url);
    }
  };

  const handleChangeAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to update your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        let base64Image = null;

        if (selectedAsset.base64) {
          base64Image = `data:image/jpeg;base64,${selectedAsset.base64}`;
        } else {
          // Web fallback: Read blob file URI into a real base64 string
          const response = await fetch(selectedAsset.uri);
          const blob = await response.blob();
          base64Image = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }

        updateAvatar(base64Image);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick an avatar image.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <TouchableOpacity style={styles.avatarCircle} onPress={handleChangeAvatar}>
          {user?.profileImage ? (
            <Image
              source={{ uri: user.profileImage.startsWith('http') || user.profileImage.startsWith('data:') ? user.profileImage : `${serverUrl.replace('/api', '')}${user.profileImage}` }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>{user?.fullName?.slice(0, 2).toUpperCase() || 'US'}</Text>
          )}
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraIcon}>📷</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, styles.roleBadge]}>
            <Text style={styles.badgeText}>{user?.role?.toUpperCase() || 'BUYER'}</Text>
          </View>

          {user?.kycStatus === 'verified' ? (
            <View style={[styles.badge, styles.verifiedBadge]}>
              <Text style={styles.badgeText}>✓ KYC APPROVED</Text>
            </View>
          ) : user?.kycStatus === 'pending' ? (
            <View style={[styles.badge, styles.pendingBadge]}>
              <Text style={styles.badgeText}>⏳ KYC PENDING</Text>
            </View>
          ) : user?.kycStatus === 'rejected' ? (
            <View style={[styles.badge, styles.rejectedBadge]}>
              <Text style={styles.badgeText}>❌ KYC REJECTED</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.unverifiedBadge]}>
              <Text style={styles.badgeText}>⚠️ UNVERIFIED KYC</Text>
            </View>
          )}
        </View>

        <View style={styles.separator} />

        {/* Locked Name Policy Details */}
        <View style={styles.policyCard}>
          <Text style={styles.policyTitle}>🔒 Profile Name Lock Policy</Text>
          <Text style={styles.policyText}>
            Name locked due to security reasons
          </Text>
        </View>

        {/* Action Buttons */}
        {user?.role?.toLowerCase() === 'agent' && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('CreateListing')}
          >
            <Text style={styles.actionBtnText}>📢 Create New Listing</Text>
          </TouchableOpacity>
        )}

        {user?.role?.toLowerCase() === 'agent' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.paymentBtn]}
            onPress={() => navigation.navigate('Payments')}
          >
            <Text style={styles.actionBtnText}>💳 Payments & Transactions</Text>
          </TouchableOpacity>
        )}

        {/* KYC verification link for agents & buyers/renters */}
        {user?.role?.toLowerCase() !== 'admin' && user?.kycStatus !== 'verified' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.kycBtn]}
            onPress={() => navigation.navigate('KycScreen')}
          >
            <Text style={styles.actionBtnText}>🛡️ Identity Verification (KYC)</Text>
          </TouchableOpacity>
        )}

        {/* Saved Favorites Trigger button */}
        {(user?.role?.toLowerCase() === 'buyer' || user?.role?.toLowerCase() === 'renter') && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.favBtn]}
            onPress={() => setFavoritesModalVisible(true)}
          >
            <Text style={styles.actionBtnText}>❤️ Saved Favorites</Text>
          </TouchableOpacity>
        )}

        {/* Admin Dashboard Entry Button */}
        {user?.role?.toLowerCase() === 'admin' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.adminBtn]}
            onPress={() => navigation.navigate('AdminDashboard')}
          >
            <Text style={styles.actionBtnText}>💼 Admin Control Center</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Saved Favorites Modal overlay */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={favoritesModalVisible}
        onRequestClose={() => setFavoritesModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>❤️ Saved Favorites</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {mockFavorites.map((fav) => (
                <TouchableOpacity
                  key={fav.id}
                  style={styles.favItem}
                  onPress={() => {
                    setFavoritesModalVisible(false);
                    navigation.navigate('PropertyDetail', { id: fav.id });
                  }}
                >
                  <Image source={{ uri: fav.image }} style={styles.favThumb} />
                  <View style={styles.favInfo}>
                    <Text style={styles.favTitle} numberOfLines={1}>{fav.title}</Text>
                    <Text style={styles.favMeta}>{fav.city} | {fav.price.toLocaleString()} FCFA{fav.category === 'Rent' ? ' / month' : ''}</Text>
                    <Text style={styles.favTitleNum}>📜 Title: {fav.landTitleNumber}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setFavoritesModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Close Saved Favorites</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 16
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2563eb'
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563eb',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1e293b'
  },
  cameraIcon: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4
  },
  email: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 20
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginHorizontal: 4
  },
  roleBadge: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#475569'
  },
  verifiedBadge: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#2563eb'
  },
  pendingBadge: {
    backgroundColor: '#7c2d12',
    borderWidth: 1,
    borderColor: '#f97316'
  },
  rejectedBadge: {
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#ef4444'
  },
  unverifiedBadge: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#64748b'
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold'
  },
  separator: {
    height: 1,
    width: '100%',
    backgroundColor: '#334155',
    marginBottom: 20
  },
  policyCard: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155'
  },
  policyTitle: {
    color: '#cbd5e1',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4
  },
  policyText: {
    color: '#cbd5e1',
    fontSize: 10,
    lineHeight: 15
  },
  actionBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  },
  paymentBtn: {
    backgroundColor: '#7c3aed'
  },
  adminBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2
  },
  adminBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  },
  logoutBtn: {
    backgroundColor: '#991b1b',
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center'
  },
  logoutBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  },
  favBtn: {
    backgroundColor: '#3b82f6',
    marginBottom: 10
  },
  kycBtn: {
    backgroundColor: '#1d4ed8',
    marginBottom: 10
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '85%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center'
  },
  favItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  favThumb: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12
  },
  favInfo: {
    flex: 1
  },
  favTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12
  },
  favMeta: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2
  },
  favTitleNum: {
    color: '#2563eb',
    fontSize: 9,
    marginTop: 2
  },
  closeBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16
  },
  closeBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  }
});
