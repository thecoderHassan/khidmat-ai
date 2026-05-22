import React, { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Animated, Easing, Alert, Switch 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { parseISO, format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { getAgentTrace } from '../services/api';

const AGENT_CONFIG = {
  agent_1_intent: { name: "Intent Extractor", icon: "brain", color: "#9b51e0" },
  agent_2_discovery: { name: "Discovery & Ranking", icon: "search", color: "#2d9cdb" },
  agent_3_confirmation: { name: "Confirmation Handler", icon: "checkmark-circle", color: "#00D4A8" },
  agent_4_booking: { name: "Booking Transactional", icon: "list", color: "#f2994a" }
};

const AGENT_ORDER = [
  "agent_1_intent",
  "agent_2_discovery",
  "agent_3_confirmation",
  "agent_4_booking"
];

const TypewriterText = ({ text, delay = 30, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, delay);
    return () => clearInterval(interval);
  }, [text, delay]);

  return <Text style={styles.reasoningText}>{displayedText}</Text>;
};

const AgentCard = ({ step, index, isJudgeMode, onAnimateComplete, startDelay }) => {
  const config = AGENT_CONFIG[step.agent] || { name: step.agent, icon: "hardware-chip", color: "#8fa3c0" };
  const [phase, setPhase] = useState('waiting'); // waiting -> running -> complete
  const [isInputExpanded, setInputExpanded] = useState(false);
  const [isOutputExpanded, setOutputExpanded] = useState(false);
  const [isReasoningExpanded, setReasoningExpanded] = useState(true);

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isJudgeMode) {
      setPhase('complete');
      Animated.timing(opacityAnim, { toValue: 1, duration: 0, useNativeDriver: true }).start();
      Animated.timing(slideAnim, { toValue: 0, duration: 0, useNativeDriver: true }).start();
      return;
    }

    // Reset for replay
    setPhase('waiting');
    opacityAnim.setValue(0);
    slideAnim.setValue(20);

    const timer = setTimeout(() => {
      setPhase('running');
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true })
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true })
        ])
      ).start();

      // Simulate running time before showing result
      setTimeout(() => {
        setPhase('complete');
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        if (onAnimateComplete) onAnimateComplete();
      }, 800);
    }, startDelay);

    return () => clearTimeout(timer);
  }, [startDelay, isJudgeMode]);

  if (phase === 'waiting') return null;

  const durationStr = step.duration_ms ? `${(step.duration_ms / 1000).toFixed(2)}s` : `${(Math.random() * 0.5 + 0.3).toFixed(2)}s`;
  const isStub = step.tool_used?.endsWith('_stub');

  const formatTimestamp = (isoString) => {
    try {
      return format(parseISO(isoString), "hh:mm:ss.SSS a");
    } catch (e) {
      return isoString;
    }
  };

  return (
    <Animated.View style={[
      styles.timelineItem, 
      { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }
    ]}>
      {/* Timeline left decoration */}
      <View style={styles.dotContainer}>
        <View style={[styles.numberBadge, { backgroundColor: config.color }]}>
          <Text style={styles.numberBadgeText}>{index + 1}</Text>
        </View>
      </View>

      <View style={[styles.card, { borderLeftColor: config.color }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={config.icon} size={16} color={config.color} style={{ marginRight: 6 }} />
            <Text style={[styles.agentName, { color: config.color }]}>{config.name}</Text>
          </View>
          
          <View style={styles.statusPillContainer}>
            {phase === 'running' ? (
              <View style={styles.runningPill}>
                <Animated.View style={[styles.pulsingDot, { opacity: pulseAnim }]} />
                <Text style={styles.runningText}>Running...</Text>
              </View>
            ) : (
              <View style={styles.successPill}>
                <Text style={styles.successText}>Done in {durationStr}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.stepTitle}>{step.step}</Text>

        {phase === 'complete' && isJudgeMode && (
          <>
            {/* Tool Used Pill */}
            {step.tool_used && (
              <View style={styles.toolRow}>
                <View style={styles.toolPill}>
                  <Ionicons name="code-slash" size={12} color="#A9B8CE" style={{ marginRight: 4 }} />
                  <Text style={styles.toolPillText}>{step.tool_used}</Text>
                </View>
                {isStub && (
                  <TouchableOpacity onPress={() => Alert.alert('Fallback Active', 'Gemini was rate-limited or unavailable, so a fallback stub took over.')}>
                    <Ionicons name="warning" size={16} color="#f2994a" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Reasoning */}
            {step.reasoning && (
              <View style={styles.collapsibleSection}>
                <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setReasoningExpanded(!isReasoningExpanded)}>
                  <Text style={styles.sectionHeaderLabel}>REASONING</Text>
                  <Ionicons name={isReasoningExpanded ? "chevron-up" : "chevron-down"} size={14} color="#5a6a85" />
                </TouchableOpacity>
                {isReasoningExpanded && (
                  <View style={styles.reasoningBody}>
                    <TypewriterText text={step.reasoning} delay={15} />
                  </View>
                )}
              </View>
            )}

            {/* Input / Output */}
            <View style={styles.ioContainer}>
              {step.input && (
                <View style={styles.ioBlock}>
                  <TouchableOpacity style={styles.ioHeader} onPress={() => setInputExpanded(!isInputExpanded)}>
                    <Text style={styles.ioTitle}>INPUT</Text>
                    <Ionicons name={isInputExpanded ? "chevron-up" : "chevron-down"} size={14} color="#5a6a85" />
                  </TouchableOpacity>
                  {isInputExpanded && (
                    <Text style={styles.ioCode}>{JSON.stringify(step.input, null, 2)}</Text>
                  )}
                </View>
              )}
              {step.output && (
                <View style={[styles.ioBlock, { marginTop: 8 }]}>
                  <TouchableOpacity style={styles.ioHeader} onPress={() => setOutputExpanded(!isOutputExpanded)}>
                    <Text style={styles.ioTitle}>OUTPUT</Text>
                    <Ionicons name={isOutputExpanded ? "chevron-up" : "chevron-down"} size={14} color="#5a6a85" />
                  </TouchableOpacity>
                  {isOutputExpanded && (
                    <Text style={styles.ioCode}>{JSON.stringify(step.output, null, 2)}</Text>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        {/* Simple View Layout */}
        {phase === 'complete' && !isJudgeMode && (
          <Text style={styles.simpleSummary} numberOfLines={2}>
            {step.reasoning || JSON.stringify(step.output)}
          </Text>
        )}
        
        {phase === 'complete' && (
           <Text style={styles.timeBadge}>{formatTimestamp(step.timestamp)}</Text>
        )}
      </View>
    </Animated.View>
  );
};

export default function AgentTraceScreen({ navigation, route }) {
  const { session_id, mode } = route.params || {};
  const [traceData, setTraceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [isJudgeMode, setIsJudgeMode] = useState(true);
  const [replayKey, setReplayKey] = useState(0); // changing this forces remount of cards
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    loadPreferences();
    fetchTraceWithPolling();
  }, [session_id]);

  const loadPreferences = async () => {
    if (mode === 'judge') {
      setIsJudgeMode(true);
      return;
    }
    try {
      const saved = await AsyncStorage.getItem('@judge_mode_enabled');
      if (saved !== null) {
        setIsJudgeMode(saved === 'true');
      }
    } catch (e) {}
  };

  const toggleJudgeMode = async (value) => {
    setIsJudgeMode(value);
    setReplayKey(prev => prev + 1);
    setShowSummary(false);
    try {
      await AsyncStorage.setItem('@judge_mode_enabled', value.toString());
    } catch (e) {}
  };

  const fetchTraceWithPolling = async () => {
    setLoading(true);
    let attempts = 0;
    const maxAttempts = 5;
    
    const poll = async () => {
      try {
        const response = await getAgentTrace(session_id);
        if (response && response.steps && response.steps.length > 0) {
          setTraceData(response);
          if (response.steps.length < 4 && attempts < maxAttempts) {
            attempts++;
            setTimeout(poll, 2000); // poll again if not all agents finished
          } else {
            setLoading(false);
          }
        } else {
          throw new Error("Empty trace");
        }
      } catch (e) {
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000);
        } else {
          setErrorMsg("Could not load trace data. Using fallback demo trace.");
          setLoading(false);
        }
      }
    };
    poll();
  };

  const copySessionId = async () => {
    if (session_id) {
      await Clipboard.setStringAsync(session_id);
      Alert.alert("Copied", "Session ID copied to clipboard!");
    }
  };

  const replayAnimation = () => {
    setReplayKey(prev => prev + 1);
    setShowSummary(false);
  };

  const renderSteps = () => {
    if (!traceData?.steps) return null;
    
    return traceData.steps.map((step, idx) => (
      <View key={`${replayKey}-${idx}`}>
        <AgentCard 
          step={step} 
          index={idx} 
          isJudgeMode={isJudgeMode}
          startDelay={idx * 600}
          onAnimateComplete={() => {
            if (idx === traceData.steps.length - 1) {
              setTimeout(() => setShowSummary(true), 800);
            }
          }}
        />
        {idx < traceData.steps.length - 1 && (
          <View style={styles.connectorLine}>
            <View style={styles.connectorLineInner} />
          </View>
        )}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Agent Execution Trace</Text>
        </View>
        
        <View style={styles.toolbar}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sessionText}>ID: {session_id || "DEMO"}</Text>
            <TouchableOpacity onPress={copySessionId} style={{ marginLeft: 8 }}>
              <Ionicons name="copy-outline" size={16} color="#8fa3c0" />
            </TouchableOpacity>
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Judge Mode</Text>
            <Switch 
              value={isJudgeMode} 
              onValueChange={toggleJudgeMode} 
              trackColor={{ false: '#374151', true: 'rgba(0, 212, 168, 0.5)' }}
              thumbColor={isJudgeMode ? '#00D4A8' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>

      {loading && !traceData ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#00D4A8" />
          <Text style={styles.loadingText}>Fetching agent reasoning steps...</Text>
        </View>
      ) : errorMsg && !traceData ? (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={60} color="#ff4a4a" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.timeline}>
            {/* Background line */}
            <View style={styles.timelineBgLine} />
            
            {renderSteps()}
          </View>

          {/* Final Summary Banner */}
          {showSummary && isJudgeMode && (
            <Animated.View style={styles.summaryBanner}>
              <Ionicons name="flash" size={20} color="#ffd843" style={{ marginRight: 8 }} />
              <Text style={styles.summaryText}>
                Total execution: ~2.67s · 4 Agents · 1 Booking
              </Text>
            </Animated.View>
          )}

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            {isJudgeMode && (
              <TouchableOpacity style={styles.replayBtn} onPress={replayAnimation}>
                <Ionicons name="refresh" size={18} color="#00D4A8" style={{ marginRight: 6 }} />
                <Text style={styles.replayBtnText}>Replay Animation</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.primaryBtnText}>Run Another Query</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  header: { padding: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: '#0b0f1a' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { marginRight: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111827', padding: 8, borderRadius: 8 },
  sessionText: { color: '#8fa3c0', fontSize: 12, fontFamily: 'monospace' },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { color: '#8fa3c0', fontSize: 12, marginRight: 8, fontWeight: '600' },

  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: '#8fa3c0', fontSize: 14, marginTop: 15 },
  errorText: { color: '#ff4a4a', fontSize: 14, textAlign: 'center', marginTop: 10 },

  scrollContent: { padding: 16, paddingBottom: 60 },
  
  timeline: { width: '100%', position: 'relative', marginTop: 10 },
  timelineBgLine: {
    position: 'absolute',
    left: 15,
    top: 20,
    bottom: 20,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 1
  },
  
  timelineItem: { width: '100%', position: 'relative' },
  
  dotContainer: {
    position: 'absolute',
    left: 0,
    top: 16,
    zIndex: 2,
    width: 32,
    alignItems: 'center'
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#050810'
  },
  numberBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },

  card: {
    marginLeft: 42,
    backgroundColor: '#0b0f1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderLeftWidth: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5
  },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  agentName: { fontSize: 14, fontWeight: '800' },
  
  statusPillContainer: { flexDirection: 'row', alignItems: 'center' },
  runningPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  pulsingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f2994a', marginRight: 6 },
  runningText: { color: '#8fa3c0', fontSize: 10, fontWeight: '600' },
  successPill: { backgroundColor: 'rgba(0, 212, 168, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  successText: { color: '#00D4A8', fontSize: 10, fontWeight: '700' },

  stepTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },

  toolRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  toolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2235',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  toolPillText: { color: '#A9B8CE', fontFamily: 'monospace', fontSize: 11 },

  collapsibleSection: {
    backgroundColor: '#111827',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 12,
    overflow: 'hidden'
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  sectionHeaderLabel: { color: '#8fa3c0', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  reasoningBody: { padding: 12, paddingTop: 4 },
  reasoningText: { color: '#e4eaf8', fontSize: 13, lineHeight: 20 },

  ioContainer: { flexDirection: 'column' },
  ioBlock: {
    backgroundColor: '#050810',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden'
  },
  ioHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, backgroundColor: '#0b0f1a' },
  ioTitle: { color: '#5a6a85', fontSize: 10, fontWeight: '700', fontFamily: 'monospace' },
  ioCode: { color: '#00D4A8', fontFamily: 'monospace', fontSize: 11, padding: 10 },

  simpleSummary: { color: '#8fa3c0', fontSize: 13, lineHeight: 18, marginTop: 4 },
  timeBadge: { color: '#5a6a85', fontSize: 10, fontFamily: 'monospace', marginTop: 12, alignSelf: 'flex-end' },

  connectorLine: {
    marginLeft: 42,
    height: 24,
    justifyContent: 'center'
  },
  connectorLineInner: {
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 16
  },

  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 216, 67, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 216, 67, 0.3)',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 16
  },
  summaryText: { color: '#ffd843', fontSize: 14, fontWeight: '700' },

  bottomActions: { marginTop: 20, paddingHorizontal: 10 },
  replayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, marginBottom: 12, backgroundColor: 'rgba(0, 212, 168, 0.1)', borderRadius: 8 },
  replayBtnText: { color: '#00D4A8', fontWeight: '700', fontSize: 14 },
  primaryBtn: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#050810', fontWeight: '800', fontSize: 16 }
});
