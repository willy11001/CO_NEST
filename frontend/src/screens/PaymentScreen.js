import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { AuthContext } from '../../App';

export default function PaymentScreen() {
    const { token, serverUrl, user } = useContext(AuthContext);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('MTN Mobile Money');
    const [showForm, setShowForm] = useState(false);
    const [phone, setPhone] = useState('');
    
    // Agent-specific payment options
    const [paymentType, setPaymentType] = useState('PROMOTION'); // 'PROMOTION' or 'SUBSCRIPTION'
    const [selectedPropertyId, setSelectedPropertyId] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState('Monthly'); // 'Monthly' or 'Annual'
    const [myListings, setMyListings] = useState([]);
    const [amount, setAmount] = useState('25000'); // Default to promotion price

    const fetchMyListings = async () => {
        try {
            const response = await fetch(`${serverUrl}/properties`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                const filtered = data.filter(p => p.agent?.user?.email === user?.email);
                setMyListings(filtered);
                if (filtered.length > 0) {
                    setSelectedPropertyId(filtered[0].id);
                }
            }
        } catch (e) {
            setMyListings([
                { id: 3, title: 'Executive Bastos Apartment' },
                { id: 13, title: 'Duplex Villa in Bastos' }
            ]);
            setSelectedPropertyId(3);
        }
    };

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${serverUrl}/payments/transactions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const mapped = data.map(tx => ({
              id: tx.id,
              transactionId: tx.transactionId,
              amount: parseFloat(tx.amount || 0),
              method: tx.paymentMethod ? tx.paymentMethod.replace('_', ' ') : 'Mobile Money',
              status: tx.status === 'SUCCESS' ? 'Completed' : tx.status,
              description: tx.paymentType === 'SUBSCRIPTION' ? 'Subscription plan fee' : 'Listing promotion fee',
              createdAt: tx.paidAt || tx.createdAt || new Date().toISOString(),
              phoneNumber: tx.phoneNumber
            }));
            setTransactions(mapped);
        } catch (error) {
            console.log('Error fetching transactions, using mock data...');
            setTransactions([
                { id: 1, transactionId: 'TXN-MTN-88219381', amount: 25000, method: 'MTN Mobile Money', status: 'Completed', description: 'Listing promotion fee (#3)', createdAt: '2026-06-15T10:30:00Z', phoneNumber: '677123456' },
                { id: 2, transactionId: 'TXN-ORANGE-74829103', amount: 15000, method: 'Orange Money', status: 'Completed', description: 'Agent monthly subscription', createdAt: '2026-07-01T14:20:00Z', phoneNumber: '699887766' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
        fetchMyListings();
    }, []);

    // Update amount automatically when selections change
    useEffect(() => {
        if (paymentType === 'PROMOTION') {
            setAmount('25000'); // Promotion costs 25,000 FCFA
        } else {
            setAmount(selectedPlan === 'Monthly' ? '15000' : '120000'); // Monthly = 15k, Annual = 120k
        }
    }, [paymentType, selectedPlan]);

    // USSD simulation states
    const [ussdStep, setUssdStep] = useState(0); // 0 = hidden, 1 = confirm choice, 2 = pin entry
    const [ussdChoice, setUssdChoice] = useState('');
    const [ussdPin, setUssdPin] = useState('');
    const [selectedTx, setSelectedTx] = useState(null);

    const handlePayment = () => {
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Error', 'Invalid payment amount calculated.');
            return;
        }
        if (!phone || phone.trim().length < 9) {
            Alert.alert('Error', 'Please enter a valid Cameroon phone number (e.g. 677112233).');
            return;
        }
        
        // Show simulated USSD push prompt on screen
        setUssdChoice('');
        setUssdPin('');
        setUssdStep(1);
    };

    const submitUssdChoice = () => {
        if (ussdChoice.trim() !== '1') {
            Alert.alert('Cancelled', 'Transaction cancelled by user.');
            setUssdStep(0);
            return;
        }
        setUssdStep(2);
    };

    const submitUssdPin = async () => {
        const pinTrimmed = ussdPin.trim();
        if (!pinTrimmed) {
            Alert.alert('Error', 'Please enter your Mobile Money PIN.');
            return;
        }

        const isMtn = paymentMethod.toLowerCase().includes('mtn');
        if (isMtn) {
            if (pinTrimmed.length !== 5 || isNaN(parseInt(pinTrimmed))) {
                Alert.alert('Error', 'MTN Mobile Money PIN must be exactly 5 digits.');
                return;
            }
        } else {
            if (pinTrimmed.length !== 4 || isNaN(parseInt(pinTrimmed))) {
                Alert.alert('Error', 'Orange Money PIN must be exactly 4 digits.');
                return;
            }
        }
        
        setUssdStep(0);
        setLoading(true);
        try {
            const response = await fetch(`${serverUrl}/payments/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    paymentMethod: paymentMethod,
                    paymentType: paymentType,
                    propertyId: paymentType === 'PROMOTION' ? selectedPropertyId : null,
                    phoneNumber: phone.trim()
                })
            });

            if (response.ok) {
                Alert.alert('Payment Successful', `Cameroon Mobile Money transaction of ${parseFloat(amount).toLocaleString()} FCFA completed successfully!`);
                setShowForm(false);
                fetchTransactions();
            } else {
                const data = await response.json();
                Alert.alert('Error', data.message || 'Payment failed.');
            }
        } catch (error) {
            Alert.alert('Offline Mode', `Simulated payment of ${parseFloat(amount).toLocaleString()} FCFA completed successfully.`);
            setShowForm(false);
            // Append mock transaction locally
            setTransactions(prev => [
                {
                    id: Date.now(),
                    amount: parseFloat(amount),
                    method: paymentMethod,
                    status: 'Completed',
                    description: paymentType === 'PROMOTION' ? `Listing promotion fee (#${selectedPropertyId})` : `Agent ${selectedPlan.toLowerCase()} subscription`,
                    createdAt: new Date().toISOString()
                },
                ...prev
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
                <Text style={styles.heading}>💳 Agent Promotions & Subscriptions</Text>
                <Text style={styles.subText}>Boost visibility of your listings or pay active subscription packages</Text>

                <TouchableOpacity
                    style={styles.newPaymentBtn}
                    onPress={() => setShowForm(!showForm)}
                >
                    <Text style={styles.newPaymentBtnText}>{showForm ? '✕ Cancel' : '💸 Promote / Subscribe'}</Text>
                </TouchableOpacity>

                {showForm && (
                    <View style={styles.paymentForm}>
                        <Text style={styles.label}>Select Service Type:</Text>
                        <View style={styles.toggleRow}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, paymentType === 'PROMOTION' && styles.toggleActive]}
                                onPress={() => setPaymentType('PROMOTION')}
                            >
                                <Text style={[styles.toggleText, paymentType === 'PROMOTION' && styles.toggleTextActive]}>📢 Promote Listing</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, paymentType === 'SUBSCRIPTION' && styles.toggleActive]}
                                onPress={() => setPaymentType('SUBSCRIPTION')}
                            >
                                <Text style={[styles.toggleText, paymentType === 'SUBSCRIPTION' && styles.toggleTextActive]}>🔑 Upgrade Plan</Text>
                            </TouchableOpacity>
                        </View>

                        {paymentType === 'PROMOTION' ? (
                            <>
                                <Text style={styles.label}>Select Property to Promote (25,000 FCFA):</Text>
                                <View style={styles.pickerContainer}>
                                    {myListings.map(item => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={[styles.pickerItem, selectedPropertyId === item.id && styles.pickerItemActive]}
                                            onPress={() => setSelectedPropertyId(item.id)}
                                        >
                                            <Text style={[styles.pickerText, selectedPropertyId === item.id && styles.pickerTextActive]}>
                                                🏢 {item.title}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={styles.label}>Select Subscription Plan:</Text>
                                <View style={styles.toggleRow}>
                                    {['Monthly', 'Annual'].map(plan => (
                                        <TouchableOpacity
                                            key={plan}
                                            style={[styles.toggleBtn, selectedPlan === plan && styles.toggleActive]}
                                            onPress={() => setSelectedPlan(plan)}
                                        >
                                            <Text style={[styles.toggleText, selectedPlan === plan && styles.toggleTextActive]}>
                                                {plan === 'Monthly' ? '📅 Monthly (15,000 FCFA)' : '📆 Annual (120,000 FCFA)'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <Text style={styles.label}>Phone Number (MTN MoMo / Orange Money):</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 677112233"
                            placeholderTextColor="#94a3b8"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.label}>Payment Method:</Text>
                        <View style={styles.methodRow}>
                            {['MTN Mobile Money', 'Orange Money'].map(method => (
                                <TouchableOpacity
                                    key={method}
                                    style={[styles.methodBtn, paymentMethod === method && styles.methodActive]}
                                    onPress={() => setPaymentMethod(method)}
                                >
                                    <Text style={[styles.methodText, paymentMethod === method && styles.methodTextActive]}>
                                        {method}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.priceTag}>Total: {parseFloat(amount).toLocaleString()} FCFA</Text>

                        <TouchableOpacity
                            style={styles.payBtn}
                            onPress={handlePayment}
                            disabled={loading}
                        >
                            <Text style={styles.payBtnText}>{loading ? 'Sending USSD Push...' : 'Authorize Transaction'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.card}>
                <Text style={styles.heading}>📋 Transaction History</Text>
                <View style={styles.separator} />

                {loading && transactions.length === 0 ? (
                    <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 20 }} />
                ) : transactions.length === 0 ? (
                    <Text style={styles.emptyText}>No transactions yet.</Text>
                ) : (
                    transactions.map(tx => (
                        <TouchableOpacity key={tx.id} style={styles.txRow} onPress={() => setSelectedTx(tx)}>
                            <View style={styles.txInfo}>
                                <Text style={styles.txDesc}>{tx.description}</Text>
                                <Text style={styles.txMeta}>{tx.method} • {new Date(tx.createdAt).toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.txRight}>
                                <Text style={styles.txAmount}>{parseFloat(tx.amount).toLocaleString()} FCFA</Text>
                                <View style={[styles.statusBadge, tx.status === 'Completed' ? styles.statusCompleted : styles.statusPending]}>
                                    <Text style={styles.statusText}>{tx.status}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </ScrollView>

        {/* Simulated Payment Receipt Modal */}
        <Modal
            visible={selectedTx !== null}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setSelectedTx(null)}
        >
            <View style={styles.receiptOverlay}>
                <View style={styles.receiptContainer}>
                    <View style={styles.receiptHeader}>
                        <Text style={styles.receiptTitle}>CO-NEST TRUST RECEIPT</Text>
                        <Text style={styles.receiptStatusText}>🟢 SUCCESSFUL</Text>
                    </View>
                    
                    <View style={styles.receiptDivider} />

                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Agent Name:</Text>
                        <Text style={styles.receiptValue}>{user?.fullName || 'N/A'}</Text>
                    </View>

                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Email Address:</Text>
                        <Text style={styles.receiptValue}>{user?.email || 'N/A'}</Text>
                    </View>

                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Reference ID:</Text>
                        <Text style={styles.receiptValue} numberOfLines={1}>{selectedTx?.transactionId || `TXN-DEMO-${selectedTx?.id}`}</Text>
                    </View>

                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Service Type:</Text>
                        <Text style={styles.receiptValue}>{selectedTx?.description}</Text>
                    </View>

                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Payment Method:</Text>
                        <Text style={styles.receiptValue}>{selectedTx?.method}</Text>
                    </View>

                    {selectedTx?.phoneNumber ? (
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Carrier Number:</Text>
                            <Text style={styles.receiptValue}>{selectedTx.phoneNumber}</Text>
                        </View>
                    ) : null}

                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Transaction Date:</Text>
                        <Text style={styles.receiptValue}>
                            {selectedTx ? new Date(selectedTx.createdAt).toLocaleString() : ''}
                        </Text>
                    </View>

                    <View style={styles.receiptDivider} />

                    <View style={styles.receiptRow}>
                        <Text style={styles.receiptTotalLabel}>Amount Paid:</Text>
                        <Text style={styles.receiptTotalValue}>
                            {selectedTx ? parseFloat(selectedTx.amount).toLocaleString() : '0'} FCFA
                        </Text>
                    </View>

                    <TouchableOpacity 
                        onPress={() => setSelectedTx(null)} 
                        style={styles.receiptCloseBtn}
                    >
                        <Text style={styles.receiptCloseBtnText}>Close Receipt</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

        {/* Simulated USSD Cameroon carrier prompt overlay */}
        <Modal
            visible={ussdStep > 0}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setUssdStep(0)}
        >
            <View style={styles.ussdOverlay}>
                <View style={styles.ussdDialog}>
                    <Text style={styles.ussdHeader}>{paymentMethod}</Text>
                    
                    {ussdStep === 1 && (
                      <View>
                        <Text style={styles.ussdBody}>
                          Do you want to confirm payment of {parseFloat(amount).toLocaleString()} FCFA to CO-NEST REAL ESTATE TRUST?
                        </Text>
                        <Text style={styles.ussdChoiceText}>1. Confirm / Validate</Text>
                        <Text style={styles.ussdChoiceText}>2. Cancel</Text>
                        <TextInput
                          style={styles.ussdInput}
                          value={ussdChoice}
                          onChangeText={setUssdChoice}
                          keyboardType="numeric"
                          autoFocus={true}
                          placeholder="Type 1 or 2"
                          placeholderTextColor="#64748b"
                        />
                        <View style={styles.ussdButtons}>
                          <TouchableOpacity onPress={() => setUssdStep(0)} style={styles.ussdBtn}>
                            <Text style={styles.ussdBtnText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={submitUssdChoice} style={styles.ussdBtn}>
                            <Text style={styles.ussdBtnText}>Send</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {ussdStep === 2 && (
                      <View>
                        <Text style={styles.ussdBody}>
                          Please enter your Mobile Money PIN code to authorize this request:
                        </Text>
                        <TextInput
                          style={styles.ussdInput}
                          value={ussdPin}
                          onChangeText={setUssdPin}
                          keyboardType="numeric"
                          secureTextEntry={true}
                          autoFocus={true}
                          placeholder="PIN"
                          placeholderTextColor="#64748b"
                        />
                        <View style={styles.ussdButtons}>
                          <TouchableOpacity onPress={() => setUssdStep(0)} style={styles.ussdBtn}>
                            <Text style={styles.ussdBtnText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={submitUssdPin} style={styles.ussdBtn}>
                            <Text style={styles.ussdBtnText}>Send</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                </View>
            </View>
        </Modal>
      </View>
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
        borderColor: '#334155',
        marginBottom: 20
    },
    heading: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4
    },
    subText: {
        color: '#94a3b8',
        fontSize: 12,
        marginBottom: 16
    },
    newPaymentBtn: {
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16
    },
    newPaymentBtnText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14
    },
    paymentForm: {
        backgroundColor: '#0f172a',
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 16
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
        color: '#cbd5e1',
        fontWeight: '600',
        fontSize: 12
    },
    toggleTextActive: {
        color: '#ffffff'
    },
    pickerContainer: {
        marginBottom: 16
    },
    pickerItem: {
        backgroundColor: '#334155',
        padding: 10,
        borderRadius: 6,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#475569'
    },
    pickerItemActive: {
        backgroundColor: '#1e293b',
        borderColor: '#2563eb'
    },
    pickerText: {
        color: '#cbd5e1',
        fontSize: 12
    },
    pickerTextActive: {
        color: '#2563eb',
        fontWeight: 'bold'
    },
    input: {
        backgroundColor: '#334155',
        color: '#ffffff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        fontSize: 16,
        marginBottom: 14
    },
    label: {
        color: '#cbd5e1',
        fontWeight: 'bold',
        fontSize: 12,
        marginBottom: 8
    },
    methodRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16
    },
    methodBtn: {
        backgroundColor: '#334155',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#475569'
    },
    methodActive: {
        backgroundColor: '#2563eb',
        borderColor: '#2563eb'
    },
    methodText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600'
    },
    methodTextActive: {
        color: '#ffffff'
    },
    priceTag: {
        color: '#2563eb',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 12
    },
    payBtn: {
        backgroundColor: '#2563eb',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    payBtnText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 15
    },
    separator: {
        height: 1,
        backgroundColor: '#334155',
        marginVertical: 12
    },
    emptyText: {
        color: '#94a3b8',
        textAlign: 'center',
        paddingVertical: 20
    },
    txRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#334155'
    },
    txInfo: {
        flex: 1
    },
    txDesc: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 'bold'
    },
    txMeta: {
        color: '#94a3b8',
        fontSize: 11,
        marginTop: 2
    },
    txRight: {
        alignItems: 'flex-end'
    },
    txAmount: {
        color: '#2563eb',
        fontSize: 14,
        fontWeight: 'bold'
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4
    },
    statusCompleted: {
        backgroundColor: '#064e3b'
    },
    statusPending: {
        backgroundColor: '#7f1d1d'
    },
    statusText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold'
    },
    ussdOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    ussdDialog: {
        width: '85%',
        backgroundColor: '#e2e8f0',
        borderRadius: 8,
        padding: 20,
        elevation: 10
    },
    ussdHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#cbd5e1',
        paddingBottom: 8,
        marginBottom: 12
    },
    ussdBody: {
        fontSize: 14,
        color: '#334155',
        marginBottom: 12,
        lineHeight: 20
    },
    ussdChoiceText: {
        fontSize: 13,
        color: '#475569',
        marginBottom: 4,
        marginLeft: 8
    },
    ussdInput: {
        borderBottomWidth: 2,
        borderBottomColor: '#2563eb',
        color: '#0f172a',
        paddingVertical: 4,
        fontSize: 16,
        marginTop: 15,
        marginBottom: 20
    },
    ussdButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 20
    },
    ussdBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12
    },
    ussdBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2563eb'
    },
    receiptOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    receiptContainer: {
        width: '90%',
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#334155',
        elevation: 20
    },
    receiptHeader: {
        alignItems: 'center',
        marginBottom: 16
    },
    receiptTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2563eb',
        letterSpacing: 1.5,
        marginBottom: 4
    },
    receiptStatusText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#34d399',
        backgroundColor: '#064e3b',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 6
    },
    receiptDivider: {
        height: 1,
        backgroundColor: '#334155',
        marginVertical: 14,
        borderStyle: 'dashed',
        borderRadius: 1
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 8
    },
    receiptLabel: {
        color: '#94a3b8',
        fontSize: 12
    },
    receiptValue: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'right',
        marginLeft: 10
    },
    receiptTotalLabel: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold'
    },
    receiptTotalValue: {
        color: '#2563eb',
        fontSize: 18,
        fontWeight: 'bold'
    },
    receiptCloseBtn: {
        backgroundColor: '#2563eb',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 24
    },
    receiptCloseBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold'
    }
});