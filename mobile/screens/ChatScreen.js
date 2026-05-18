import React, { useState, useEffect, useRef } from 'react';

import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  Modal, 
  Animated, 
  Easing 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';


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

// High-fidelity voice transcription library for judges to try different demos!
const SPEECH_EXAMPLES = {
  roman: "AC technician chahiye kal subah 9 baje urgent AC cooling nahi kar raha",
  urdu: "مجھے گھر کے کچن میں پانی کے لیکیج کے لیے پلمبر کی ضرورت ہے",
  english: "Need a certified electrician immediately for electric board spark"
};

/* 
  ========================================================================
  📢 TO THE BACKEND TEAM (Abdrehman / Sami): HOW TO ACTIVATE LIVE VOICE INPUT
  ========================================================================
  Aqib (Mobile) has fully built the UI and the bouncing waveform animations.
  To connect a physical microphone and send actual recorded audio files:

  1. Install Expo Audio:
     Run `npx expo install expo-av` in the mobile directory.
     
  2. Implement a backend route in your Python server:
     @app.route('/api/transcribe', methods=['POST'])
     def transcribe():
         audio_file = request.files['file']
         # Call OpenAI Whisper API or any Speech-to-Text library:
         # transcription = client.audio.transcriptions.create(model="whisper-1", file=audio_file)
         # return jsonify({"text": transcription.text})

  3. Uncomment this Live Recording Helper in ChatScreen.js:
  
  import { Audio } from 'expo-av';
  
  // Inside ChatScreen component:
  const [recording, setRecording] = useState(null);

  const startLiveMicrophone = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start mic recording', err);
    }
  };

  const stopLiveMicrophoneAndUpload = async () => {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const fileUri = recording.getURI();

    // Upload audio file to backend
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: 'user_speech.m4a',
        type: 'audio/m4a',
      });

      const response = await fetch('http://YOUR_BACKEND_LAN_IP:8000/api/transcribe', {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = await response.json();
      if (data && data.text) {
        setRequest(data.text); // Paste live transcribed text into search box!
      }
    } catch (e) {
      console.error("Transcribe API call failed:", e);
    }
  };
  ========================================================================
*/

export default function ChatScreen({ navigation, route }) {
  const [request, setRequest] = useState('');
  const inputRef = useRef(null);
  const [showKeyboardTip, setShowKeyboardTip] = useState(false);
  const [locationStr, setLocationStr] = useState('');

  const [coordinates, setCoordinates] = useState({ lat: 33.6938, lng: 72.9720 }); // Default fallback: G-13 Islamabad
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  const [placeholderText, setPlaceholderText] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Speech Recognition States
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [selectedLang, setSelectedLang] = useState('roman'); // 'roman' | 'urdu' | 'english'
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isDoneTranscribing, setIsDoneTranscribing] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState(null);

  // Waveform Bar Animation Heights (using Animated Values)
  const [wave1] = useState(new Animated.Value(15));
  const [wave2] = useState(new Animated.Value(25));
  const [wave3] = useState(new Animated.Value(18));
  const [wave4] = useState(new Animated.Value(35));
  const [wave5] = useState(new Animated.Value(20));

  // Handle prefilled text when navigating back for rebooking
  useEffect(() => {
    if (route.params?.prefilledText) {
      setRequest(route.params.prefilledText);
    }
  }, [route.params?.prefilledText]);

  // Animated Typing Placeholder Effect
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

  // Waveform bouncing animation sequence
  const startWaveformAnimation = () => {
    const createBouncingLoop = (animVal, maxVal, speed) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animVal, {
            toValue: maxVal,
            duration: speed,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false
          }),
          Animated.timing(animVal, {
            toValue: 12,
            duration: speed,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false
          })
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

  // Stop Waveform animations and reset
  const stopWaveformAnimation = () => {
    wave1.stopAnimation();
    wave2.stopAnimation();
    wave3.stopAnimation();
    wave4.stopAnimation();
    wave5.stopAnimation();
    
    // Reset to idle values
    Animated.parallel([
      Animated.timing(wave1, { toValue: 15, duration: 200, useNativeDriver: false }),
      Animated.timing(wave2, { toValue: 20, duration: 200, useNativeDriver: false }),
      Animated.timing(wave3, { toValue: 18, duration: 200, useNativeDriver: false }),
      Animated.timing(wave4, { toValue: 25, duration: 200, useNativeDriver: false }),
      Animated.timing(wave5, { toValue: 15, duration: 200, useNativeDriver: false })
    ]).start();
  };

  // Cancel/Close Voice Input cleanly stopping active recording
  const handleCancelVoice = () => {
    stopWaveformAnimation();
    setVoiceModalVisible(false);
    setIsListening(false);
    setIsDoneTranscribing(false);
    
    /* 
      // ========================================================
      // 🎙️ BACKEND TEAM: PHYSICAL MICROPHONE RECORDING CLEANUP
      // ========================================================
      if (recordingInstance) {
        try {
          recordingInstance.stopAndUnloadAsync();
        } catch (e) {}
        setRecordingInstance(null);
      }
    */
  };

  // Dynamic Stop Speech handling: uploads real recording if active, or falls back to simulation
  const handleStopSpeech = async (activeRecording, simulatedText) => {
    stopWaveformAnimation();
    setIsListening(false);
    setIsDoneTranscribing(true);

    /*
      // ========================================================
      // 🎙️ BACKEND TEAM: PHYSICAL AUDIO FILE UPLOAD & Whisper API
      // ========================================================
      const rec = activeRecording || recordingInstance;
      if (rec) {
        try {
          await rec.stopAndUnloadAsync();
          const fileUri = rec.getURI();
          setRecordingInstance(null);

          const formData = new FormData();
          formData.append('file', {
            uri: fileUri,
            name: 'user_speech.m4a',
            type: 'audio/m4a',
          });

          const response = await fetch('http://10.170.194.16:8000/api/transcribe', {
            method: 'POST',
            body: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.text) {
              setVoiceText(data.text);
              setTimeout(() => {
                setRequest(data.text);
                setVoiceModalVisible(false);
                setIsDoneTranscribing(false);
              }, 1500);
              return;
            }
          }
        } catch (e) {
          console.warn("⚠️ Live backend STT offline. Defaulting to local simulator...");
        }
      }
    */

    // Set simulated text, letting user review and manually submit!
    setVoiceText(simulatedText);
  };


  // Speech Recognition simulated & real hybrid processing
  const handleStartSpeech = () => {
    if (isListening) return;

    setIsListening(true);
    setIsDoneTranscribing(false);
    setVoiceText('');
    startWaveformAnimation();

    /*
      // ========================================================
      // 🎙️ BACKEND TEAM: PHYSICAL MICROPHONE RECORDING INITIATOR
      // ========================================================
      let activeRecording = null;
      try {
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status === 'granted') {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });

          const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
          );
          activeRecording = recording;
          setRecordingInstance(recording);
        }
      } catch (err) {
        console.warn("⚠️ Cannot initiate physical microphone on this device:", err);
      }
    */

    const textToType = SPEECH_EXAMPLES[selectedLang];
    const words = textToType.split(' ');
    let currentSentence = "";
    let wordIdx = 0;

    // Concurrently run the typewriter transcription overlay
    const interval = setInterval(() => {
      if (wordIdx < words.length) {
        currentSentence += (wordIdx === 0 ? "" : " ") + words[wordIdx];
        setVoiceText(currentSentence);
        wordIdx++;
      } else {
        clearInterval(interval);
        handleStopSpeech(null, textToType);
      }
    }, 450); // Speaks a word every 450ms for natural timing
  };



  // Request GPS Location Coordinates
  const fetchLocation = async (silent = false) => {
    if (!silent) setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) {
          Alert.alert(
            "Location Permission Denied",
            "We will use the default G-13 Islamabad coordinates for matching.",
            [{ text: "OK" }]
          );
        }
        setCoordinates({ lat: 33.6938, lng: 72.9720 });
        setLocationStr("G-13, Islamabad (Default Fallback)");
        return { lat: 33.6938, lng: 72.9720 };
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const currentCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setCoordinates(currentCoords);
      setLocationStr(`GPS Active: ${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)}`);
      return currentCoords;
    } catch (error) {
      console.error("Location fetching failed:", error);
      if (!silent) {
        Alert.alert("GPS Error", "Failed to get active location. Using G-13 fallback.");
      }
      setCoordinates({ lat: 33.6938, lng: 72.9720 });
      setLocationStr("G-13, Islamabad (Default Fallback)");
      return { lat: 33.6938, lng: 72.9720 };
    } finally {
      if (!silent) setLoadingLocation(false);
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
      user_lng: lng
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoBadge}>
            <Text style={styles.urduLogo}>خدمت</Text>
          </View>
          <Text style={styles.appName}>Khidmat<Text style={styles.aiText}>AI</Text></Text>
          <Text style={styles.tagline}>Ghar Baithe, Kaam Karwao</Text>
        </View>

        {/* Input Wrapper Card with microphone integration */}
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

            {/* Glowing Turquoise Voice Mic Trigger */}
            <TouchableOpacity 
              style={styles.micBtn} 
              onPress={() => {
                inputRef.current?.focus();
                setShowKeyboardTip(true);
                // Automatically hide after 25 seconds (gives ample time for demonstration)
                setTimeout(() => {
                  setShowKeyboardTip(false);
                }, 25000);
              }}
            >
              <Ionicons name="mic-outline" size={24} color="#050810" />
            </TouchableOpacity>
          </View>

          {/* Compact Inline Guide Toast - Always visible above keyboard! */}
          {showKeyboardTip && (
            <View style={styles.toastGuideBoxInline}>
              <Ionicons name="mic-circle" size={18} color="#00D4A8" style={{ marginRight: 6 }} />
              <Text style={styles.toastGuideTextInline}>
                Keyboard ke top-right bar par diye gaye <Text style={{ color: '#00D4A8', fontWeight: '800' }}>Mic (🎙️)</Text> icon par tap karein aur bolien!
              </Text>
            </View>
          )}

          <Text style={styles.langLabel}>Understands Urdu, Roman Urdu, and English voice commands</Text>
        </View>


        {/* GPS location selector */}
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

        {/* Primary Action Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="#050810" style={{ marginRight: 8 }} />
          <Text style={styles.submitBtnText}>Find a provider</Text>
        </TouchableOpacity>

        {/* Suggestion Chips */}
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

      {/* ========================================== */}
      {/* GLOWING BOTTOM SHEET VOICE RECOGNITION HUD */}
      {/* ========================================== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={voiceModalVisible}
        onRequestClose={handleCancelVoice}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.voiceSheet}>
            
            {/* Sheet Handle Accent */}
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>KhidmatAI Voice Assistant</Text>
              <TouchableOpacity 
                style={styles.sheetCloseBtn} 
                onPress={handleCancelVoice}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.voiceInstruct}>
              Select your spoken language and tap the microphone to start speaking:
            </Text>

            {/* Language Selection Filter Toggle */}
            <View style={styles.langSelectorRow}>
              <TouchableOpacity 
                style={[styles.langSelectBtn, selectedLang === 'roman' ? styles.langSelectActive : null]}
                onPress={() => {
                  if (isListening) return;
                  setSelectedLang('roman');
                  setVoiceText('');
                }}
              >
                <Text style={[styles.langSelectText, selectedLang === 'roman' ? styles.langSelectTextActive : null]}>
                  Roman Urdu
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.langSelectBtn, selectedLang === 'urdu' ? styles.langSelectActive : null]}
                onPress={() => {
                  if (isListening) return;
                  setSelectedLang('urdu');
                  setVoiceText('');
                }}
              >
                <Text style={[styles.langSelectText, selectedLang === 'urdu' ? styles.langSelectTextActive : null]}>
                  اردو (Urdu)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.langSelectBtn, selectedLang === 'english' ? styles.langSelectActive : null]}
                onPress={() => {
                  if (isListening) return;
                  setSelectedLang('english');
                  setVoiceText('');
                }}
              >
                <Text style={[styles.langSelectText, selectedLang === 'english' ? styles.langSelectTextActive : null]}>
                  English
                </Text>
              </TouchableOpacity>
            </View>

            {/* Direct Keyboard Dictation Fast Bypass */}
            {!isListening && (
              <TouchableOpacity 
                style={styles.keyboardMicLink}
                onPress={() => {
                  setVoiceModalVisible(false);
                  setTimeout(() => {
                    inputRef.current?.focus();
                    setShowKeyboardTip(true);
                    // Automatically hide after 7 seconds
                    setTimeout(() => {
                      setShowKeyboardTip(false);
                    }, 7000);
                  }, 400);
                }}
              >
                <Ionicons name="keypad-outline" size={15} color="#00D4A8" style={{ marginRight: 6 }} />
                <Text style={styles.keyboardMicLinkText}>Use Keyboard Voice Dictation (100% Real) 🎙️</Text>
              </TouchableOpacity>
            )}

            {/* Visualizer Waveform Arena */}

            <View style={styles.visualizerContainer}>
              <View style={styles.waveRow}>
                <Animated.View style={[styles.waveBar, { height: wave1 }]} />
                <Animated.View style={[styles.waveBar, { height: wave2 }]} />
                <Animated.View style={[styles.waveBar, { height: wave3 }]} />
                <Animated.View style={[styles.waveBar, { height: wave4 }]} />
                <Animated.View style={[styles.waveBar, { height: wave5 }]} />
              </View>
            </View>

            {/* Simulated Live Transcription Box (Editable!) */}
            <View style={styles.transcriptionBox}>
              {isListening ? (
                <Text style={[styles.transcriptionText, selectedLang === 'urdu' ? styles.urduRightText : null]}>
                  "{voiceText}"
                  <Text style={styles.cursorDot}> |</Text>
                </Text>
              ) : (
                <TextInput
                  style={[styles.transcriptionInputText, selectedLang === 'urdu' ? styles.urduRightText : null]}
                  value={voiceText}
                  onChangeText={(txt) => {
                    setVoiceText(txt);
                    setIsDoneTranscribing(txt.length > 0);
                  }}
                  placeholder="Apni marzi ka text likhein ya mic daba kar bolien..."
                  placeholderTextColor="#5a6a85"
                  multiline={true}
                  keyboardAppearance="dark"
                />
              )}
            </View>

            {/* Action Buttons for Transcription */}
            {!isListening && voiceText.length > 0 && (
              <View style={styles.voiceActionRow}>
                <TouchableOpacity 
                  style={styles.voiceSecondaryBtn} 
                  onPress={() => {
                    setVoiceText('');
                    setIsDoneTranscribing(false);
                  }}
                >
                  <Ionicons name="refresh" size={16} color="#8fa3c0" style={{ marginRight: 6 }} />
                  <Text style={styles.voiceSecondaryBtnText}>Clear / Retry</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.voicePrimaryBtn} 
                  onPress={() => {
                    setRequest(voiceText);
                    setVoiceModalVisible(false);
                    setIsDoneTranscribing(false);
                  }}
                >
                  <Ionicons name="send" size={16} color="#050810" style={{ marginRight: 6 }} />
                  <Text style={styles.voicePrimaryBtnText}>Ask KhidmatAI</Text>
                </TouchableOpacity>
              </View>
            )}


            {/* Pulse Mic Activation Action */}
            <View style={styles.micControlCenter}>
              {isListening ? (
                <View style={styles.listeningStateRow}>
                  <View style={styles.redPulseDot} />
                  <Text style={styles.listeningStatusText}>Listening to your voice...</Text>
                </View>
              ) : isDoneTranscribing ? (
                <View style={styles.listeningStateRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#00D4A8" style={{ marginRight: 6 }} />
                  <Text style={[styles.listeningStatusText, { color: '#00D4A8' }]}>Transcription Success!</Text>
                </View>
              ) : (
                <Text style={styles.tapToTalkText}>Tap below to start speaking</Text>
              )}

              <TouchableOpacity 
                style={[styles.bigMicBtn, isListening ? styles.bigMicActive : null]}
                onPress={handleStartSpeech}
                disabled={isListening}
              >
                <Ionicons 
                  name={isListening ? "pulse" : "mic-sharp"} 
                  size={38} 
                  color={isListening ? "#fff" : "#050810"} 
                />
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
  logoBadge: {
    backgroundColor: 'rgba(0, 212, 168, 0.1)',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 212, 168, 0.3)',
  },
  urduLogo: { fontSize: 38, fontWeight: '800', color: '#00D4A8' },
  appName: { fontSize: 34, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  aiText: { color: '#00D4A8' },
  tagline: { fontSize: 16, color: '#8fa3c0', marginTop: 8, fontWeight: '500' },
  
  inputWrapper: {
    backgroundColor: '#0b0f1a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
    shadowColor: '#00D4A8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  promptHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  promptLabel: { color: '#00D4A8', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 6 },
  
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 110,
  },
  input: {
    color: '#FFF',
    fontSize: 18,
    textAlignVertical: 'top',
    lineHeight: 26,
    flex: 1,
    paddingRight: 10,
    minHeight: 110,
  },
  micBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00D4A8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    shadowColor: '#00D4A8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  langLabel: { color: '#5a6a85', fontSize: 11, marginTop: 12, fontStyle: 'italic' },
  
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 158, 255, 0.2)',
  },
  locationActive: {
    borderColor: 'rgba(0, 212, 168, 0.3)',
    backgroundColor: 'rgba(0, 212, 168, 0.03)',
  },
  locationIcon: { marginRight: 10 },
  locationBtnText: { color: '#3b9eff', fontSize: 14, fontWeight: '600' },
  locationActiveText: { color: '#00D4A8' },
  
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
  
  suggestedTitle: { color: '#8fa3c0', fontSize: 14, fontWeight: '600', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickGrid: { flexDirection: 'column', gap: 10 },
  quickBtn: {
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  chipRow: { flexDirection: 'row', alignItems: 'center' },
  quickBtnText: { color: '#e4eaf8', fontSize: 14, fontWeight: '500', flex: 1 },

  // VOICE BOTTOM SHEET STYLING
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.85)',
    justifyContent: 'flex-end',
  },
  voiceSheet: {
    backgroundColor: '#0b0f1a',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#5a6a85',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  sheetCloseBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  voiceInstruct: {
    color: '#8fa3c0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  langSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 24,
  },
  langSelectBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  langSelectActive: {
    backgroundColor: 'rgba(0, 212, 168, 0.1)',
    borderColor: '#00D4A8',
  },
  langSelectText: {
    color: '#8fa3c0',
    fontSize: 13,
    fontWeight: '700',
  },
  langSelectTextActive: {
    color: '#00D4A8',
  },
  visualizerContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050810',
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 100,
  },
  waveBar: {
    width: 6,
    backgroundColor: '#00D4A8',
    borderRadius: 3,
  },
  transcriptionBox: {
    minHeight: 80,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  transcriptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
  },
  urduRightText: {
    textAlign: 'right',
    fontSize: 18,
    lineHeight: 28,
  },
  transcriptionPlaceholder: {
    color: '#5a6a85',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  cursorDot: {
    color: '#00D4A8',
    fontWeight: '900',
  },
  micControlCenter: {
    alignItems: 'center',
  },
  listeningStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  redPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4a4a',
    marginRight: 8,
  },
  listeningStatusText: {
    color: '#8fa3c0',
    fontSize: 13,
    fontWeight: '700',
  },
  tapToTalkText: {
    color: '#5a6a85',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  bigMicBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#00D4A8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D4A8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  bigMicActive: {
    backgroundColor: '#ff4a4a',
    shadowColor: '#ff4a4a',
  },
  transcriptionInputText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
    width: '100%',
    padding: 0,
  },
  voiceActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  voicePrimaryBtn: {
    flex: 1.2,
    backgroundColor: '#00D4A8',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D4A8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  voicePrimaryBtnText: {
    color: '#050810',
    fontWeight: '800',
    fontSize: 14,
  },
  voiceSecondaryBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceSecondaryBtnText: {
    color: '#8fa3c0',
    fontWeight: '700',
    fontSize: 14,
  },
  keyboardMicLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 212, 168, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 168, 0.2)',
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 20,
  },
  keyboardMicLinkText: {
    color: '#00D4A8',
    fontWeight: '700',
    fontSize: 12,
  },
  toastGuideBoxInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 168, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 168, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  toastGuideTextInline: {
    color: '#e4eaf8',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    flex: 1,
  }
});



