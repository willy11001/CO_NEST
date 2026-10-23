import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { AuthContext } from '../../App';

export default function AdminDashboardScreen() {
  const { token, serverUrl } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);
  const [pendingKyc, setPendingKyc] = useState([]);
  const [reportedChats, setReportedChats] = useState([]);
  const [loading, setLoading] = useState(false);

  // Land Registry Form State
  const [titleNumber, setTitleNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [regDate, setRegDate] = useState('');
  const [boundaries, setBoundaries] = useState('');
  const [area, setArea] = useState('');
  const [status, setStatus] = useState('Active'); // Active or Disputed
  const [caveats, setCaveats] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Analytics
      const analRes = await fetch(`${serverUrl}/admin/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await analRes.json();
      setAnalytics(data.analytics);

      // 2. Fetch KYCs
      const kycRes = await fetch(`${serverUrl}/admin/kyc/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const kycData = await kycRes.json();
      setPendingKyc(kycData);

      // 3. Fetch Reported Chats
      const reportRes = await fetch(`${serverUrl}/admin/reported-chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const reportData = await reportRes.json();
      setReportedChats(reportData);
    } catch (e) {
      console.log('Error fetching admin data, using mock values...');
      setAnalytics({
        totalUsers: 14,
        verifiedAgents: 3,
        totalListings: 8,
        pendingKyc: 1,
        totalRevenue: 45000 // FCFA
      });
      setPendingKyc([
        {
          id: 5,
          cniNumber: '1122334455',
          agent: { id: 'AGT2000002', name: 'Jean Pierre', email: 'agent@conest.com' }
        }
      ]);
      setReportedChats([
        {
          id: 1,
          conversationId: 2,
          reason: 'Suspicious pricing and demands',
          description: 'The agent is requesting an offline deposit before visiting the property in Bastos.',
          status: 'PENDING',
          reporter: { fullName: 'Elie Kamga', email: 'buyer@conest.com' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleVerifyKyc = async (requestId, decision) => {
    try {
      const response = await fetch(`${serverUrl}/admin/kyc/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId,
          status: decision === 'Approved' ? 'ACTIVE' : 'REJECTED',
          adminNotes: decision === 'Approved' ? 'Verified CNI matches user.' : 'Name did not match CNI card.'
        })
      });

      if (response.ok) {
        Alert.alert('Decision Registered', `KYC request was successfully ${decision.toLowerCase()}d.`);
        fetchDashboardData();
      } else {
        const err = await response.json();
        Alert.alert('Error', err.message || 'Operation failed.');
      }
    } catch (e) {
      // Offline fallback
      setPendingKyc(prev => prev.filter(req => req.id !== requestId));
      setAnalytics(prev => ({
        ...prev,
        pendingKyc: prev.pendingKyc - 1,
        verifiedAgents: decision === 'Approved' ? prev.verifiedAgents + 1 : prev.verifiedAgents
      }));
      Alert.alert('Mock Success', `KYC request simulated as ${decision}.`);
    }
  };

  const handleRegisterTitle = async () => {
    if (!titleNumber || !ownerName || !boundaries || !area) {
      Alert.alert('Error', 'Please fill in all registry fields.');
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/admin/land-registry/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          titleNumber,
          ownerName,
          registrationDate: regDate || new Date().toISOString().split('T')[0],
          boundaries,
          landArea: parseFloat(area),
          status: status === 'Disputed' ? 'REJECTED' : 'ACTIVE',
          warningCaveats: caveats
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'New Titre Foncier registered in simulated MINDCAF database.');
        // Clean fields
        setTitleNumber('');
        setOwnerName('');
        setRegDate('');
        setBoundaries('');
        setArea('');
        setCaveats('');
      } else {
        const err = await response.json();
        Alert.alert('Error', err.message || 'Registry creation failed.');
      }
    } catch (e) {
      Alert.alert('Offline Sim', 'Simulated: Land registry Titre Foncier added successfully.');
      setTitleNumber('');
      setOwnerName('');
      setBoundaries('');
      setArea('');
    }
  };

  const handleResolveReport = async (reportId) => {
    try {
      const response = await fetch(`${serverUrl}/admin/reported-chats/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reportId })
      });
      if (response.ok) {
        Alert.alert('Report Resolved', 'The report was successfully marked as resolved.');
        fetchDashboardData();
      } else {
        Alert.alert('Error', 'Failed to resolve report.');
      }
    } catch (e) {
      setReportedChats(prev => prev.filter(r => r.id !== reportId));
      Alert.alert('Mock Success', 'Report simulated as resolved.');
    }
  };

  if (loading && !analytics) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Metrics Row */}
      {analytics && (
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Users</Text>
            <Text style={styles.metricValue}>{analytics.totalUsers}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Verified Agents</Text>
            <Text style={[styles.metricValue, styles.greenText]}>{analytics.verifiedAgents}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Listings</Text>
            <Text style={styles.metricValue}>{analytics.totalListings}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Revenue (FCFA)</Text>
            <Text style={[styles.metricValue, styles.goldText]}>{analytics.totalRevenue.toLocaleString()}</Text>
          </View>
        </View>
      )}

      {/* Pending KYC verification */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>⏳ Pending KYC Requests ({pendingKyc.length})</Text>
        <View style={styles.separator} />
        {pendingKyc.length === 0 ? (
          <Text style={styles.emptyText}>No pending identity checks.</Text>
        ) : (
          pendingKyc.map((req) => (
            <View key={req.id} style={styles.kycRow}>
              <View style={styles.kycInfo}>
                <Text style={styles.kycName}>{req.agent?.user?.fullName || req.agent?.name}</Text>
                <Text style={styles.kycSub}>{req.agent?.user?.email || req.agent?.email}</Text>
                <Text style={styles.kycSub}>CNI Ref: {req.idNumber || req.cniNumber}</Text>
              </View>
              <View style={styles.btnCol}>
                <TouchableOpacity 
                  style={[styles.kycBtn, styles.approveBtn]}
                  onPress={() => handleVerifyKyc(req.id, 'Approved')}
                >
                  <Text style={styles.kycBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.kycBtn, styles.rejectBtn]}
                  onPress={() => handleVerifyKyc(req.id, 'Rejected')}
                >
                  <Text style={styles.kycBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Add to land registry form */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📜 Add MINDCAF Land Title Record</Text>
        <View style={styles.separator} />

        <TextInput
          style={styles.input}
          placeholder="Land Title Ref (e.g. TF 8812/Wouri)"
          placeholderTextColor="#94a3b8"
          value={titleNumber}
          onChangeText={setTitleNumber}
        />
        <TextInput
          style={styles.input}
          placeholder="Owner Full Legal Name"
          placeholderTextColor="#94a3b8"
          value={ownerName}
          onChangeText={setOwnerName}
        />
        <TextInput
          style={styles.input}
          placeholder="Registration Date (YYYY-MM-DD)"
          placeholderTextColor="#94a3b8"
          value={regDate}
          onChangeText={setRegDate}
        />
        <TextInput
          style={styles.input}
          placeholder="Land Area (sqm)"
          placeholderTextColor="#94a3b8"
          value={area}
          onChangeText={setArea}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Boundary descriptions"
          placeholderTextColor="#94a3b8"
          value={boundaries}
          onChangeText={setBoundaries}
          multiline
        />

        <Text style={styles.formLabel}>Registry Dispute Status:</Text>
        <View style={styles.statusRow}>
          <TouchableOpacity
            style={[styles.statusOption, status === 'Active' && styles.statusActive]}
            onPress={() => setStatus('Active')}
          >
            <Text style={styles.statusOptionText}>Active / Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusOption, status === 'Disputed' && styles.statusActiveRed]}
            onPress={() => setStatus('Disputed')}
          >
            <Text style={styles.statusOptionText}>Disputed / Litigation</Text>
          </TouchableOpacity>
        </View>

        {status === 'Disputed' && (
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Dispute warning caveat details..."
            placeholderTextColor="#94a3b8"
            value={caveats}
            onChangeText={setCaveats}
            multiline
          />
        )}

        <TouchableOpacity 
          style={styles.submitBtn}
          onPress={handleRegisterTitle}
        >
          <Text style={styles.submitBtnText}>Add Title to Registry</Text>
        </TouchableOpacity>
      </View>

      {/* Reported Conversations Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>⚠️ Reported Conversations ({reportedChats.filter(r => r.status === 'PENDING').length})</Text>
        <View style={styles.separator} />
        {reportedChats.filter(r => r.status === 'PENDING').length === 0 ? (
          <Text style={styles.emptyText}>No pending chat reports.</Text>
        ) : (
          reportedChats.filter(r => r.status === 'PENDING').map((rep) => (
            <View key={rep.id} style={styles.kycRow}>
              <View style={styles.kycInfo}>
                <Text style={styles.kycName}>Conversation ID: {rep.conversationId}</Text>
                <Text style={styles.kycSub}>Reporter: {rep.reporter?.fullName || 'User'} ({rep.reporter?.email})</Text>
                <Text style={styles.kycSub}>Reason: <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>{rep.reason}</Text></Text>
                {rep.description ? <Text style={[styles.kycSub, { fontStyle: 'italic', marginTop: 4 }]}>Details: {rep.description}</Text> : null}
              </View>
              <View style={{ justifyContent: 'center' }}>
                <TouchableOpacity 
                  style={[styles.kycBtn, styles.approveBtn, { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8 }]}
                  onPress={() => handleResolveReport(rep.id)}
                >
                  <Text style={styles.kycBtnText}>Resolve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
    padding: 16
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center'
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 6
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  greenText: {
    color: '#2563eb'
  },
  goldText: {
    color: '#fbbf24'
  },
  sectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  separator: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10
  },
  kycRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8
  },
  kycInfo: {
    flex: 1
  },
  kycName: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13
  },
  kycSub: {
    color: '#cbd5e1',
    fontSize: 10,
    marginTop: 2
  },
  btnCol: {
    flexDirection: 'column'
  },
  kycBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginVertical: 2,
    alignItems: 'center'
  },
  approveBtn: {
    backgroundColor: '#2563eb'
  },
  rejectBtn: {
    backgroundColor: '#ef4444'
  },
  kycBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold'
  },
  input: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top'
  },
  formLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  statusOption: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 4
  },
  statusActive: {
    backgroundColor: '#1d4ed8'
  },
  statusActiveRed: {
    backgroundColor: '#b91c1c'
  },
  statusOptionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600'
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a'
  }
});
