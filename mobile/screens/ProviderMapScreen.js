import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

export default function ProviderMapScreen({ navigation, route }) {
  const { provider, user_lat, user_lng } = route.params || {};
  const mapRef = useRef(null);

  if (!provider || !provider.lat || !provider.lng) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Location Unavailable</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#8fa3c0' }}>Provider location not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate mid point for initial region
  const latDelta = Math.abs(provider.lat - (user_lat || provider.lat)) * 2 + 0.02;
  const lngDelta = Math.abs(provider.lng - (user_lng || provider.lng)) * 2 + 0.02;
  const initialLat = ((provider.lat + (user_lat || provider.lat)) / 2);
  const initialLng = ((provider.lng + (user_lng || provider.lng)) / 2);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{provider.name}</Text>
      </View>

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: initialLat,
            longitude: initialLng,
            latitudeDelta: latDelta,
            longitudeDelta: lngDelta,
          }}
        >
          {user_lat && user_lng && (
            <Marker coordinate={{ latitude: user_lat, longitude: user_lng }} title="You">
              <View style={styles.userMarker}>
                <Ionicons name="person" size={16} color="#FFF" />
              </View>
            </Marker>
          )}

          <Marker coordinate={{ latitude: provider.lat, longitude: provider.lng }} title={provider.name}>
            <View style={styles.providerMarker}>
              <Ionicons name="star" size={14} color="#050810" />
            </View>
          </Marker>

          {user_lat && user_lng && (
            <Polyline
              coordinates={[
                { latitude: user_lat, longitude: user_lng },
                { latitude: provider.lat, longitude: provider.lng },
              ]}
              strokeColor="#3b9eff"
              strokeWidth={3}
              lineDashPattern={[10, 8]}
            />
          )}
        </MapView>
      </View>

      <View style={styles.bottomCard}>
        <Text style={styles.providerName}>{provider.name}</Text>
        <Text style={styles.providerArea}>{provider.area}</Text>
        {provider.distance_km && (
          <View style={styles.distanceRow}>
            <Ionicons name="location" size={14} color="#00D4A8" />
            <Text style={styles.distanceText}>{provider.distance_km} km away</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  mapWrapper: { flex: 1 },
  map: { width: '100%', height: '100%' },
  userMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3b9eff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  providerMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffd843', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#050810' },
  bottomCard: {
    backgroundColor: '#111827',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)'
  },
  providerName: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  providerArea: { color: '#8fa3c0', fontSize: 14, marginBottom: 8 },
  distanceRow: { flexDirection: 'row', alignItems: 'center' },
  distanceText: { color: '#00D4A8', fontSize: 14, fontWeight: '600', marginLeft: 6 }
});
