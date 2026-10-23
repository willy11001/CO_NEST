import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { AuthContext } from '../../App';

export default function MindcafScreen({ route, navigation }) {
  const { token, serverUrl } = useContext(AuthContext);
  const [titleNumber, setTitleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);

  // If a land title number is passed from explore feed, auto-fill it
  const passedTitle = route.params?.queryTitle;
  useEffect(() => {
    if (passedTitle) {
      setTitleNumber(passedTitle);
      handleVerify(passedTitle);
    }
  }, [passedTitle]);

  const formatHashedName = (name) => {
    if (!name) return '';
    return name.split(' ').map(part => {
      if (part.length <= 2) return part;
      return part.slice(0, 2) + '*'.repeat(part.length - 2);
    }).join(' ');
  };

  const handleVerify = async (titleToQuery) => {
    const target = titleToQuery || titleNumber;
    if (!target) {
      Alert.alert('Error', 'Please enter a land title number or scan a QR code.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`${serverUrl}/mindcaf/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ titleNumber: target })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.log('Error verifying title, loading mock values...');
      // Fallback offline mock values
      const targetClean = target.trim();
      if (targetClean === 'TF 6720/Wouri') {
        setResult({
          verified: true,
          titleNumber: 'TF 6720/Wouri',
          ownerName: 'Elie Kamga',
          registrationDate: '2015-06-12',
          boundaries: 'North by plot 6721, South by public access road, East by Wouri river tributary, West by Logpom junction access lane',
          landArea: 1200.00,
          status: 'Disputed',
          warningCaveats: 'This title is subject to family inheritance litigation. A caveat has been placed on this land registry entry by the Douala High Court.',
          message: 'LITIGATION WARNING: This title is flagged. Read caveats carefully before payment.'
        });
      } else if (targetClean === 'TF 4432/Fako') {
        setResult({
          verified: true,
          titleNumber: 'TF 4432/Fako',
          ownerName: 'Fabiola Njoh',
          registrationDate: '2020-09-24',
          boundaries: 'North by Molyko University High Street, South by plot 4433, East by compound walls, West by secondary dirt road',
          landArea: 600.00,
          status: 'Active',
          warningCaveats: '',
          message: 'Title records matched and active.'
        });
      } else if (targetClean === 'TF 1943/Mfoundi') {
        setResult({
          verified: true,
          titleNumber: 'TF 1943/Mfoundi',
          ownerName: 'Irene Penda',
          registrationDate: '2016-04-12',
          boundaries: 'North by plot 1944, South by Bastos Main Boulevard, East by residential complex, West by public access pathway',
          landArea: 750.00,
          status: 'Active',
          warningCaveats: '',
          message: 'Title records matched and active.'
        });
      } else {
        setResult({
          verified: false,
          status: 'Not Found',
          titleNumber: targetClean,
          warningDetail: 'SCAM WARNING: This land title registry number does NOT exist in the official MINDCAF database. Transacting on this listing carries high risk of double allocation or fraud.'
        });
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.header}>MINDCAF Land Registry Verifier</Text>
        <Text style={styles.subText}>Simulated validation with the Cameroonian Ministry of Land, Survey and Land Tenure</Text>
        
        <View style={styles.searchRow}>
          <Text style={{ fontSize: 18, marginRight: 6 }}>📜</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. TF 4432/Fako"
            placeholderTextColor="#94a3b8"
            value={titleNumber}
            onChangeText={setTitleNumber}
            autoCapitalize="characters"
          />
        </View>

        <TouchableOpacity 
          style={styles.verifyBtn}
          onPress={() => handleVerify()}
          disabled={loading}
        >
          <Text style={styles.verifyBtnText}>{loading ? 'Querying MINDCAF...' : '🔍 Verify Certificate'}</Text>
        </TouchableOpacity>


      </View>

      {loading && <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 20 }} />}

      {result && (
        <View style={styles.resultBox}>
          {result.verified ? (
            <>
              <View style={styles.resultHeader}>
                <Text style={styles.resultTitle}>Title Number: {result.titleNumber}</Text>
                <View style={[styles.badge, result.status?.toUpperCase() === 'ACTIVE' ? styles.badgeActive : styles.badgeDisputed]}>
                  <Text style={styles.badgeText}>{result.status}</Text>
                </View>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.label}>Registered Owner:</Text>
                <Text style={styles.value}>{formatHashedName(result.ownerName)}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.label}>Registration Date:</Text>
                <Text style={styles.value}>{result.registrationDate || result.registeredAt}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.label}>Land Area:</Text>
                <Text style={styles.value}>{result.landArea} sqm</Text>
              </View>

              <Text style={styles.sectionLabel}>Registry Boundaries Description:</Text>
              <Text style={styles.descText}>{result.boundaries}</Text>

              {result.status?.toUpperCase() === 'REJECTED' && (
                <View style={styles.dangerAlert}>
                  <Text style={styles.alertTitle}>⚠️ LITIGATION CAVEAT WARNING</Text>
                  <Text style={styles.alertBody}>{result.warningCaveats}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.scamBox}>
              <Text style={styles.scamTitle}>❌ LAND RECORD NOT FOUND</Text>
              <Text style={styles.scamBody}>{result.warningDetail}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
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
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4
  },
  subText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16
  },
  searchRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    alignItems: 'center',
    height: 52
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    height: '100%',
    paddingLeft: 4
  },
  verifyBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2
  },
  verifyBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15
  },
  qrBtn: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
    marginTop: 4
  },
  qrBtnText: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 13
  },
  resultBox: {
    marginTop: 20,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155'
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold'
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeActive: {
    backgroundColor: '#2563eb'
  },
  badgeDisputed: {
    backgroundColor: '#ef4444'
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold'
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  label: {
    color: '#94a3b8',
    fontSize: 13
  },
  value: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13
  },
  sectionLabel: {
    color: '#cbd5e1',
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: 10,
    marginBottom: 6
  },
  descText: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10
  },
  dangerAlert: {
    marginTop: 14,
    backgroundColor: '#451a03',
    borderWidth: 1,
    borderColor: '#b45309',
    borderRadius: 8,
    padding: 12
  },
  alertTitle: {
    color: '#f59e0b',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4
  },
  alertBody: {
    color: '#fcd34d',
    fontSize: 11,
    lineHeight: 16
  },
  scamBox: {
    backgroundColor: '#451a03',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 12
  },
  scamTitle: {
    color: '#f87171',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 6
  },
  scamBody: {
    color: '#fca5a5',
    fontSize: 11,
    lineHeight: 16
  }
});
