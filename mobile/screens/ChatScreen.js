import React, { useState, useEffect, useRef } from 'react';

import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  Modal, 
  Animated, 
  Easing,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎤  REAL VOICE RECORDING + GEMINI TRANSCRIPTION
//     No more simulated text — actual microphone use!
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SUGGESTIONS = [
  "AC technician chahiye kal subah",
  "Need an electrician today evening",
  "Plumber for water leak — urgent"
];

const PLACEHOLDERS = [
  "AC ki gas refill karwani hai...",
  "G-13 mein acha plumber chahiye...",
  "I need an electrician urgently...",
  "Motor theek karne wala bhejein...",
  "Haircut ke liye koi aa sakta hai?"
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BACKEND API CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://khidmat-ai-backend-bdg7lrfdza-el.a.run.app';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UPLOAD AUDIO TO BACKEND → GEMINI TRANSCRIPTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const uploadAudioForTranscription = async (audioUri) => {
  try {
    const formData = new FormData();
    const ext = audioUri.split('.').pop() || 'm4a';
    formData.append('audio', {
      uri: audioUri,
      name: `recording.${ext}`,
      type: ext === 'wav' ? 'audio/wav' : 'audio/mp4',
    });

    const response = await fetch(`${BASE_URL}/api/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Server error ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.log('Audio transcription failed:', error.message);
    throw error;
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANTIGRAVITY VOICE INTENT FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const callAntigravityVoiceIntent = async (voiceText, location, sessionId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/request`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        text: voiceText,
        location: location || 'G-13, Islamabad',
        source: 'voice_input',
      }),
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();

    if (data && data.intent_summary) {
      return data.intent_summary;
    }
    return voiceText;
  } catch (error) {
    console.log('Antigravity voice intent failed, using raw text:', error.message);
    return voiceText;
  }
};

export default function ChatScreen({ navigation, route }) {
  const [sessionId] = useState(() => "SES-" + Date.now() + "-" + Math.floor(1000 + Math.random() * 9000));
  const [request, setRequest] = useState('');
  const inputRef = useRef(null);
  const [locationStr, setLocationStr] = useState('');

  const [coordinates, setCoordinates] = useState({ lat: 33.6938, lng: 72.9720 });
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  // Map Selection States
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [tempCoordinates, setTempCoordinates] = useState({ lat: 33.6938, lng: 72.9720 });
  const mapRef = useRef(null);
  
  const [placeholderText, setPlaceholderText] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Voice states
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [selectedLang, setSelectedLang] = useState('roman');
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isDoneTranscribing, setIsDoneTranscribing] = useState(false);
  const [isProcessingIntent, setIsProcessingIntent] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Real audio recording ref
  const recordingRef = useRef(null);

  // Waveform animations
  const [wave1] = useState(new Animated.Value(15));
  const [wave2] = useState(new Animated.Value(25));
  const [wave3] = useState(new Animated.Value(18));
  const [wave4] = useState(new Animated.Value(35));
  const [wave5] = useState(new Animated.Value(20));

  useEffect(() => {
    if (route.params?.prefilledText) {
      setRequest(route.params.prefilledText);
    }
  }, [route.params?.prefilledText]);

  // Typing placeholder animation
  useEffect(() => {
    const typingSpeed = isDeleting ? 30 : 60;
    const currentWord = PLACEHOLDERS[placeholderIndex];

    const timeout = setTimeout(() => {
      if (!isDeleting && charIndex < currentWord.length) {
        setPlaceholderText(currentWord.substring(0, charIndex + 1));
        setCharIndex(prev => prev + 1);
      } else if (isDeleting && charIndex > 0) {
        setPlaceholderText(currentWord.substring(0, charIndex - 1));
        setCharIndex(prev => prev - 1);
      } else if (!isDeleting && charIndex === currentWord.length) {
        setTimeout(() => setIsDeleting(true), 2000); 
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, placeholderIndex]);

  const startWaveformAnimation = () => {
    const createBouncingLoop = (animVal, maxVal, speed) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animVal, { toValue: maxVal, duration: speed, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(animVal, { toValue: 12, duration: speed, easing: Easing.inOut(Easing.ease), useNativeDriver: false })
        ])
      );
    };
    Animated.parallel([
      createBouncingLoop(wave1, 55, 300),
      createBouncingLoop(wave2, 85, 450),
      createBouncingLoop(wave3, 65, 350),
      createBouncingLoop(wave4, 95, 500),
      createBouncingLoop(wave5, 45, 400)
    ]).start();
  };

  const stopWaveformAnimation = () => {
    wave1.stopAnimation(); wave2.stopAnimation();
    wave3.stopAnimation(); wave4.stopAnimation(); wave5.stopAnimation();
    Animated.parallel([
      Animated.timing(wave1, { toValue: 15, duration: 200, useNativeDriver: false }),
      Animated.timing(wave2, { toValue: 20, duration: 200, useNativeDriver: false }),
      Animated.timing(wave3, { toValue: 18, duration: 200, useNativeDriver: false }),
      Animated.timing(wave4, { toValue: 25, duration: 200, useNativeDriver: false }),
      Animated.timing(wave5, { toValue: 15, duration: 200, useNativeDriver: false })
    ]).start();
  };

  const handleCancelVoice = async () => {
    // Stop any active recording
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) { /* ignore */ }
      recordingRef.current = null;
    }
    stopWaveformAnimation();
    setVoiceModalVisible(false);
    setIsListening(false);
    setIsDoneTranscribing(false);
    setIsProcessingIntent(false);
    setStatusMessage('');
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎤 REAL MICROPHONE: Start Recording
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleStartSpeech = async () => {
    if (isListening) return;

    try {
      // Request microphone permission
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Microphone Permission',
          'KhidmatAI ko aapki awaaz sunne ke liye mic permission chahiye. Settings mein ja kar allow karein.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording with high quality preset
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsListening(true);
      setIsDoneTranscribing(false);
      setVoiceText('');
      setStatusMessage('🎙️ Bol rahe hain... jab done ho tap karein');
      startWaveformAnimation();

    } catch (error) {
      console.log('Failed to start recording:', error);
      Alert.alert('Recording Error', 'Mic start nahi ho saka. Dubara try karein.');
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🛑 STOP RECORDING → UPLOAD → TRANSCRIBE → INTENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleStopSpeech = async () => {
    if (!recordingRef.current) return;

    stopWaveformAnimation();
    setIsListening(false);
    setIsProcessingIntent(true);
    setStatusMessage('⏳ Audio upload ho rahi hai...');

    try {
      // Stop and get the recording URI
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (!uri) {
        throw new Error('No audio file URI received');
      }

      // Step 1: Upload audio to backend for Gemini transcription
      setStatusMessage('🤖 Gemini sun raha hai...');
      const transcribedText = await uploadAudioForTranscription(uri);

      if (!transcribedText) {
        throw new Error('Empty transcription returned');
      }

      setVoiceText(transcribedText);
      setIsDoneTranscribing(true);
      setStatusMessage('✅ Transcription done! Intent extract ho raha hai...');

      // Step 2: Pass transcribed text to Antigravity for intent extraction
      const intentText = await callAntigravityVoiceIntent(transcribedText, locationStr, sessionId);

      // Fill the request input and close modal
      setRequest(intentText);
      setIsProcessingIntent(false);
      setVoiceModalVisible(false);
      setIsDoneTranscribing(false);
      setStatusMessage('');

    } catch (error) {
      console.log('Voice pipeline error:', error.message);
      setIsProcessingIntent(false);
      setStatusMessage('');
      Alert.alert(
        'Voice Processing Error',
        `Awaaz process nahi ho saki: ${error.message}\n\nAap manually bhi type kar sakte hain.`,
        [
          { text: 'Retry', onPress: () => {} },
          { text: 'Type Manually', onPress: handleCancelVoice },
        ]
      );
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MANUAL TEXT → INTENT (when user types in voice modal)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleSendManualText = async (text) => {
    setIsProcessingIntent(true);
    setStatusMessage('🤖 Antigravity agent samajh raha hai...');

    const intentText = await callAntigravityVoiceIntent(text, locationStr, sessionId);

    setRequest(intentText);
    setIsProcessingIntent(false);
    setVoiceModalVisible(false);
    setIsDoneTranscribing(false);
    setStatusMessage('');
  };

  const fetchLocation = async (silent = false) => {
    if (!silent) setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) Alert.alert("Location Permission Denied", "We will use the default G-13 Islamabad coordinates for matching.", [{ text: "OK" }]);
        setCoordinates({ lat: 33.6938, lng: 72.9720 });
        setTempCoordinates({ lat: 33.6938, lng: 72.9720 });
        setLocationStr("G-13, Islamabad (Default Fallback)");
        if (!silent) setMapModalVisible(true);
        return { lat: 33.6938, lng: 72.9720 };
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const currentCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCoordinates(currentCoords);
      setTempCoordinates(currentCoords);
      
      const geocode = await Location.reverseGeocodeAsync({ latitude: currentCoords.lat, longitude: currentCoords.lng });
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const addr = `${place.name || place.street || ''} ${place.district || place.city || ''}`.trim();
        setLocationStr(addr || `GPS Active: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}`);
      } else {
        setLocationStr(`GPS Active: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}`);
      }
      if (!silent) setMapModalVisible(true);
      return currentCoords;
    } catch (error) {
      setCoordinates({ lat: 33.6938, lng: 72.9720 });
      setTempCoordinates({ lat: 33.6938, lng: 72.9720 });
      setLocationStr("G-13, Islamabad (Default Fallback)");
      if (!silent) setMapModalVisible(true);
      return { lat: 33.6938, lng: 72.9720 };
    } finally {
      if (!silent) setLoadingLocation(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setSearchingLocation(true);
    try {
      const result = await Location.geocodeAsync(searchQuery);
      if (result && result.length > 0) {
        const { latitude, longitude } = result[0];
        setTempCoordinates({ lat: latitude, lng: longitude });
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
        }
      } else {
        Alert.alert("Not Found", "Could not find that location. Please try a different search term.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to search location.");
    } finally {
      setSearchingLocation(false);
    }
  };

  const confirmMapLocation = async () => {
    setCoordinates(tempCoordinates);
    setMapModalVisible(false);
    setLoadingLocation(true);
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude: tempCoordinates.lat, longitude: tempCoordinates.lng });
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const addr = `${place.name || place.street || ''} ${place.district || place.city || ''}`.trim();
        setLocationStr(addr || `Custom Location Selected`);
      } else {
        setLocationStr(`Custom Location Selected`);
      }
    } catch (e) {
      setLocationStr(`Custom Location Selected`);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSearch = async () => {
    if (!request.trim()) {
      Alert.alert("KhidmatAI", "Please enter what you need help with first.");
      return;
    }
    let lat = coordinates.lat;
    let lng = coordinates.lng;
    if (!locationStr) {
      const coords = await fetchLocation(true);
      lat = coords.lat;
      lng = coords.lng;
    }
    navigation.navigate('AgentThinking', { 
      request: request.trim(),
      user_lat: lat,
      user_lng: lng,
      session_id: sessionId
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.heroSection}>
          <Image 
            source={require('../assets/images/logo-header.png')} 
            style={{ width: 200, height: 60, marginBottom: 8 }} 
            resizeMode="contain" 
          />
          <Text style={styles.tagline}>Ghar Baithe, Kaam Karwao</Text>
        </View>

        {/* Input Card */}
        <View style={styles.inputWrapper}>
          <View style={styles.promptHeader}>
            <Ionicons name="sparkles" size={16} color="#00D4A8" />
            <Text style={styles.promptLabel}>What do you need help with?</Text>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={placeholderText}
              placeholderTextColor="#5a6a85"
              multiline={true}
              value={request}
              onChangeText={setRequest}
            />

            {/* Mic button → opens voice modal */}
            <TouchableOpacity 
              style={styles.micBtn} 
              onPress={() => {
                setVoiceText('');
                setIsDoneTranscribing(false);
                setIsListening(false);
                setIsProcessingIntent(false);
                setStatusMessage('');
                setVoiceModalVisible(true);
              }}
            >
              <Ionicons name="mic-outline" size={24} color="#050810" />
            </TouchableOpacity>
          </View>

          <Text style={styles.langLabel}>Understands Urdu, Roman Urdu, and English voice commands</Text>
        </View>

        {/* GPS */}
        <TouchableOpacity 
          style={[styles.locationBtn, locationStr ? styles.locationActive : null]} 
          onPress={() => fetchLocation(false)}
          disabled={loadingLocation}
        >
          {loadingLocation ? (
            <ActivityIndicator size="small" color="#3b9eff" style={{ marginRight: 10 }} />
          ) : (
            <Ionicons name="location-sharp" size={20} color={locationStr ? "#00D4A8" : "#3b9eff"} style={styles.locationIcon} />
          )}
          <Text style={[styles.locationBtnText, locationStr ? styles.locationActiveText : null]}>
            {loadingLocation ? "Accessing GPS..." : (locationStr ? locationStr : "Use My Current Location")}
          </Text>
        </TouchableOpacity>

        {/* Search */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="#050810" style={{ marginRight: 8 }} />
          <Text style={styles.submitBtnText}>Find a provider</Text>
        </TouchableOpacity>

        {/* Suggestions */}
        <Text style={styles.suggestedTitle}>Tap to Try Example prompts</Text>
        <View style={styles.quickGrid}>
          {SUGGESTIONS.map((suggestion, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={styles.quickBtn} 
              onPress={() => setRequest(suggestion)}
            >
              <View style={styles.chipRow}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#00D4A8" style={{ marginRight: 8 }} />
                <Text style={styles.quickBtnText} numberOfLines={1}>{suggestion}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          VOICE MODAL — REAL MICROPHONE
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={voiceModalVisible}
        onRequestClose={handleCancelVoice}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.voiceSheet}>
            
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>🎤 KhidmatAI Voice</Text>
              <TouchableOpacity style={styles.sheetCloseBtn} onPress={handleCancelVoice}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.voiceInstruct}>
              Mic dabayein, Urdu/English/Roman Urdu mein bolein, hum samajh jayenge:
            </Text>

            {/* Waveform */}
            <View style={styles.visualizerContainer}>
              {isProcessingIntent ? (
                <View style={{ alignItems: 'center', gap: 12 }}>
                  <ActivityIndicator size="large" color="#00D4A8" />
                  <Text style={{ color: '#00D4A8', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
                    {statusMessage || '🤖 Processing...'}
                  </Text>
                </View>
              ) : (
                <View style={styles.waveRow}>
                  <Animated.View style={[styles.waveBar, { height: wave1 }]} />
                  <Animated.View style={[styles.waveBar, { height: wave2 }]} />
                  <Animated.View style={[styles.waveBar, { height: wave3 }]} />
                  <Animated.View style={[styles.waveBar, { height: wave4 }]} />
                  <Animated.View style={[styles.waveBar, { height: wave5 }]} />
                </View>
              )}
            </View>

            {/* Transcription box */}
            <View style={styles.transcriptionBox}>
              {isListening ? (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.redPulseDot} />
                    <Text style={{ color: '#ff4a4a', fontSize: 15, fontWeight: '700' }}>
                      Recording... bol rahe hain
                    </Text>
                  </View>
                  <Text style={{ color: '#5a6a85', fontSize: 12 }}>
                    Done hone par neechay Stop button dabayein
                  </Text>
                </View>
              ) : voiceText ? (
                <Text style={styles.transcriptionText}>
                  "{voiceText}"
                </Text>
              ) : (
                <TextInput
                  style={styles.transcriptionInputText}
                  value={voiceText}
                  onChangeText={(txt) => { setVoiceText(txt); setIsDoneTranscribing(txt.length > 0); }}
                  placeholder="Ya yahan manually type karein..."
                  placeholderTextColor="#5a6a85"
                  multiline={true}
                  keyboardAppearance="dark"
                />
              )}
            </View>

            {/* Action buttons — only show when text is available and not recording/processing */}
            {!isListening && !isProcessingIntent && voiceText.length > 0 && (
              <View style={styles.voiceActionRow}>
                <TouchableOpacity 
                  style={styles.voiceSecondaryBtn} 
                  onPress={() => { setVoiceText(''); setIsDoneTranscribing(false); }}
                >
                  <Ionicons name="refresh" size={16} color="#8fa3c0" style={{ marginRight: 6 }} />
                  <Text style={styles.voiceSecondaryBtnText}>Clear / Retry</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.voicePrimaryBtn} 
                  onPress={() => handleSendManualText(voiceText)}
                >
                  <Ionicons name="send" size={16} color="#050810" style={{ marginRight: 6 }} />
                  <Text style={styles.voicePrimaryBtnText}>Ask KhidmatAI</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Mic Control Center */}
            <View style={styles.micControlCenter}>
              {isListening ? (
                <Text style={{ color: '#ff4a4a', fontSize: 13, fontWeight: '700', marginBottom: 12 }}>
                  ⏺ Recording jari hai...
                </Text>
              ) : isProcessingIntent ? (
                <Text style={{ color: '#00D4A8', fontSize: 13, fontWeight: '700', marginBottom: 12 }}>
                  {statusMessage || 'Processing...'}
                </Text>
              ) : isDoneTranscribing ? (
                <View style={styles.listeningStateRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#00D4A8" style={{ marginRight: 6 }} />
                  <Text style={[styles.listeningStatusText, { color: '#00D4A8' }]}>Transcription complete!</Text>
                </View>
              ) : (
                <Text style={styles.tapToTalkText}>Tap to start recording</Text>
              )}

              <TouchableOpacity 
                style={[
                  styles.bigMicBtn, 
                  isListening ? styles.bigMicActive : null,
                  isProcessingIntent ? styles.bigMicDisabled : null,
                ]}
                onPress={isListening ? handleStopSpeech : handleStartSpeech}
                disabled={isProcessingIntent}
              >
                <Ionicons 
                  name={isListening ? "stop" : "mic-sharp"} 
                  size={38} 
                  color={isListening ? "#fff" : (isProcessingIntent ? "#5a6a85" : "#050810")} 
                />
              </TouchableOpacity>

              {isListening && (
                <Text style={{ color: '#5a6a85', fontSize: 11, marginTop: 10 }}>
                  Stop karne ke liye button dabayein
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          MAP LOCATION MODAL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={mapModalVisible}
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.voiceSheet, { flex: 0.9, paddingHorizontal: 0, paddingBottom: 0 }]}>
            <View style={styles.sheetHandle} />
            <View style={[styles.sheetHeader, { paddingHorizontal: 24 }]}>
              <Text style={styles.sheetTitle}>📍 Set Location</Text>
              <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setMapModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.mapSearchRow}>
              <TextInput
                style={styles.mapSearchInput}
                placeholder="Search location (e.g. G-9, Islamabad)"
                placeholderTextColor="#5a6a85"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchLocation}
              />
              <TouchableOpacity style={styles.mapSearchBtn} onPress={handleSearchLocation} disabled={searchingLocation}>
                {searchingLocation ? (
                  <ActivityIndicator size="small" color="#050810" />
                ) : (
                  <Ionicons name="search" size={20} color="#050810" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                  latitude: tempCoordinates.lat,
                  longitude: tempCoordinates.lng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                onPress={(e) => {
                  setTempCoordinates({
                    lat: e.nativeEvent.coordinate.latitude,
                    lng: e.nativeEvent.coordinate.longitude
                  });
                }}
              >
                <Marker 
                  coordinate={{ latitude: tempCoordinates.lat, longitude: tempCoordinates.lng }}
                  draggable
                  onDragEnd={(e) => {
                    setTempCoordinates({
                      lat: e.nativeEvent.coordinate.latitude,
                      lng: e.nativeEvent.coordinate.longitude
                    });
                  }}
                >
                  <View style={styles.mapMarker}>
                    <Ionicons name="home" size={20} color="#FFF" />
                  </View>
                </Marker>
              </MapView>
            </View>

            <View style={styles.mapConfirmBox}>
              <Text style={styles.mapConfirmLabel}>Selected Area Coordinates:</Text>
              <Text style={styles.mapConfirmValue}>{tempCoordinates.lat.toFixed(5)}, {tempCoordinates.lng.toFixed(5)}</Text>
              <TouchableOpacity style={styles.mapConfirmBtn} onPress={confirmMapLocation}>
                <Text style={styles.mapConfirmBtnText}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  heroSection: { alignItems: 'center', marginBottom: 35, marginTop: 30 },
  logoBadge: { backgroundColor: 'rgba(0, 212, 168, 0.1)', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24, marginBottom: 10, borderWidth: 1.5, borderColor: 'rgba(0, 212, 168, 0.3)' },
  urduLogo: { fontSize: 38, fontWeight: '800', color: '#00D4A8' },
  appName: { fontSize: 34, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  aiText: { color: '#00D4A8' },
  tagline: { fontSize: 16, color: '#8fa3c0', marginTop: 8, fontWeight: '500' },
  inputWrapper: { backgroundColor: '#0b0f1a', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 18, shadowColor: '#00D4A8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
  promptHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  promptLabel: { color: '#00D4A8', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 110 },
  input: { color: '#FFF', fontSize: 18, textAlignVertical: 'top', lineHeight: 26, flex: 1, paddingRight: 10, minHeight: 110 },
  micBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#00D4A8', justifyContent: 'center', alignItems: 'center', marginBottom: 5, shadowColor: '#00D4A8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  langLabel: { color: '#5a6a85', fontSize: 11, marginTop: 12, fontStyle: 'italic' },
  locationBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(59, 158, 255, 0.2)' },
  locationActive: { borderColor: 'rgba(0, 212, 168, 0.3)', backgroundColor: 'rgba(0, 212, 168, 0.03)' },
  locationIcon: { marginRight: 10 },
  locationBtnText: { color: '#3b9eff', fontSize: 14, fontWeight: '600' },
  locationActiveText: { color: '#00D4A8' },
  submitBtn: { flexDirection: 'row', justifyContent: 'center', backgroundColor: '#00D4A8', padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 35, shadowColor: '#00D4A8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  submitBtnText: { color: '#050810', fontSize: 17, fontWeight: '800' },
  suggestedTitle: { color: '#8fa3c0', fontSize: 14, fontWeight: '600', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickGrid: { flexDirection: 'column', gap: 10 },
  quickBtn: { backgroundColor: '#111827', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  chipRow: { flexDirection: 'row', alignItems: 'center' },
  quickBtnText: { color: '#e4eaf8', fontSize: 14, fontWeight: '500', flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(5, 8, 16, 0.85)', justifyContent: 'flex-end' },
  voiceSheet: { backgroundColor: '#0b0f1a', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  sheetHandle: { width: 40, height: 5, backgroundColor: '#5a6a85', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  sheetCloseBtn: { padding: 4, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  voiceInstruct: { color: '#8fa3c0', fontSize: 14, lineHeight: 20, marginBottom: 20 },
  visualizerContainer: { height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050810', borderRadius: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 100 },
  waveBar: { width: 6, backgroundColor: '#00D4A8', borderRadius: 3 },
  transcriptionBox: { minHeight: 80, backgroundColor: '#111827', borderRadius: 16, padding: 16, justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  transcriptionText: { color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 24, textAlign: 'center' },
  transcriptionInputText: { color: '#fff', fontSize: 16, fontWeight: '600', lineHeight: 24, textAlign: 'center', width: '100%', padding: 0 },
  micControlCenter: { alignItems: 'center' },
  listeningStateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  redPulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff4a4a', marginRight: 8 },
  listeningStatusText: { color: '#8fa3c0', fontSize: 13, fontWeight: '700' },
  tapToTalkText: { color: '#5a6a85', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  bigMicBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#00D4A8', justifyContent: 'center', alignItems: 'center', shadowColor: '#00D4A8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  bigMicActive: { backgroundColor: '#ff4a4a', shadowColor: '#ff4a4a' },
  bigMicDisabled: { backgroundColor: '#1a2035', shadowOpacity: 0 },
  voiceActionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
  voicePrimaryBtn: { flex: 1.2, backgroundColor: '#00D4A8', paddingVertical: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#00D4A8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  voicePrimaryBtnText: { color: '#050810', fontWeight: '800', fontSize: 14 },
  voiceSecondaryBtn: { flex: 1, backgroundColor: '#111827', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingVertical: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  voiceSecondaryBtnText: { color: '#8fa3c0', fontWeight: '700', fontSize: 14 },
  mapSearchRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 16, gap: 10 },
  mapSearchInput: { flex: 1, backgroundColor: '#111827', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, color: '#FFF', paddingHorizontal: 16, height: 50 },
  mapSearchBtn: { width: 50, height: 50, backgroundColor: '#00D4A8', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  mapContainer: { flex: 1, overflow: 'hidden' },
  map: { width: '100%', height: '100%' },
  mapMarker: { width: 40, height: 40, backgroundColor: '#00D4A8', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#050810', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  mapConfirmBox: { padding: 24, backgroundColor: '#0b0f1a', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  mapConfirmLabel: { color: '#8fa3c0', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  mapConfirmValue: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  mapConfirmBtn: { backgroundColor: '#3b9eff', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  mapConfirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});

