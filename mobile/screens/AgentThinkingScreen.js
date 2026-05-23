import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { submitRequest } from '../services/api';

const THINKING_STEPS = [
  { id: 1, text: "Agent 1: Extracting prompt intent & language...", status: "pending" },
  { id: 2, text: "Agent 2: Filtering locations & checking live slots...", status: "pending" },
  { id: 3, text: "Agent 3: Executing multi-criteria discovery & scoring...", status: "pending" },
  { id: 4, text: "Agent 4: Preparing final recommendations...", status: "pending" }
];

export default function AgentThinkingScreen({ navigation, route }) {
  const { request, user_lat, user_lng, session_id } = route.params || { request: '', user_lat: 33.6938, user_lng: 72.9720, session_id: "SES-" + Date.now() };
  const [steps, setSteps] = useState(THINKING_STEPS);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    let active = true;
    let apiData = null;
    let visualDone = false;

    // 1. Start API request immediately
    submitRequest(request, user_lat, user_lng, session_id)
      .then((data) => {
        if (!active) return;
        apiData = data;
        checkAndNavigate();
      })
      .catch((err) => {
        if (!active) return;
        console.error("API request failed:", err);
        setErrorMsg(
          err?.response?.data?.message || 
          err.message || 
          "Could not connect to the agent backend. Please check your LAN server connection."
        );
        setLoading(false);
      });

    // 2. Animate the multi-agent steps sequentially
    const stepIntervals = [800, 1600, 2400, 3200];
    const timers = [];

    stepIntervals.forEach((delay, idx) => {
      timers.push(
        setTimeout(() => {
          if (!active) return;
          setSteps(prev => 
            prev.map((step, sIdx) => {
              if (sIdx < idx) return { ...step, status: "completed" };
              if (sIdx === idx) return { ...step, status: "active" };
              return step;
            })
          );
          setCurrentStepIndex(idx);
          if (idx === THINKING_STEPS.length - 1) {
            visualDone = true;
            checkAndNavigate();
          }
        }, delay)
      );
    });

    // Transition once both API has finished and visual step animation is done
    const checkAndNavigate = () => {
      if (apiData && visualDone && active) {
        setSteps(prev => prev.map(s => ({ ...s, status: "completed" })));
        setTimeout(() => {
          navigation.replace('ProviderResults', { 
            results: apiData, 
            request: request 
          });
        }, 300);
      }
    };

    return () => {
      active = false;
      timers.forEach(clearTimeout);
    };
  }, [request, user_lat, user_lng, navigation]);

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {loading && !errorMsg ? (
          <>
            <ActivityIndicator size="large" color="#00D4A8" style={styles.spinner} />
            <Text style={styles.title}>Agents are analyzing...</Text>
            <Text style={styles.subtitle}>Parsing prompt: "{request}"</Text>

            <View style={styles.stepsContainer}>
              {steps.map((step, idx) => {
                const isActive = step.status === "active";
                const isCompleted = step.status === "completed";
                
                return (
                  <View key={step.id} style={[styles.stepRow, isActive && styles.activeRow]}>
                    {isCompleted ? (
                      <Ionicons name="checkmark-circle" size={20} color="#00D4A8" />
                    ) : isActive ? (
                      <ActivityIndicator size="small" color="#ffd843" />
                    ) : (
                      <Ionicons name="ellipse-outline" size={20} color="#5a6a85" />
                    )}
                    <Text 
                      style={[
                        styles.step, 
                        isCompleted && styles.completedStepText,
                        isActive && styles.activeStepText
                      ]}
                    >
                      {step.text}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={60} color="#ff4a4a" style={{ marginBottom: 15 }} />
            <Text style={styles.errorTitle}>Connection Failed</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <Text style={styles.tipText}>
              💡 Dev Tip: Make sure your laptop and mobile device are on the same Wi-Fi network and your server is listening on your local LAN IP (e.g. 192.168.x.x), not localhost.
            </Text>
            
            <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.replace('AgentThinking', { request, user_lat, user_lng, session_id })}>
              <Ionicons name="refresh" size={20} color="#050810" style={{ marginRight: 6 }} />
              <Text style={styles.retryBtnText}>Retry Matching</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  spinner: { marginBottom: 25 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#00D4A8', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#8fa3c0', textAlign: 'center', fontStyle: 'italic', marginBottom: 40, paddingHorizontal: 10 },
  
  stepsContainer: { 
    width: '100%', 
    backgroundColor: '#0b0f1a', 
    padding: 24, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, paddingVertical: 4 },
  activeRow: { backgroundColor: 'rgba(255, 216, 67, 0.04)', borderRadius: 10, paddingHorizontal: 6 },
  step: { color: '#5a6a85', fontSize: 14, marginLeft: 12, fontWeight: '500' },
  activeStepText: { color: '#ffd843', fontWeight: 'bold' },
  completedStepText: { color: '#e4eaf8' },

  errorContainer: { alignItems: 'center', width: '100%' },
  errorTitle: { fontSize: 22, fontWeight: 'bold', color: '#ff4a4a', marginBottom: 12 },
  errorText: { color: '#8fa3c0', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  tipText: { color: '#5a6a85', fontSize: 12, textAlign: 'center', lineHeight: 18, fontStyle: 'italic', backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, marginBottom: 24 },
  retryBtn: { flexDirection: 'row', backgroundColor: '#00D4A8', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, alignItems: 'center', marginBottom: 14 },
  retryBtnText: { color: '#050810', fontWeight: 'bold', fontSize: 16 },
  backBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText: { color: '#8fa3c0', fontSize: 14, fontWeight: '600' }
});
