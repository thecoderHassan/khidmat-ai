import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const PLACEHOLDERS = [
  "AC ki gas refill karwani hai...",
  "G-13 mein acha plumber chahiye...",
  "I need an electrician urgently...",
  "Motor theek karne wala bhejein...",
  "Haircut ke liye koi aa sakta hai?"
];

const SERVICES = [
  { name: "Plumber", icon: "wrench", family: "MaterialCommunityIcons" },
  { name: "AC Tech", icon: "snowflake", family: "MaterialCommunityIcons" },
  { name: "Electrician", icon: "flash", family: "Ionicons" },
  { name: "Barber", icon: "content-cut", family: "MaterialCommunityIcons" },
  { name: "Tutor", icon: "book-open-variant", family: "MaterialCommunityIcons" },
  { name: "Carpenter", icon: "hammer", family: "MaterialCommunityIcons" }
];

export default function ChatScreen({ navigation }) {
  const [request, setRequest] = useState('');
  const [locationStr, setLocationStr] = useState('');
  
  const [placeholderText, setPlaceholderText] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const typingSpeed = isDeleting ? 30 : 60;
    const currentWord = PLACEHOLDERS[placeholderIndex];

    const timeout = setTimeout(() => {
      if (!isDeleting && charIndex < currentWord.length) {
        setPlaceholderText(currentWord.substring(0, charIndex + 1));
        setCharIndex(prev => prev + 1);
      } 
      else if (isDeleting && charIndex > 0) {
        setPlaceholderText(currentWord.substring(0, charIndex - 1));
        setCharIndex(prev => prev - 1);
      } 
      else if (!isDeleting && charIndex === currentWord.length) {
        setTimeout(() => setIsDeleting(true), 2000); 
      } 
      else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, placeholderIndex]);

  const handleSearch = () => {
    if (!request.trim()) return;
    navigation.navigate('AgentThinking', { request: `${request} ${locationStr ? 'near ' + locationStr : ''}` });
  };

  const handleGetLocation = () => {
    setLocationStr('Current Location: F-7, Islamabad');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.urduLogo}>خدمت</Text>
          </View>
          <Text style={styles.appName}>Khidmat<Text style={styles.aiText}>AI</Text></Text>
          <Text style={styles.tagline}>Ghar Baithe, Kaam Karwao</Text>
        </View>

        <View style={styles.inputWrapper}>
          <View style={styles.promptHeader}>
            <Ionicons name="sparkles" size={16} color="#00D4A8" />
            <Text style={styles.promptLabel}>What do you need help with?</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder={placeholderText}
            placeholderTextColor="#5a6a85"
            multiline={true}
            value={request}
            onChangeText={setRequest}
          />
          <Text style={styles.langLabel}>Understands Urdu, Roman Urdu, and English</Text>
        </View>

        <TouchableOpacity style={styles.locationBtn} onPress={handleGetLocation}>
          <Ionicons name="location-sharp" size={20} color="#3b9eff" style={styles.locationIcon} />
          <Text style={styles.locationBtnText}>
            {locationStr ? locationStr : "Use My Current Location"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="#050810" style={{marginRight: 8}} />
          <Text style={styles.submitBtnText}>Find Best Provider</Text>
        </TouchableOpacity>

        <Text style={styles.suggestedTitle}>Popular Services</Text>
        <View style={styles.quickGrid}>
          {SERVICES.map((service, idx) => (
            <TouchableOpacity key={idx} style={styles.quickBtn} onPress={() => setRequest(`Mujhe ${service.name} ki zaroorat hai`)}>
              {service.family === 'Ionicons' ? (
                <Ionicons name={service.icon} size={20} color="#8fa3c0" style={{marginBottom: 5}} />
              ) : (
                <MaterialCommunityIcons name={service.icon} size={20} color="#8fa3c0" style={{marginBottom: 5}} />
              )}
              <Text style={styles.quickBtnText}>{service.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  scrollContent: { padding: 24 },
  heroSection: { alignItems: 'center', marginBottom: 40, marginTop: 30 },
  logoBadge: {
    backgroundColor: 'rgba(0, 212, 168, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 168, 0.3)',
  },
  urduLogo: { fontSize: 36, fontWeight: '800', color: '#00D4A8' },
  appName: { fontSize: 32, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  aiText: { color: '#00D4A8' },
  tagline: { fontSize: 15, color: '#8fa3c0', marginTop: 8 },
  
  inputWrapper: {
    backgroundColor: '#0b0f1a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
    shadowColor: '#00D4A8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  promptHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  promptLabel: { color: '#00D4A8', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 6 },
  input: {
    color: '#FFF',
    fontSize: 18,
    minHeight: 100,
    textAlignVertical: 'top',
    lineHeight: 26,
  },
  langLabel: { color: '#5a6a85', fontSize: 11, marginTop: 10, fontStyle: 'italic' },
  
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 158, 255, 0.2)',
  },
  locationIcon: { marginRight: 10 },
  locationBtnText: { color: '#3b9eff', fontSize: 14, fontWeight: '600' },
  
  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#00D4A8',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 35,
    shadowColor: '#00D4A8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  submitBtnText: { color: '#050810', fontSize: 17, fontWeight: '800' },
  
  suggestedTitle: { color: '#8fa3c0', fontSize: 14, fontWeight: '600', marginBottom: 15 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickBtn: {
    width: '31%',
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  quickBtnText: { color: '#e4eaf8', fontSize: 12, fontWeight: '500' }
});
