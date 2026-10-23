import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';

export default function RentSplitterScreen({ route }) {
  // Read rentAmount passed from property details, default to 150,000 FCFA
  const baseRent = route.params?.rentAmount ? parseFloat(route.params.rentAmount) : 150000;
  
  const [roommateAShare, setRoommateAShare] = useState(50); // percentage (0-100)
  const [numRoommates, setNumRoommates] = useState(2); // 2 roommates default

  const roommateBShare = 100 - roommateAShare;
  
  const amountA = (baseRent * roommateAShare) / 100;
  const amountB = (baseRent * roommateBShare) / 100;

  const adjustShare = (amount) => {
    setRoommateAShare((prev) => {
      const newVal = prev + amount;
      return Math.max(0, Math.min(100, newVal));
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👥 Roommate Rent Splitter</Text>
        <Text style={styles.cardSub}>Divide rent fairly based on room size or amenities</Text>
        <View style={styles.separator} />

        <Text style={styles.rentLabel}>Total Monthly Rent:</Text>
        <Text style={styles.rentValue}>{baseRent.toLocaleString()} FCFA</Text>

        <View style={styles.sliderContainer}>
          <Text style={styles.shareLabel}>Adjust Roommate A's Share:</Text>
          
          <View style={styles.controlRow}>
            <TouchableOpacity 
              style={styles.adjustBtn}
              onPress={() => adjustShare(-5)}
            >
              <Text style={styles.adjustBtnText}>-5%</Text>
            </TouchableOpacity>
            
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${roommateAShare}%` }]} />
              <Text style={styles.progressLabel}>{roommateAShare}%</Text>
            </View>

            <TouchableOpacity 
              style={styles.adjustBtn}
              onPress={() => adjustShare(5)}
            >
              <Text style={styles.adjustBtnText}>+5%</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Roommate Shares Breakdown */}
        <View style={styles.sharesContainer}>
          <View style={styles.shareRow}>
            <View>
              <Text style={styles.roommateTitle}>Roommate A</Text>
              <Text style={styles.roommateSub}>Master Bedroom / En-suite ({roommateAShare}%)</Text>
            </View>
            <Text style={styles.shareAmount}>{amountA.toLocaleString()} FCFA</Text>
          </View>

          <View style={styles.shareRow}>
            <View>
              <Text style={styles.roommateTitle}>Roommate B</Text>
              <Text style={styles.roommateSub}>Standard Bedroom ({roommateBShare}%)</Text>
            </View>
            <Text style={styles.shareAmount}>{amountB.toLocaleString()} FCFA</Text>
          </View>
        </View>

        {/* Quick presets */}
        <Text style={styles.presetLabel}>Quick Presets:</Text>
        <View style={styles.presetRow}>
          <TouchableOpacity 
            style={[styles.presetBtn, roommateAShare === 50 && styles.presetActive]}
            onPress={() => setRoommateAShare(50)}
          >
            <Text style={styles.presetText}>Equal Split (50/50)</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.presetBtn, roommateAShare === 60 && styles.presetActive]}
            onPress={() => setRoommateAShare(60)}
          >
            <Text style={styles.presetText}>60 / 40 Split</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.presetBtn, roommateAShare === 70 && styles.presetActive]}
            onPress={() => setRoommateAShare(70)}
          >
            <Text style={styles.presetText}>70 / 30 Split</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4
  },
  cardSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16
  },
  separator: {
    height: 1,
    backgroundColor: '#334155',
    marginBottom: 16
  },
  rentLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4
  },
  rentValue: {
    color: '#2563eb',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24
  },
  sliderContainer: {
    marginBottom: 20
  },
  shareLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  adjustBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#475569'
  },
  adjustBtnText: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 14
  },
  progressTrack: {
    flex: 1,
    height: 36,
    backgroundColor: '#0f172a',
    marginHorizontal: 12,
    borderRadius: 18,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2563eb',
    position: 'absolute',
    left: 0
  },
  progressLabel: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
    zIndex: 10
  },
  sharesContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  roommateTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  roommateSub: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 2
  },
  shareAmount: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: 'bold'
  },
  presetLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#475569'
  },
  presetActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb'
  },
  presetText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600'
  }
});
