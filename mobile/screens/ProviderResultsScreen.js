import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { providersData } from './providersData';

export default function ProviderResultsScreen({ navigation, route }) {
  const { service, location } = route.params || { service: 'AC Technician', location: '' };

  const filteredProviders = providersData.providers.filter(p => 
    !service || p.service_categories.some(cat => cat.toLowerCase().includes(service.toLowerCase()))
  );

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const renderItem = ({ item, index }) => {
    const isBestMatch = index === 0 && item.available;
    const initials = item.name.split(' ').map(n => n[0]).join('').substring(0, 2);

    return (
      <View style={[styles.card, isBestMatch && styles.bestMatchCard, !item.available && styles.disabledCard]}>
        
        <View style={styles.cardHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{item.name}</Text>
            {isBestMatch && (
              <View style={styles.bestBadgeWrap}>
                <Ionicons name="star" size={10} color="#050810" style={{position:'absolute', zIndex:1, left:8, top:4}} />
                <Text style={styles.bestMatchBadge}>   TOP MATCH</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.detailsBlock}>
          <Text style={styles.categoryText}>{item.service_categories.join(', ')}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoPill}>
              <Ionicons name="location-sharp" size={12} color="#e4eaf8" />
              <Text style={styles.infoPillText}>{item.area}</Text>
            </View>
            <View style={styles.infoPill}>
              <Ionicons name="star" size={12} color="#ffd060" />
              <Text style={styles.infoPillText}>{item.rating}</Text>
            </View>
            <View style={styles.infoPill}>
              <Ionicons name="cash-outline" size={12} color="#00D4A8" />
              <Text style={styles.infoPillText}>Rs {item.price_range}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.callBtn} 
            onPress={() => handleCall(item.phone || '03001234567')}
          >
            <Ionicons name="call" size={16} color="#3b9eff" style={{marginRight: 6}} />
            <Text style={styles.callBtnText}>Call Provider</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.bookBtn, !item.available && styles.disabledBtn]} 
            disabled={!item.available}
            onPress={() => navigation.navigate('BookingConfirm', { provider: item })}
          >
            <Text style={styles.bookBtnText}>{item.available ? 'Book Service' : 'Currently Busy'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Experts</Text>
        <Text style={styles.subtitle}>Found {filteredProviders.length} providers near you</Text>
      </View>

      <View style={styles.aiBanner}>
        <Ionicons name="hardware-chip" size={16} color="#9d78ff" style={{marginRight: 6}} />
        <Text style={styles.aiBannerText}>AI successfully analyzed your prompt.</Text>
      </View>

      {filteredProviders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={40} color="#3a4a65" />
          <Text style={styles.emptyText}>No providers found matching your request.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProviders}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  header: { padding: 24, paddingTop: 30, backgroundColor: '#0b0f1a', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  title: { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#00D4A8', marginTop: 5, fontWeight: '600' },
  
  aiBanner: { flexDirection: 'row', backgroundColor: 'rgba(157, 120, 255, 0.1)', padding: 12, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderColor: 'rgba(157, 120, 255, 0.2)' },
  aiBannerText: { color: '#9d78ff', fontSize: 12, fontWeight: '600' },
  
  list: { padding: 16, paddingBottom: 40 },
  
  card: { 
    backgroundColor: '#111827', 
    borderRadius: 20, 
    padding: 18, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.06)',
    elevation: 4
  },
  bestMatchCard: { 
    borderColor: '#00D4A8', 
    borderWidth: 1.5,
    backgroundColor: '#0a1a24'
  },
  disabledCard: { opacity: 0.5 },
  
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  profileAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(59, 158, 255, 0.15)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
    borderWidth: 1, borderColor: 'rgba(59, 158, 255, 0.3)'
  },
  avatarText: { color: '#3b9eff', fontWeight: 'bold', fontSize: 16, textTransform: 'uppercase' },
  headerInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 4 },
  bestBadgeWrap: { alignSelf: 'flex-start', position: 'relative' },
  bestMatchBadge: { 
    backgroundColor: '#00D4A8', color: '#050810', 
    paddingHorizontal: 8, paddingVertical: 3, 
    borderRadius: 6, fontSize: 10, fontWeight: '900', overflow: 'hidden' 
  },
  
  detailsBlock: { marginBottom: 20 },
  categoryText: { color: '#00D4A8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoPill: { 
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a2235',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
  },
  infoPillText: { color: '#e4eaf8', fontSize: 11, marginLeft: 4 },
  
  actionRow: { flexDirection: 'row', gap: 12 },
  callBtn: { 
    flexDirection: 'row', flex: 1, backgroundColor: 'rgba(59, 158, 255, 0.1)', 
    paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(59, 158, 255, 0.3)'
  },
  callBtnText: { color: '#3b9eff', fontWeight: 'bold', fontSize: 14 },
  
  bookBtn: { 
    flex: 1.5, backgroundColor: '#00D4A8', 
    paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center'
  },
  disabledBtn: { backgroundColor: '#3a4a65' },
  bookBtnText: { color: '#050810', fontWeight: 'bold', fontSize: 15 },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: '#8fa3c0', fontSize: 16, marginTop: 10 }
});
