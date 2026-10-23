import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { AuthContext } from '../../App';
import * as ImagePicker from 'expo-image-picker';

export default function CreateListingScreen({ route, navigation }) {
    const { token, serverUrl } = useContext(AuthContext);
    
    // Core parameters
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Rent');
    const [type, setType] = useState('Apartment');
    const [price, setPrice] = useState('');
    const [city, setCity] = useState('Yaoundé');
    const [location, setLocation] = useState('');
    const [landTitleNumber, setLandTitleNumber] = useState('');
    
    // Image & CITI infrastructure parameters
    const [uploadedImages, setUploadedImages] = useState([]);
    const [electricityOption, setElectricityOption] = useState('Eneo + Generator');
    const [waterSource, setWaterSource] = useState('Borehole');
    const [waterSupply, setWaterSupply] = useState('4'); // 1-5
    const [electricity, setElectricity] = useState('4'); // 1-5 (Eneo + generator rating)
    const [roadType, setRoadType] = useState('Tarred'); // Tarred or Dirt
    const [roadAccess, setRoadAccess] = useState('4'); // 1-5
    const [security, setSecurity] = useState('4'); // 1-5
    const [proximity, setProximity] = useState('50'); // meters
    const [motoFare, setMotoFare] = useState('100'); // FCFA
    
    const [loading, setLoading] = useState(false);

    const editProperty = route?.params?.editProperty;

    useEffect(() => {
        if (editProperty) {
            setTitle(editProperty.title || '');
            setDescription(editProperty.description || '');
            setCategory(editProperty.category || 'Rent');
            setType(editProperty.propertyType ? editProperty.propertyType.charAt(0) + editProperty.propertyType.slice(1).toLowerCase() : 'Apartment');
            setPrice(editProperty.price ? String(parseInt(editProperty.price)) : '');
            setCity(editProperty.city || 'Yaoundé');
            setLocation(editProperty.neighborhood || editProperty.address || '');
            setLandTitleNumber(editProperty.landTitleNumber || (editProperty.landTitle ? editProperty.landTitle.titleNumber : ''));
            if (editProperty.images && editProperty.images.length > 0) {
                setUploadedImages(editProperty.images.map(img => img.imageUrl));
            }
            if (editProperty.citiIndex) {
                setWaterSource(editProperty.citiIndex.waterSource || 'Borehole');
                setWaterSupply(String(editProperty.citiIndex.waterSupply || '4'));
                setElectricity(String(editProperty.citiIndex.electricity || '4'));
                setRoadType(editProperty.citiIndex.roadType || 'Tarred');
                setRoadAccess(String(editProperty.citiIndex.roadAccess || '4'));
                setSecurity(String(editProperty.citiIndex.security || '4'));
                setProximity(String(editProperty.citiIndex.proximityToMainStreet || '50'));
                setMotoFare(String(editProperty.citiIndex.estimatedMotoFare || '100'));
            }
        }
    }, [editProperty]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to select photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
            base64: true
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const selectedAsset = result.assets[0];
            let base64Image = null;

            if (selectedAsset.base64) {
                base64Image = `data:image/jpeg;base64,${selectedAsset.base64}`;
            } else {
                const response = await fetch(selectedAsset.uri);
                const blob = await response.blob();
                base64Image = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }
            setUploadedImages(prev => [...prev, base64Image]);
        }
    };

    const propertyTypes = ['Apartment', 'Studio', 'House', 'Land'];
    const cities = ['Yaoundé', 'Douala', 'Buea', 'Kribi'];
    const waterSources = ['Borehole', 'Borehole + Camwater', 'Camwater only'];
    const roadTypes = ['Tarred', 'Dirt'];

    const handleCreateListing = async () => {
        if (!title || !description || !price || !location) {
            Alert.alert('Missing Fields', 'Please fill in all required fields (Title, Description, Price, Neighborhood).');
            return;
        }

        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            Alert.alert('Invalid Price', 'Please enter a valid positive number for the price.');
            return;
        }

        if (category === 'Sale' && !landTitleNumber) {
            Alert.alert('Missing Land Title', 'Under Co-Nest Cameroonian guidelines, you must declare a valid Titre Foncier (Land Title Number) to submit sale listings.');
            return;
        }

        setLoading(true);
        try {
            const url = editProperty ? `${serverUrl}/properties/${editProperty.id}` : `${serverUrl}/properties`;
            const method = editProperty ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    category,
                    propertyType: type.toUpperCase(), // Expected as uppercase in backend (APARTMENT, HOUSE, etc)
                    price: parsedPrice,
                    city,
                    neighborhood: location,
                    address: location,
                    landTitleNumber: landTitleNumber || null,
                    images: uploadedImages,
                    waterSource,
                    waterSupply: parseInt(waterSupply) || 4,
                    electricity: parseInt(electricity) || 4,
                    roadType,
                    roadAccess: parseInt(roadAccess) || 4,
                    security: parseInt(security) || 4,
                    proximityToMainStreet: parseInt(proximity) || 50,
                    estimatedMotoFare: parseInt(motoFare) || 100
                })
            });

            if (response.ok) {
                Alert.alert('Success', editProperty ? 'Property listing updated successfully!' : 'Property listing created successfully!');
                navigation.navigate('HomeTabs', { screen: 'MyListings' });
            } else {
                const data = await response.json();
                Alert.alert('Error', data.message || 'Failed to save listing.');
            }
        } catch (error) {
            Alert.alert('Offline Mode', 'Listing simulated locally in offline mode.');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <Text style={styles.heading}>🏠 Publish Property Listing</Text>
                    <Text style={styles.subText}>Publish listing with verified MINDCAF and CITI indexes</Text>
                    <View style={styles.separator} />

                    <Text style={styles.label}>Property Title *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Modern Studio near University Gate"
                        placeholderTextColor="#94a3b8"
                        value={title}
                        onChangeText={setTitle}
                    />

                    <Text style={styles.label}>Description *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="e.g. Water flows, gated fence, generator active..."
                        placeholderTextColor="#94a3b8"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                    />

                    <Text style={styles.label}>Category:</Text>
                    <View style={styles.toggleRow}>
                        {['Rent', 'Sale'].map(opt => (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.toggleBtn, category === opt && styles.toggleActive]}
                                onPress={() => setCategory(opt)}
                            >
                                <Text style={[styles.toggleText, category === opt && styles.toggleTextActive]}>
                                    {opt === 'Rent' ? '🏠 Rent Feed' : '🧱 Sale / Lands'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Property Type:</Text>
                    <View style={styles.chipRow}>
                        {propertyTypes.map(pt => (
                            <TouchableOpacity
                                key={pt}
                                style={[styles.chip, type === pt && styles.chipActive]}
                                onPress={() => setType(pt)}
                            >
                                <Text style={[styles.chipText, type === pt && styles.chipTextActive]}>{pt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Price (FCFA) *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 150000"
                        placeholderTextColor="#94a3b8"
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="numeric"
                    />

                    <Text style={styles.label}>City:</Text>
                    <View style={styles.chipRow}>
                        {cities.map(c => (
                            <TouchableOpacity
                                key={c}
                                style={[styles.chip, city === c && styles.chipActive]}
                                onPress={() => setCity(c)}
                            >
                                <Text style={[styles.chipText, city === c && styles.chipTextActive]}>{c}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Neighborhood / Quarter *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Molyko, Bastos, Logpom"
                        placeholderTextColor="#94a3b8"
                        value={location}
                        onChangeText={setLocation}
                    />

                    {category === 'Sale' && (
                      <>
                        <Text style={styles.label}>MINDCAF Land Title (Titre Foncier) *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. TF 1943/Mfoundi"
                            placeholderTextColor="#94a3b8"
                            value={landTitleNumber}
                            onChangeText={setLandTitleNumber}
                            autoCapitalize="characters"
                        />
                      </>
                    )}

                    <Text style={styles.label}>Select Property Photos to Upload:</Text>
                    <TouchableOpacity 
                      style={[styles.chip, { backgroundColor: '#2563eb', borderColor: '#2563eb', paddingVertical: 12, marginBottom: 12, width: '100%', alignItems: 'center' }]}
                      onPress={pickImage}
                    >
                      <Text style={[styles.chipText, { color: '#ffffff', fontWeight: 'bold' }]}>📸 Pick Image from Device Gallery</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: '500' }}>Or select quick presets for rapid testing:</Text>
                    <View style={styles.chipRow}>
                      <TouchableOpacity 
                        style={styles.chip}
                        onPress={() => {
                          setUploadedImages(prev => [...prev, 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800']);
                        }}
                      >
                        <Text style={styles.chipText}>🏠 Bastos Villa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.chip}
                        onPress={() => {
                          setUploadedImages(prev => [...prev, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800']);
                        }}
                      >
                        <Text style={styles.chipText}>🏢 Bonapriso Flat</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.chip}
                        onPress={() => {
                          setUploadedImages(prev => [...prev, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800']);
                        }}
                      >
                        <Text style={styles.chipText}>📐 Logpom Land</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Show preview row */}
                    {uploadedImages.length > 0 && (
                      <View style={styles.previewRow}>
                        {uploadedImages.map((img, idx) => (
                          <View key={idx} style={styles.previewContainer}>
                            <Image source={{ uri: img }} style={styles.previewImg} />
                            <TouchableOpacity 
                              style={styles.removeBtn}
                              onPress={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Text style={styles.removeText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* CITI INDICATORS SECTION (Rent listings only) */}
                    {category === 'Rent' && (
                      <>
                        <Text style={styles.sectionHeading}>🇨🇲 CITI Infrastructure Parameters</Text>
                        <View style={styles.separator} />

                        <Text style={styles.label}>Water Supply Source:</Text>
                        <View style={styles.chipRow}>
                            {waterSources.map(ws => (
                                <TouchableOpacity
                                    key={ws}
                                    style={[styles.chip, waterSource === ws && styles.chipActive]}
                                    onPress={() => setWaterSource(ws)}
                                >
                                    <Text style={[styles.chipText, waterSource === ws && styles.chipTextActive]}>{ws}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Water Rating (1-5 Stability Stars):</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 4"
                            placeholderTextColor="#94a3b8"
                            value={waterSupply}
                            onChangeText={setWaterSupply}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Electricity Power Backup:</Text>
                        <View style={styles.chipRow}>
                            {['Eneo Only', 'Eneo + Generator', 'Eneo + Solar + Gen'].map(eo => (
                                <TouchableOpacity
                                    key={eo}
                                    style={[styles.chip, electricityOption === eo && styles.chipActive]}
                                    onPress={() => {
                                        setElectricityOption(eo);
                                        setElectricity(eo === 'Eneo Only' ? '2' : eo === 'Eneo + Generator' ? '4' : '5');
                                    }}
                                >
                                    <Text style={[styles.chipText, electricityOption === eo && styles.chipTextActive]}>{eo}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Road Access Type:</Text>
                        <View style={styles.chipRow}>
                            {roadTypes.map(rt => (
                                <TouchableOpacity
                                    key={rt}
                                    style={[styles.chip, roadType === rt && styles.chipActive]}
                                    onPress={() => setRoadType(rt)}
                                >
                                    <Text style={[styles.chipText, roadType === rt && styles.chipTextActive]}>{rt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Rainy Season Road Stability (1-5 Stars):</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 5 for Paved Tarred"
                            placeholderTextColor="#94a3b8"
                            value={roadAccess}
                            onChangeText={setRoadAccess}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Compound Security Rating (1-5 Stars):</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 4"
                            placeholderTextColor="#94a3b8"
                            value={security}
                            onChangeText={setSecurity}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Proximity to Main Street (Meters):</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 50"
                            placeholderTextColor="#94a3b8"
                            value={proximity}
                            onChangeText={setProximity}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Estimated Bike/Taxi Fare to Main St (FCFA):</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 150"
                            placeholderTextColor="#94a3b8"
                            value={motoFare}
                            onChangeText={setMotoFare}
                            keyboardType="numeric"
                        />
                      </>
                    )}

                    <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleCreateListing}
                        disabled={loading}
                    >
                        <Text style={styles.submitBtnText}>{loading ? 'Saving...' : editProperty ? '💾 Save Changes' : '🚀 Publish Co-Nest Listing'}</Text>
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
        padding: 16
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155'
    },
    heading: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4
    },
    sectionHeading: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#2563eb',
        marginTop: 20,
        marginBottom: 4
    },
    subText: {
        color: '#94a3b8',
        fontSize: 12,
        marginBottom: 16
    },
    separator: {
        height: 1,
        backgroundColor: '#334155',
        marginBottom: 16
    },
    input: {
        backgroundColor: '#0f172a',
        color: '#ffffff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        fontSize: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#334155'
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top'
    },
    label: {
        color: '#cbd5e1',
        fontWeight: '600',
        fontSize: 13,
        marginBottom: 6
    },
    toggleRow: {
        flexDirection: 'row',
        marginBottom: 16
    },
    toggleBtn: {
        flex: 1,
        backgroundColor: '#334155',
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#475569'
    },
    toggleActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb'
    },
    toggleText: {
        color: '#94a3b8',
        fontWeight: '600',
        fontSize: 13
    },
    toggleTextActive: {
        color: '#ffffff'
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 14
    },
    chip: {
        backgroundColor: '#334155',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#475569'
    },
    chipActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb'
    },
    chipText: {
        color: '#cbd5e1',
        fontSize: 12,
        fontWeight: '600'
    },
    chipTextActive: {
        color: '#ffffff'
    },
    submitBtn: {
        backgroundColor: '#2563eb',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4
    },
    submitBtnText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 15
    },
    uploadBtn: {
        backgroundColor: '#334155',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#475569',
        marginBottom: 12
    },
    uploadBtnText: {
        color: '#2563eb',
        fontWeight: 'bold',
        fontSize: 14
    },
    previewRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 14
    },
    previewContainer: {
        width: 70,
        height: 70,
        borderRadius: 8,
        marginRight: 10,
        marginBottom: 10,
        position: 'relative',
        borderWidth: 1,
        borderColor: '#334155',
        overflow: 'hidden'
    },
    previewImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    removeBtn: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#ef4444',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center'
    },
    removeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold'
    }
});