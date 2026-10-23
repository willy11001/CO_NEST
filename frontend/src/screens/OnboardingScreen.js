import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function OnboardingScreen({ navigation }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Welcome to Co_Nest",
      subtitle: "Securing Cameroonian Real Estate",
      description: "Tired of property scams, fake listings, and double allocations? Co-Nest is a specialized trust ecosystem built for buyers, renters, and agents in Cameroon.",
      icon: "🇨🇲"
    },
    {
      title: "MINDCAF Land Check",
      subtitle: "Verify Titre Foncier Instantly",
      description: "Query land title registrations or scan QR certificates directly. Instantly check boundaries, registered owners, and family dispute caveats before paying.",
      icon: "📜"
    },
    {
      title: "Infrastructure index (CITI)",
      subtitle: "Utility Stability & Rainy Access",
      description: "Know if a property has a borehole or unstable Camwater, Eneo backup solar, dirt roads that turn to mud, and the average daily moto fare to the main road.",
      icon: "💧"
    },
    {
      title: "Roommate Splitter",
      subtitle: "Fair Expenses Division",
      description: "Divide rent and utilities mathematically. Adjust percentages dynamically based on room size, amenities, or agreements to co-live peacefully.",
      icon: "👥"
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigation.navigate('Login');
    }
  };

  const slide = slides[currentSlide];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.logo}>Co_Nest</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.icon}>{slide.icon}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      <View style={styles.footer}>
        {/* Slide Indicators */}
        <View style={styles.dotsRow}>
          {slides.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.dot, 
                currentSlide === index ? styles.dotActive : styles.dotInactive
              ]} 
            />
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'space-between',
    padding: 24
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
  },
  logo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb'
  },
  skipText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600'
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 16
  },
  icon: {
    fontSize: 72,
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16
  },
  description: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 22
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20
  },
  dotsRow: {
    flexDirection: 'row',
    marginBottom: 24
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4
  },
  dotActive: {
    backgroundColor: '#2563eb',
    width: 20
  },
  dotInactive: {
    backgroundColor: '#334155'
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    width: '100%',
    borderRadius: 8,
    alignItems: 'center'
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
