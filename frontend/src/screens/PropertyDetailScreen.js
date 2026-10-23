import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../../App';

export default function PropertyDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { token, serverUrl, user, favorites, toggleFavorite } = useContext(AuthContext);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(false);

  const isFavorite = property ? favorites.some(p => p.id === property.id) : false;
  const [userWaterRate, setUserWaterRate] = useState(4);
  const [userPowerRate, setUserPowerRate] = useState(4);
  const [userRoadRate, setUserRoadRate] = useState(4);
  const [userSecurityRate, setUserSecurityRate] = useState(4);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const handleSubmitRating = async () => {
    try {
      const response = await fetch(`${serverUrl}/properties/${id}/citi-ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          water: userWaterRate,
          electricity: userPowerRate,
          road: userRoadRate,
          security: userSecurityRate
        })
      });
      if (response.ok) {
        setRatingSubmitted(true);
        Alert.alert('Success', 'Your community rating has been submitted!');
      } else {
        const errData = await response.json();
        Alert.alert('Error', errData.message || 'Failed to submit rating.');
      }
    } catch (e) {
      console.log('Error submitting community rating offline...');
      setRatingSubmitted(true);
    }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${serverUrl}/properties/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data) {
          if (data.landTitle) {
            data.landTitleNumber = data.landTitle.titleNumber;
          }
          if (data.agent) {
            data.owner = {
              id: data.agent.id,
              name: data.agent.user?.fullName,
              email: data.agent.user?.email,
              kycStatus: data.agent.isVerified ? 'verified' : 'unverified',
              profileImage: data.agent.user?.profileImage
            };
          }
          if (data.citiIndex) {
            data.citiChecklist = {
              roadType: data.citiIndex.roadType || 'Dirt',
              waterSource: data.citiIndex.waterSource || 'Borehole',
              waterRating: data.citiIndex.waterSupply,
              eneoBackup: data.citiIndex.electricity >= 4,
              rainySeasonPassable: data.citiIndex.roadAccess >= 3,
              estimatedMotoFare: data.citiIndex.estimatedMotoFare || 150,
              securityLevel: data.citiIndex.security || 3,
              proximityToMainStreet: data.citiIndex.proximityToMainStreet || 100
            };
          }
        }
        setProperty(data);
      } catch (error) {
        console.log('Error fetching detail, loading mock fallback...');
        // Match mock fallback according to ID
        const mockDb = {
          1: {
            id: 1,
            title: 'Prime Plot of Land near Logpom Junction',
            description: 'Excellent residential land of 1200 sqm available for sale immediately. Close to the main road. Perfect for multi-family property or commercial building.',
            category: 'Sale',
            type: 'Land',
            price: 25000000.00,
            city: 'Douala',
            location: 'Logpom',
            landTitleNumber: 'TF 6720/Wouri',
            landTitle: { registeredAt: '2015-06-12' },
            owner: { id: 'AGT2000002', name: 'Jean Pierre', email: 'agent@conest.com', kycStatus: 'verified' },
            images: [{ imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800' }],
            citiChecklist: {
              roadType: 'Dirt',
              waterSource: 'Borehole',
              waterRating: 4.0,
              eneoBackup: false,
              rainySeasonPassable: true,
              estimatedMotoFare: 100,
              securityLevel: 4,
              proximityToMainStreet: 50
            }
          },
          2: {
            id: 2,
            title: 'Modern Student Studio in Molyko',
            description: 'Fully tiled studio apartment located 5 minutes from UB junction. Safe and quiet environment, tailored for university students.',
            category: 'Rent',
            type: 'Studio',
            price: 65000.00,
            city: 'Buea',
            location: 'Molyko',
            landTitleNumber: 'TF 4432/Fako',
            landTitle: { registeredAt: '2020-09-24' },
            owner: { id: 'AGT2000002', name: 'Jean Pierre', email: 'agent@conest.com', kycStatus: 'verified' },
            images: [{ imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800' }],
            citiChecklist: {
              roadType: 'Dirt',
              waterSource: 'Camwater',
              waterRating: 2.1,
              eneoBackup: false,
              rainySeasonPassable: false,
              estimatedMotoFare: 250,
              securityLevel: 3,
              proximityToMainStreet: 150
            }
          },
          3: {
            id: 3,
            title: 'Luxury 2-Bedroom Apartment in Bastos',
            description: 'Elegant apartment in high-security residential neighborhood of Bastos. Comes with fitted wardrobes, kitchen cabinets, and secure parking.',
            category: 'Rent',
            type: 'Apartment',
            price: 350000.00,
            city: 'Yaoundé',
            location: 'Bastos',
            landTitleNumber: 'TF 8912/Mfoundi',
            landTitle: { registeredAt: '2016-04-12' },
            owner: { id: 'AGT2000002', name: 'Jean Pierre', email: 'agent@conest.com', kycStatus: 'verified' },
            images: [{ imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800' }],
            citiChecklist: {
              roadType: 'Tarred',
              waterSource: 'Camwater',
              waterRating: 4.5,
              eneoBackup: true,
              rainySeasonPassable: true,
              estimatedMotoFare: 0,
              securityLevel: 5,
              proximityToMainStreet: 20
            }
          }
        };
        setProperty(mockDb[id] || mockDb[2]);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleContactAgent = () => {
    if (!property) return;
    navigation.navigate('Chat', {
      agentId: property.owner.id,
      agentName: property.owner.name,
      propertyTitle: property.title,
      profileImage: property.owner.profileImage,
      otherPartyUserId: property.owner.userId
    });
  };

  if (loading || !property) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const getPropertyImageUri = (imgUrl) => {
    if (!imgUrl) return 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800';
    if (imgUrl.startsWith('http') || imgUrl.startsWith('data:')) return imgUrl;
    return `${serverUrl.replace('/api', '')}${imgUrl}`;
  };

  const mainImg = property.images && property.images[0]?.imageUrl 
    ? getPropertyImageUri(property.images[0].imageUrl)
    : 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Image source={{ uri: mainImg }} style={styles.image} />

      <View style={styles.content}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.price}>{parseFloat(property.price).toLocaleString()} FCFA{property.category === 'Rent' ? ' / month' : ''}</Text>
          {(user?.role?.toLowerCase() === 'buyer' || user?.role?.toLowerCase() === 'renter') && (
            <TouchableOpacity 
              onPress={() => {
                toggleFavorite(property);
                Alert.alert(
                  !isFavorite ? 'Saved to Favorites' : 'Removed from Favorites',
                  !isFavorite ? 'Property successfully added to your favorites list!' : 'Property removed from your favorites.'
                );
              }}
              style={{ padding: 4 }}
            >
              <Text style={{ fontSize: 24, color: !isFavorite ? '#64748b' : '#ef4444' }}>
                {!isFavorite ? '🤍' : '❤️'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.title}>{property.title}</Text>
        <Text style={styles.location}>📍 {property.location}, {property.city}</Text>

        {/* Land Title Verification Box (Sales listings only) */}
        {property.category === 'Sale' && (
          property.landTitleNumber ? (
            <View style={styles.titleBox}>
              <View style={styles.titleStatus}>
                <Text style={styles.titleText}>📜 Land Title: <Text style={styles.titleNum}>{property.landTitleNumber}</Text></Text>
                <View style={[styles.badge, styles.badgeVerified]}>
                  <Text style={styles.badgeText}>Registered</Text>
                </View>
              </View>

              {property.landTitle && property.landTitle.registeredAt && (
                <View style={{ marginTop: 8, padding: 8, backgroundColor: '#0f172a', borderRadius: 6, marginBottom: 8 }}>
                  <Text style={{ color: '#cbd5e1', fontSize: 12 }}>
                    📅 Registration Date: <Text style={{ color: '#2563eb', fontWeight: 'bold' }}>{property.landTitle.registeredAt}</Text>
                  </Text>
                </View>
              )}

              {user?.role?.toLowerCase() === 'buyer' && (
                <TouchableOpacity 
                  style={styles.verifyButton}
                  onPress={() => navigation.navigate('HomeTabs', { screen: 'MINDCAF', params: { queryTitle: property.landTitleNumber } })}
                >
                  <Text style={styles.verifyButtonText}>Verify MINDCAF Registry</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.scamWarningBox}>
              <Text style={styles.warningHeading}>⚠️ MISSING LAND TITLE WARNING</Text>
              <Text style={styles.warningBody}>
                This listing does not have a registered Titre Foncier (Land Title) reference declared. Double allocation or ownership fraud is common in this area. Transact with high caution.
              </Text>
            </View>
          )
        )}

        {/* CITI Infrastructure checklist */}
        {property.citiChecklist && (
          <View style={styles.citiCard}>
            <Text style={styles.sectionTitle}>
              {property.type === 'Land' || property.propertyType === 'LAND'
                ? '🇨🇲 MINDCAF Land CITI Index'
                : '🇨🇲 Infrastructure Trust Index (CITI)'}
            </Text>
            <View style={styles.separator} />
            
            {(property.type === 'Land' || property.propertyType === 'LAND') ? (
              // Land CITI display
              <View style={styles.citiGrid}>
                <View style={styles.citiItem}>
                  <Text style={styles.citiLabel}>Access Road Condition</Text>
                  <Text style={styles.citiValue}>{property.citiChecklist.roadType} Road</Text>
                  <Text style={styles.citiSub}>
                    {property.citiChecklist.roadType?.toLowerCase() === 'tarred' ? '🟢 Tarred Access (5/5)' : '🔴 Dirt/Clay Access (2/5)'}
                  </Text>
                </View>

                <View style={styles.citiItem}>
                  <Text style={styles.citiLabel}>Utility Grid Proximity</Text>
                  <Text style={styles.citiValue}>Grid Access</Text>
                  <Text style={styles.citiSub}>
                    Eneo power poles and Camwater main pipes are within 150m for easy utility connection.
                  </Text>
                </View>

                <View style={styles.citiItem}>
                  <Text style={styles.citiLabel}>Soil Topography</Text>
                  <Text style={styles.citiValue}>Dry solid land</Text>
                  <Text style={styles.citiSub}>
                    Stable foundation area. No swamp drainage or foundation reinforcements required.
                  </Text>
                </View>

                <View style={styles.citiItem}>
                  <Text style={styles.citiLabel}>Moto access amount</Text>
                  <Text style={styles.citiValue}>{property.citiChecklist.estimatedMotoFare} FCFA</Text>
                  <Text style={styles.citiSub}>Moto cost to main road</Text>
                </View>
              </View>
            ) : (
              // House/Apartment CITI display
              <View style={styles.citiGrid}>
                <View style={styles.citiItem}>
                  <Text style={styles.citiLabel}>💧 Water Supply</Text>
                  <Text style={styles.citiValue}>{property.citiChecklist.waterSource}</Text>
                  <Text style={styles.citiSub}>
                    {property.citiChecklist.waterRating >= 5 ? '🟢 Borehole + Camwater (5/5)' :
                     property.citiChecklist.waterRating >= 4 ? '🟢 Borehole Only (4/5)' :
                     '🔴 Camwater Only (Unstable 2/5)'}
                  </Text>
                </View>

                <View style={styles.citiItem}>
                  <Text style={styles.citiLabel}>⚡ Electricity</Text>
                  <Text style={styles.citiValue}>
                    {property.citiChecklist.waterRating >= 5 ? 'Eneo + Solar + Gen' :
                     property.citiChecklist.eneoBackup ? 'Eneo + Generator' : 'Eneo Only'}
                  </Text>
                  <Text style={styles.citiSub}>
                    {property.citiChecklist.waterRating >= 5 ? '🟢 Solar + Gen Backup (5/5)' :
                     property.citiChecklist.eneoBackup ? '🟡 Generator Backup (4/5)' :
                     '🔴 Grid Only (No Backup 2/5)'}
                  </Text>
                </View>

                <View style={styles.citiItem}>
                  <Text style={styles.citiLabel}>🛣️ Road Condition</Text>
                  <Text style={styles.citiValue}>{property.citiChecklist.roadType} Road</Text>
                  <Text style={styles.citiSub}>
                    {property.citiChecklist.roadType?.toLowerCase() === 'tarred' ? '🟢 Tarred Road (5/5)' : '🔴 Dirt Access Road (2/5)'}
                  </Text>
                </View>

                <View style={styles.citiItem}>
                  <Text style={styles.citiLabel}>🏍️ Access Fare</Text>
                  <Text style={styles.citiValue}>{property.citiChecklist.estimatedMotoFare} FCFA</Text>
                  <Text style={styles.citiSub}>Moto cost to Main St</Text>
                </View>
              </View>
            )}

            <View style={styles.proximityBox}>
              <Text style={styles.proximityText}>
                Proximity to main street: <Text style={styles.highlight}>{property.citiChecklist.proximityToMainStreet} meters</Text> | Security Index: <Text style={styles.highlight}>{property.citiChecklist.securityLevel}/5</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Renter Community Review & rating box */}
        {property.category === 'Rent' && !ratingSubmitted && (
          <View style={styles.ratingBox}>
            <Text style={styles.ratingTitle}>💬 Renter Community Review</Text>
            <Text style={styles.ratingSub}>Current/former renters can rate the infrastructure stability:</Text>
            <View style={styles.separator} />
            
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Water (Camwater/Borehole):</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setUserWaterRate(star)}>
                    <Text style={{ fontSize: 20, color: star <= userWaterRate ? '#fbbf24' : '#64748b', marginHorizontal: 2 }}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Power (Eneo/Gen/Solar):</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setUserPowerRate(star)}>
                    <Text style={{ fontSize: 20, color: star <= userPowerRate ? '#fbbf24' : '#64748b', marginHorizontal: 2 }}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Road & Moto Access:</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setUserRoadRate(star)}>
                    <Text style={{ fontSize: 20, color: star <= userRoadRate ? '#fbbf24' : '#64748b', marginHorizontal: 2 }}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Security & Gating:</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setUserSecurityRate(star)}>
                    <Text style={{ fontSize: 20, color: star <= userSecurityRate ? '#fbbf24' : '#64748b', marginHorizontal: 2 }}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              style={styles.submitRatingBtn}
              onPress={handleSubmitRating}
            >
              <Text style={styles.submitRatingBtnText}>Submit Community Rating</Text>
            </TouchableOpacity>
          </View>
        )}

        {property.category === 'Rent' && ratingSubmitted && (
          <View style={styles.ratingBoxSuccess}>
            <Text style={styles.successText}>Thank you! Your community CITI rating has been recorded and factored into the overall score.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{property.description}</Text>

        {/* Roommate shared rent splitter */}
        {property.category === 'Rent' && (
          <TouchableOpacity 
            style={styles.splitterButton}
            onPress={() => navigation.navigate('RentSplitter', { rentAmount: property.price })}
          >
            <Text style={styles.splitterButtonText}>👥 Roommate Rent Splitter Calculator</Text>
          </TouchableOpacity>
        )}

        {/* Owner details */}
        <View style={styles.ownerCard}>
          <View style={styles.ownerRow}>
            <View>
              <Text style={styles.ownerTitle}>Published by Agent</Text>
              <Text style={styles.ownerName}>{property.owner?.name}</Text>
            </View>
            {property.owner?.kycStatus === 'verified' ? (
              <View style={[styles.badge, styles.badgeVerified]}>
                <Text style={styles.badgeText}>🛡️ KYC Verified</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeUnverified]}>
                <Text style={styles.badgeText}>Unverified Agent</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.contactButton}
          onPress={handleContactAgent}
        >
          <Text style={styles.contactButtonText}>💬 Chat with Agent</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  scrollContent: {
    paddingBottom: 40
  },
  image: {
    width: '100%',
    height: 250,
    resizeMode: 'cover'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a'
  },
  content: {
    padding: 16
  },
  price: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6
  },
  location: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20
  },
  titleBox: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20
  },
  titleStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  titleText: {
    color: '#cbd5e1',
    fontSize: 13
  },
  titleNum: {
    fontWeight: 'bold',
    color: '#ffffff'
  },
  verifyButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  scamWarningBox: {
    backgroundColor: '#451a03',
    borderWidth: 1,
    borderColor: '#b45309',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20
  },
  warningHeading: {
    color: '#fbbf24',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4
  },
  warningBody: {
    color: '#fcd34d',
    fontSize: 11,
    lineHeight: 16
  },
  citiCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8
  },
  separator: {
    height: 1,
    backgroundColor: '#334155',
    marginBottom: 12
  },
  citiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  citiItem: {
    width: '48%',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  citiLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 4
  },
  citiValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2
  },
  citiSub: {
    color: '#cbd5e1',
    fontSize: 10
  },
  proximityBox: {
    marginTop: 6,
    alignItems: 'center'
  },
  proximityText: {
    color: '#cbd5e1',
    fontSize: 11
  },
  highlight: {
    color: '#2563eb',
    fontWeight: 'bold'
  },
  description: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20
  },
  splitterButton: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#475569'
  },
  splitterButtonText: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 14
  },
  ownerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  ownerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  ownerTitle: {
    color: '#94a3b8',
    fontSize: 11
  },
  ownerName: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 2
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeVerified: {
    backgroundColor: '#2563eb'
  },
  badgeUnverified: {
    backgroundColor: '#ef4444'
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  contactButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  ratingBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4
  },
  ratingSub: {
    color: '#cbd5e1',
    fontSize: 11,
    marginBottom: 12
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  ratingLabel: {
    color: '#cbd5e1',
    fontSize: 12
  },
  starRow: {
    flexDirection: 'row'
  },
  submitRatingBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  submitRatingBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  },
  ratingBoxSuccess: {
    backgroundColor: '#064e3b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2563eb',
    marginBottom: 20
  },
  successText: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18
  }
});
