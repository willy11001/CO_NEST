import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, ScrollView } from 'react-native';
import { AuthContext } from '../../App';

export default function ExploreScreen({ navigation }) {
  const { token, serverUrl } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Rent'); // Rent or Sale
  const [city, setCity] = useState(''); // Yaoundé, Douala, Buea, Kribi
  const [roadType, setRoadType] = useState(''); // Tarred or Dirt
  const [eneoBackup, setEneoBackup] = useState(false);
  const [propertyType, setPropertyType] = useState('');

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setPropertyType('');
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = `?category=${category}`;
      if (city) query += `&city=${city}`;
      if (roadType) query += `&roadType=${roadType}`;
      if (eneoBackup) query += `&eneoBackup=true`;
      if (propertyType) query += `&propertyType=${propertyType}`;
      if (search) query += `&search=${search}`;

      const response = await fetch(`${serverUrl}/properties${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const mapped = data.map(item => {
        if (item.landTitle) {
          item.landTitleNumber = item.landTitle.titleNumber;
        }
        if (item.citiIndex) {
          item.citiChecklist = {
            roadType: item.citiIndex.roadType || 'Dirt',
            waterSource: item.citiIndex.waterSource || 'Borehole',
            waterRating: item.citiIndex.waterSupply,
            eneoBackup: item.citiIndex.electricity >= 4,
            rainySeasonPassable: item.citiIndex.roadAccess >= 3,
            estimatedMotoFare: item.citiIndex.estimatedMotoFare || 150,
            securityLevel: item.citiIndex.security || 3,
            proximityToMainStreet: item.citiIndex.proximityToMainStreet || 100
          };
        }
        if (item.agent) {
          item.owner = {
            id: item.agent.id,
            name: item.agent.user?.fullName,
            email: item.agent.user?.email,
            kycStatus: item.agent.isVerified ? 'verified' : 'unverified'
          };
        }
        return item;
      });
      setListings(mapped);
    } catch (error) {
      console.log('Error fetching listings:', error);
      // Mock data fallback for demonstration if API fails to sync
      const allMock = [
        {
          id: 1,
          title: 'Prime Plot of Land near Logpom Junction',
          description: 'Excellent residential land of 1200 sqm available for sale immediately. Close to the main road.',
          category: 'Sale',
          type: 'Land',
          price: 25000000.00,
          city: 'Douala',
          location: 'Logpom',
          landTitleNumber: 'TF 6720/Wouri',
          owner: { name: 'Jean Pierre', kycStatus: 'verified' },
          images: [{ imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800' }],
          citiChecklist: {
            roadType: 'Dirt',
            waterSource: 'Borehole',
            waterRating: 4.0,
            eneoBackup: false,
            rainySeasonPassable: true,
            estimatedMotoFare: 100,
            securityLevel: 4
          }
        },
        {
          id: 2,
          title: 'Modern Student Studio in Molyko',
          description: 'Fully tiled studio apartment located 5 minutes from UB junction.',
          category: 'Rent',
          type: 'Studio',
          price: 65000.00,
          city: 'Buea',
          location: 'Molyko',
          landTitleNumber: 'TF 4432/Fako',
          owner: { name: 'Jean Pierre', kycStatus: 'verified' },
          images: [{ imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800' }],
          citiChecklist: {
            roadType: 'Dirt',
            waterSource: 'Camwater',
            waterRating: 2.1,
            eneoBackup: false,
            rainySeasonPassable: false,
            estimatedMotoFare: 250,
            securityLevel: 3
          }
        },
        {
          id: 3,
          title: 'Luxury 2-Bedroom Apartment in Bastos',
          description: 'Elegant apartment in high-security neighborhood of Bastos.',
          category: 'Rent',
          type: 'Apartment',
          price: 350000.00,
          city: 'Yaoundé',
          location: 'Bastos',
          landTitleNumber: 'TF 8912/Mfoundi',
          owner: { name: 'Jean Pierre', kycStatus: 'verified' },
          images: [{ imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800' }],
          citiChecklist: {
            roadType: 'Tarred',
            waterSource: 'Camwater',
            waterRating: 4.5,
            eneoBackup: true,
            rainySeasonPassable: true,
            estimatedMotoFare: 0,
            securityLevel: 5
          }
        }
      ];
      setListings(allMock.filter(item => item.category === category && (!city || item.city === city)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [category, city, propertyType, roadType, eneoBackup]);

  const getPropertyImageUri = (imgUrl) => {
    if (!imgUrl) return 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800';
    if (imgUrl.startsWith('http') || imgUrl.startsWith('data:')) return imgUrl;
    return `${serverUrl.replace('/api', '')}${imgUrl}`;
  };

  const renderPropertyCard = ({ item }) => {
    const mainImg = item.images && item.images[0]?.imageUrl
      ? getPropertyImageUri(item.images[0].imageUrl)
      : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}
      >
        <Image source={{ uri: mainImg }} style={styles.cardImage} />

        {/* Land Title Badge */}
        <View style={styles.badgeContainer}>
          {item.category === 'Sale' && (
            item.landTitleNumber ? (
              <View style={[styles.badge, styles.badgeVerified]}>
                <Text style={styles.badgeText}>📜 TF Registered</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeWarning]}>
                <Text style={styles.badgeText}>⚠️ No Land Title</Text>
              </View>
            )
          )}
          {item.owner?.kycStatus === 'verified' && (
            <View style={[styles.badge, styles.badgeKyc]}>
              <Text style={styles.badgeText}>🛡️ Agent ID Verified</Text>
            </View>
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardPrice}>{parseFloat(item.price).toLocaleString()} FCFA{item.category === 'Rent' ? ' / month' : ''}</Text>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardLocation}>{item.location}, {item.city}</Text>

          {/* Infrastructure CITI Indicators */}
          {item.citiChecklist && (
            <View style={styles.citiRow}>
              <Text style={styles.citiBadge}>💧 Water: {item.citiChecklist.waterRating}★</Text>
              <Text style={styles.citiBadge}>⚡ solar: {item.citiChecklist.eneoBackup ? 'Yes' : 'No'}</Text>
              <Text style={styles.citiBadge}>🛣️ Road: {item.citiChecklist.roadType}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Category selector */}
      <View style={styles.categoryTabs}>
        <TouchableOpacity
          style={[styles.tabButton, category === 'Rent' && styles.tabActive]}
          onPress={() => handleCategoryChange('Rent')}
        >
          <Text style={[styles.tabText, category === 'Rent' && styles.tabTextActive]}>🏠 Rent Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, category === 'Sale' && styles.tabActive]}
          onPress={() => handleCategoryChange('Sale')}
        >
          <Text style={[styles.tabText, category === 'Sale' && styles.tabTextActive]}>🧱 Sale / Lands</Text>
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      <View style={styles.filterBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search location or title..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={fetchListings}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chip, !city && styles.chipActive]}
            onPress={() => setCity('')}
          >
            <Text style={styles.chipText}>All Cities</Text>
          </TouchableOpacity>
          {['Yaoundé', 'Douala', 'Buea', 'Kribi'].map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, city === c && styles.chipActive]}
              onPress={() => setCity(c)}
            >
              <Text style={styles.chipText}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chipsRow, { marginTop: 8 }]}>
          <TouchableOpacity
            style={[styles.chip, !propertyType && styles.chipActive]}
            onPress={() => setPropertyType('')}
          >
            <Text style={styles.chipText}>All Types</Text>
          </TouchableOpacity>
          {(category === 'Rent' ? ['Apartment', 'Studio', 'House'] : ['Land', 'House']).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, propertyType === t && styles.chipActive]}
              onPress={() => setPropertyType(t)}
            >
              <Text style={styles.chipText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPropertyCard}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No properties matching selection.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  categoryTabs: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 6
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8
  },
  tabActive: {
    backgroundColor: '#2563eb'
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: 'bold',
    fontSize: 14
  },
  tabTextActive: {
    color: '#ffffff'
  },
  filterBox: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  searchInput: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 8
  },
  chipsRow: {
    flexDirection: 'row',
    marginTop: 4
  },
  chip: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#475569'
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  chipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600'
  },
  list: {
    padding: 12
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155'
  },
  cardImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover'
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row'
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6
  },
  badgeVerified: {
    backgroundColor: '#2563eb'
  },
  badgeWarning: {
    backgroundColor: '#f59e0b'
  },
  badgeKyc: {
    backgroundColor: '#1d4ed8'
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  cardInfo: {
    padding: 12
  },
  cardPrice: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2
  },
  cardLocation: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8
  },
  citiRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
    justifyContent: 'space-between'
  },
  citiBadge: {
    color: '#cbd5e1',
    fontSize: 11,
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  empty: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14
  }
});
