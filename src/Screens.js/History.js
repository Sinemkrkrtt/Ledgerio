import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SectionList,
  ActivityIndicator,
  Modal,
  useWindowDimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EvilIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from './ThemeContext'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth, db } from '../../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

const getCategoryMeta = (categoryName, isDarkMode) => {
  const meta = {
    'Yemek':        { icon: 'fast-food',   color: isDarkMode ? '#FB7185' : '#E11D48' }, 
    'Food':         { icon: 'fast-food',   color: isDarkMode ? '#FB7185' : '#E11D48' }, 
    'Market':       { icon: 'cart',        color: isDarkMode ? '#FBBF24' : '#D97706' }, 
    'Grocery':      { icon: 'cart',        color: isDarkMode ? '#FBBF24' : '#D97706' }, 
    'Ulaşım':       { icon: 'car',         color: isDarkMode ? '#60A5FA' : '#1D4ED8' }, 
    'Transport':    { icon: 'car',         color: isDarkMode ? '#60A5FA' : '#1D4ED8' }, 
    'Eğlence':      { icon: 'play-circle', color: isDarkMode ? '#A78BFA' : '#7C3AED' }, 
    'Fun':          { icon: 'play-circle', color: isDarkMode ? '#A78BFA' : '#7C3AED' }, 
    'Sağlık':       { icon: 'medkit',      color: isDarkMode ? '#F472B6' : '#DB2777' }, 
    'Health':       { icon: 'medkit',      color: isDarkMode ? '#F472B6' : '#DB2777' }, 
    'Giyim':        { icon: 'shirt',       color: isDarkMode ? '#818CF8' : '#4F46E5' },
    'Clothing':     { icon: 'shirt',       color: isDarkMode ? '#818CF8' : '#4F46E5' },
    'Barınma':      { icon: 'home',        color: isDarkMode ? '#94A3B8' : '#1E293B' },
    'Housing':      { icon: 'home',        color: isDarkMode ? '#94A3B8' : '#1E293B' },
    'Abonelik':     { icon: 'repeat',      color: isDarkMode ? '#A78BFA' : '#8B5CF6' },
    'Subscription': { icon: 'repeat',      color: isDarkMode ? '#A78BFA' : '#8B5CF6' },
    'Fatura':       { icon: 'flash',       color: isDarkMode ? '#38BDF8' : '#0EA5E9' },
    'Bill':         { icon: 'flash',       color: isDarkMode ? '#38BDF8' : '#0EA5E9' },
    'Eğitim':       { icon: 'book',        color: isDarkMode ? '#34D399' : '#10B981' },
    'Edu':          { icon: 'book',        color: isDarkMode ? '#34D399' : '#10B981' },
    
    'Maaş':         { icon: 'cash',        color: isDarkMode ? '#34D399' : '#059669' },
    'Salary':       { icon: 'cash',        color: isDarkMode ? '#34D399' : '#059669' },
    'Burs':         { icon: 'school',      color: isDarkMode ? '#38BDF8' : '#0284C7' },
    'Grant':        { icon: 'school',      color: isDarkMode ? '#38BDF8' : '#0284C7' },
    'Ek İş':        { icon: 'rocket',      color: isDarkMode ? '#C084FC' : '#9333EA' },
    'Side Gig':     { icon: 'rocket',      color: isDarkMode ? '#C084FC' : '#9333EA' },
    'Yatırım':      { icon: 'trending-up', color: isDarkMode ? '#4ADE80' : '#16A34A' },
    'Invest':       { icon: 'trending-up', color: isDarkMode ? '#4ADE80' : '#16A34A' },
    'Satış':        { icon: 'pricetag',    color: isDarkMode ? '#FBBF24' : '#D97706' },
    'Sale':         { icon: 'pricetag',    color: isDarkMode ? '#FBBF24' : '#D97706' },
    'Hediye':       { icon: 'gift',        color: isDarkMode ? '#F472B6' : '#DB2777' },
    'Gift':         { icon: 'gift',        color: isDarkMode ? '#F472B6' : '#DB2777' },
    'Faiz':         { icon: 'business',    color: isDarkMode ? '#60A5FA' : '#1D4ED8' },
    'Interest':     { icon: 'business',    color: isDarkMode ? '#60A5FA' : '#1D4ED8' },
    
    'Diğer':        { icon: 'archive',     color: isDarkMode ? '#94A3B8' : '#475569' },
    'Other':        { icon: 'archive',     color: isDarkMode ? '#94A3B8' : '#475569' },
  };

  return meta[categoryName] || { icon: 'receipt', color: '#94A3B8' };
};

const History = () => {
  const { isDarkMode, language } = useTheme();

  // 🌟 Tablet kontrolü
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilterId, setActiveFilterId] = useState('all');

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const themeAccent = isDarkMode ? '#09F8F0' : '#040E68';
  const themeText = isDarkMode ? '#F8FAFC' : '#1E293B';
  const themeCard = isDarkMode ? '#1E293B' : '#F8FAFC';
  const themeBorder = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9';

  const t = {
    searchPlaceholder: language === 'tr' ? 'İşlem veya kategori ara...' : 'Search transaction or category...',
    all: language === 'tr' ? 'Tümü' : 'All',
    income: language === 'tr' ? 'Gelir' : 'Income',
    expense: language === 'tr' ? 'Gider' : 'Expense',
    thisMonth: language === 'tr' ? 'Bu Ay' : 'This Month',
    emptyList: language === 'tr' ? 'İşlem bulunamadı.' : 'No transactions found.',
    amount: language === 'tr' ? 'TUTAR' : 'AMOUNT',
    date: language === 'tr' ? 'TARİH' : 'DATE',
    noteLabel: language === 'tr' ? 'AÇIKLAMA / NOT' : 'DESCRIPTION / NOTE',
    noNote: language === 'tr' ? 'Bu işlem için bir not eklenmemiş.' : 'No note added for this transaction.',
    close: language === 'tr' ? 'KAPAT' : 'CLOSE',
  };

  const filters = [
      { id: 'all', label: t.all },
      { id: 'income', label: t.income },
      { id: 'expense', label: t.expense },
      { id: 'thisMonth', label: t.thisMonth }
  ];

  const fetchHistory = async () => {
    try {
      setLoading(true);
      
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const userId = currentUser.uid;

      const q = query(
          collection(db, 'transactions'),
          where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const data = [];

      querySnapshot.forEach((doc) => {
          const docData = doc.data();
          data.push({
              id: doc.id,
              ...docData,
              date: docData.date?.toDate ? docData.date.toDate().toISOString() : docData.date
          });
      });
      
      const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setTransactions(sortedData);
    } catch (error) { 
        console.error("Firebase Çekme Hatası:", error); 
    } finally { 
        setLoading(false); 
    }
  };

  useFocusEffect(useCallback(() => { fetchHistory(); }, []));

  const getGroupedData = () => {
    let filtered = transactions.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                            item.category.toLowerCase().includes(search.toLowerCase());
                            
      const matchesChip = activeFilterId === 'all' || 
                          (activeFilterId === 'income' && item.type === 'gelir') || 
                          (activeFilterId === 'expense' && item.type === 'gider') ||
                          (activeFilterId === 'thisMonth' && new Date(item.date).getMonth() === new Date().getMonth());
      return matchesSearch && matchesChip;
    });

    const groupedArray = [];
    filtered.forEach(item => {
      const date = new Date(item.date);
      const title = date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
      const existingSection = groupedArray.find(section => section.title === title);
      
      if (existingSection) { existingSection.data.push(item); } 
      else { groupedArray.push({ title, data: [item] }); }
    });
    return groupedArray;
  };
  
  const renderItem = ({ item }) => {
    const meta = getCategoryMeta(item.category, isDarkMode);
    return (
      <TouchableOpacity 
        style={[styles.transactionItem, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }]} 
        activeOpacity={0.7}
        onPress={() => {
            setSelectedTransaction(item);
            setDetailModalVisible(true);
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={[styles.transactionName, { color: themeText }]}>{item.name}</Text>
          <Text style={styles.transactionSub}>
            {item.category} • {new Date(item.date).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, { color: item.type === 'gider' ? '#EF4444' : '#22C55E' }]}>
          {item.type === 'gider' ? '-' : '+'} ₺{parseFloat(item.amount).toLocaleString('tr-TR')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF' }]}>
      
      {/* 🌟 Kısıtlama tamamen kaldırıldı, %100 yayılıyor */}
      <View style={styles.innerWrapper}>
        
        {/* Arama Çubuğu */}
        <View style={[styles.searchSection, isTablet && { paddingHorizontal: 40, marginTop: 25 }]}>
          <View style={[styles.searchWrapper, { backgroundColor: themeCard, borderColor: themeBorder }]}>
            <EvilIcons name="search" size={28} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              placeholder={t.searchPlaceholder}
              placeholderTextColor="#94A3B8"
              style={[styles.searchInput, { color: themeText }]}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Filtre Çipleri */}
        <View style={[styles.chipContainer, isTablet && { paddingLeft: 40, marginTop: 15, marginBottom: 25 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filters.map((filter, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => setActiveFilterId(filter.id)}
                style={[
                  styles.chip, 
                  { backgroundColor: themeCard, borderColor: themeBorder },
                  // 🌟 Tablette butonlar daha uzun, geniş ve aralıklı yapıldı
                  isTablet && { paddingVertical: 16, paddingHorizontal: 45, marginRight: 16, borderRadius: 20 },
                  activeFilterId === filter.id && { backgroundColor: themeAccent, borderColor: themeAccent }
                ]}
              >
                <Text style={[
                  styles.chipText, 
                  // 🌟 Tablette yazı boyutu büyütüldü
                  isTablet && { fontSize: 16 },
                  activeFilterId === filter.id && { color: isDarkMode ? '#0F172A' : '#FFFFFF' }
                ]}>{filter.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Liste */}
        {loading ? (
          <ActivityIndicator size="large" color={themeAccent} style={{ marginTop: 50 }} />
        ) : (
            <SectionList
            sections={getGroupedData()}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem} 
            renderSectionHeader={({ section: { title } }) => (
              <View style={[styles.sectionHeader, { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF' }]}>
                <Text style={styles.sectionTitle}>{title}</Text>
              </View>
            )}
            stickySectionHeadersEnabled={true}
            contentContainerStyle={[styles.listContent, isTablet && { paddingHorizontal: 40 }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', marginTop: 50, color: '#94A3B8', fontSize: isTablet ? 16 : 14 }}>{t.emptyList}</Text>
            }
          />
        )}

      </View>

      {/* DETAY MODALI */}
      <Modal
          visible={detailModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setDetailModalVisible(false)}
      >
          <TouchableOpacity 
              style={[styles.modalOverlay, { justifyContent: isTablet ? 'center' : 'flex-end' }]} 
              activeOpacity={1} 
              onPress={() => setDetailModalVisible(false)}
          >
              <TouchableOpacity 
                activeOpacity={1}
                style={[
                  styles.detailContainer, 
                  { backgroundColor: isDarkMode ? '#1E293B' : 'white' },
                  isTablet && { 
                    width: 500, 
                    alignSelf: 'center', 
                    borderRadius: 32, 
                    paddingBottom: 25 
                  }
                ]}
              >
                  <View style={styles.detailHeader}>
                      <View style={[styles.detailIconCircle, { backgroundColor: `${getCategoryMeta(selectedTransaction?.category, isDarkMode).color}15` }]}>
                          <Ionicons 
                            name={getCategoryMeta(selectedTransaction?.category, isDarkMode).icon} 
                            size={34} 
                            color={getCategoryMeta(selectedTransaction?.category, isDarkMode).color} 
                          />
                      </View>
                      <Text style={[styles.detailTitle, { color: themeText }]}>{selectedTransaction?.category}</Text>
                  </View>

                  <View style={[styles.detailDivider, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9' }]} />

                  <View style={styles.detailBody}>
                      <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>{t.amount}</Text>
                          <Text style={[styles.detailValue, { color: selectedTransaction?.type === 'gider' ? '#EF4444' : '#22C55E' }]}>
                              {selectedTransaction?.type === 'gider' ? '-' : '+'} ₺{parseFloat(selectedTransaction?.amount || 0).toLocaleString('tr-TR')}
                          </Text>
                      </View>

                      <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>{t.date}</Text>
                          <Text style={[styles.detailValue, { color: themeText }]}>
                              {new Date(selectedTransaction?.date).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </Text>
                      </View>

                      <View style={styles.noteSection}>
                          <Text style={styles.detailLabel}>{t.noteLabel}</Text>
                          <View style={[styles.noteBox, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }]}>
                              <Text style={[styles.noteText, { color: themeText }]}>
                                  {selectedTransaction?.notes || t.noNote}
                              </Text>
                          </View>
                      </View>
                  </View>

                  <TouchableOpacity 
                      style={[styles.closeButton, { backgroundColor: themeAccent }]}
                      onPress={() => setDetailModalVisible(false)}
                  >
                      <Text style={[styles.closeButtonText, { color: isDarkMode ? '#0F172A' : '#FFFFFF' }]}>{t.close}</Text>
                  </TouchableOpacity>
              </TouchableOpacity>
          </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default History;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // 🌟 Tüm ekran genişliği
  innerWrapper: {
    flex: 1,
    width: '100%',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 10,
    marginTop: 13,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchIcon: {
    marginTop: -4,
  },
  searchInput: {
    fontFamily: 'Poppins-Medium',
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  chipContainer: {
    marginTop: 5,
    marginBottom: 15,
    paddingLeft: 20,
  },
  chip: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  chipText: {
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.3,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  sectionHeader: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    marginTop: 5,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Black',
    fontSize: 11,
    color: '#94A3B8',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
    marginLeft: 15,
  },
  transactionName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    letterSpacing: -0.2,
    fontWeight: '700',
    color: '#1E293B',
  },
  transactionSub: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  transactionAmount: {
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
    letterSpacing: -0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  detailContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 25,
    paddingBottom: 40,
    minHeight: '45%',
  },
  detailHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  detailIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailTitle: {
    fontFamily: 'Poppins-Black',
    fontSize: 20,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  detailDivider: {
    height: 1.5,
    marginVertical: 15,
  },
  detailBody: {
    marginTop: 5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  detailLabel: {
    fontFamily: 'Poppins-Bold', 
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  noteSection: {
    marginTop: 10,
  },
  noteBox: {
    marginTop: 10,
    padding: 15,
    borderRadius: 18,
    minHeight: 80,
  },
  noteText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  closeButton: {
    marginTop: 30,
    height: 55,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontFamily: 'Poppins-Black',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1.5,
  }
});