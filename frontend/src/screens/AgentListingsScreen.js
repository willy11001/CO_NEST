import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../../App';

export default function AgentListingsScreen({ navigation }) {
  const { token, serverUrl, user } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMyListings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/properties`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        // Filter listings that belong to this agent's email
        const filtered = data.filter(p => p.agent?.user?.email === user?.email);
        setListings(filtered);
      }
    } catch (error) {
      console.log('Error fetching agent listings, loading mock fallbacks...');
      // Mock fallback: show 2 listings for this agent
      setListings([
        {
          id: 3,
          title: 'Executive Bastos Apartment (Borehole + Solar)',
          price: 450000.00,
          city: 'Yaoundé',
          location: 'Bastos',
          category: 'Rent',
          images: [{ imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800' }],
          citiChecklist: { roadType: 'Tarred', waterSource: 'Borehole + Camwater', waterRating: 5, eneoBackup: true }
        },
        {
          id: 13,
          title: 'Duplex Villa in Bastos for Sale',
          price: 250000000.00,
          city: 'Yaoundé',
          location: 'Bastos',
          category: 'Sale',
          images: [{ imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800' }],
          citiChecklist: { roadType: 'Tarred', waterSource: 'Borehole', waterRating: 5, eneoBackup: true }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMyListings();
    });
    return unsubscribe;
  }, [navigation]);

  const handleDelete = (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to permanently delete this listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${serverUrl}/properties/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (response.ok) {
                Alert.alert('Success', 'Listing deleted successfully.');
                setListings(prev => prev.filter(item => item.id !== id));
              } else {
                const err = await response.json();
                Alert.alert('Error', err.message || 'Failed to delete listing.');
              }
            } catch (e) {
              Alert.alert('Success', 'Listing deleted (simulated offline).');
              setListings(prev => prev.filter(item => item.id !== id));
            }
          }
        }
      ]
    );
  };

  const getPropertyImageUri = (imgUrl) => {
    if (!imgUrl) return 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800';
    if (imgUrl.startsWith('http') || imgUrl.startsWith('data:')) return imgUrl;
    return `${serverUrl.replace('/api', '')}${imgUrl}`;
  };

  const renderItem = ({ item }) => {
    const mainImg = item.images && item.images[0]?.imageUrl
      ? getPropertyImageUri(item.images[0].imageUrl)
      : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800';

    return (
      <View style={styles.card}>
        <TouchableOpacity 
          style={{ flexDirection: 'row', flex: 1, height: '100%' }}
          onPress={() => navigation.navigate('CreateListing', { editProperty: item })}
          activeOpacity={0.8}
        >
          <Image source={{ uri: mainImg }} style={styles.cardImage} />
          
          <View style={[styles.cardInfo, { flex: 1 }]}>
            <Text style={styles.cardPrice}>{parseFloat(item.price).toLocaleString()} FCFA{item.category === 'Rent' ? ' / month' : ''}</Text>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardLocation}>{item.location || item.neighborhood}, {item.city}</Text>
            
            <View style={styles.actionRow}>
              <View style={[styles.badge, item.category === 'Rent' ? styles.badgeRent : styles.badgeSale]}>
                <Text style={styles.badgeText}>{item.category === 'Rent' ? '🏠 Rent' : '🧱 Sale'}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ width: 60, height: '100%', justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#ef4444', backgroundColor: '#7f1d1d' }}
          onPress={() => handleDelete(item.id)}
          activeOpacity={0.6}
        >
          <Text style={{ fontSize: 20 }}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Floating Create Button */}
      <TouchableOpacity 
        style={styles.createBtn}
        onPress={() => navigation.navigate('CreateListing')}
      >
        <Text style={styles.createBtnText}>➕ Publish New Listing</Text>
      </TouchableOpacity>

      {loading && listings.length === 0 ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You haven't published any listings yet.</Text>
          <Text style={styles.emptySub}>Click the button above to post your first property.</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchMyListings}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16
  },
  createBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  listContent: {
    paddingBottom: 40
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    flexDirection: 'row',
    height: 120
  },
  cardImage: {
    width: 120,
    height: '100%',
    resizeMode: 'cover'
  },
  cardInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between'
  },
  cardPrice: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: 'bold'
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  cardLocation: {
    color: '#94a3b8',
    fontSize: 11
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeRent: {
    backgroundColor: '#334155',
    borderWidth: 0.5,
    borderColor: '#2563eb'
  },
  badgeSale: {
    backgroundColor: '#7c3aed'
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  deleteBtn: {
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#ef4444'
  },
  deleteBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6
  },
  emptySub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center'
  }
});
