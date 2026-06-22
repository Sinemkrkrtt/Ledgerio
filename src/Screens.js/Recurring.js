import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  Dimensions, Modal, TextInput, Animated, KeyboardAvoidingView, Platform,
  useWindowDimensions, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6, MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart } from "react-native-chart-kit";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from './ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth, db } from '../../firebaseConfig';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { processRecurringPayments } from '../utils/processRecurring';

const Recurring = () => {
   const navigation = useNavigation(); 
   const { isDarkMode, language } = useTheme();
   const { width: windowWidth } = useWindowDimensions();
   const isTablet = windowWidth >= 768;

   const themeAccent = isDarkMode ? '#09F8F0' : '#040E68'; 
   const themeBackground = isDarkMode ? '#0F172A' : '#FFFFFF';
   const themeText = isDarkMode ? '#F8FAFC' : '#1E293B';
   const themeSubText = isDarkMode ? '#94A3B8' : '#64748B';
   const themeCard = isDarkMode ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC';
   const themeBorder = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
   const themeNavy = isDarkMode ? '#09F8F0' : '#040E68';

   const [modalVisible, setModalVisible] = useState(false);
   const [name, setName] = useState('');
   const [amount, setAmount] = useState('');
   const [category, setCategory] = useState('');
   const [day, setDay] = useState('');
   const [expenses, setExpenses] = useState([]);
   const [isExpanded, setIsExpanded] = useState(false);
   const [editingId, setEditingId] = useState(null); 

   const t = {
       monthlyLoad: language === 'tr' ? 'Aylık Sabit Gider Yükü' : 'Monthly Fixed Expenses',
       seeAll: language === 'tr' ? 'Tümü' : 'See All',
       shrink: language === 'tr' ? 'Küçült' : 'Show Less',
       emptyStateTitle: language === 'tr' ? 'Henüz bir sabit gider eklenmemiş.' : 'No recurring expenses added yet.',
       emptyStateSub: language === 'tr' ? '+ Butonuna basarak hemen ekle!' : 'Tap the + button to add now!',
       daySuffix: language === 'tr' ? '. Günü' : 'th Day',
       dayWord: language === 'tr' ? 'Gün' : 'Day',
       categoryDist: language === 'tr' ? 'Kategori Dağılımı' : 'Category Distribution',
       noData: language === 'tr' ? 'Veri bulunamadı.' : 'No data found.',
       cancel: language === 'tr' ? 'Vazgeç' : 'Cancel',
       confirm: language === 'tr' ? 'Onayla' : 'Confirm',
       editExpense: language === 'tr' ? 'Gider Düzenle' : 'Edit Expense',
       newExpense: language === 'tr' ? 'Yeni Gider' : 'New Expense',
       currencyLabel: language === 'tr' ? 'TL / AY' : '₺ / MONTH',
       expenseName: language === 'tr' ? 'Gider Adı' : 'Expense Name',
       expensePlaceholder: language === 'tr' ? 'Netflix, Kira...' : 'Netflix, Rent...',
       everyMonth: language === 'tr' ? 'Her Ayın' : 'Every Month',
       selectCategory: language === 'tr' ? 'KATEGORİ SEÇİN' : 'SELECT CATEGORY',
       errFillAll: language === 'tr' ? 'Lütfen tüm alanları doldurun.' : 'Please fill all fields.',
       errConn: language === 'tr' ? 'Bağlantı hatası.' : 'Connection error.',
       error: language === 'tr' ? 'Hata' : 'Error',
       guestTitle: language === 'tr' ? 'Hesap Gerekli' : 'Account Required',
       guestMsg: language === 'tr' ? 'Sabit gider eklemek ve verilerinizi güvenle saklamak için lütfen hesap oluşturun veya giriş yapın.' : 'Please create an account or log in to add recurring expenses and safely store your data.',
       guestRegister: language === 'tr' ? 'Kayıt Ol' : 'Sign Up',
       guestLogin: language === 'tr' ? 'Giriş Yap' : 'Log In',
   };

   const CATEGORIES = [
       { name: 'Barınma', enName: 'Housing', icon: 'home-variant-outline', library: 'MCI', color: '#FF9604' },
       { name: 'Eğlence', enName: 'Fun', icon: 'controller-classic-outline', library: 'MCI', color: '#EC4899' },
       { name: 'Fatura', enName: 'Bill', icon: 'file-invoice-dollar', library: 'FA6', color:  '#0BDB2E' },
       { name: 'Abonelik', enName: 'Subscription', icon: 'subscriptions', library: 'MI', color: '#DB0B0B' },
       { name: 'Eğitim', enName: 'Edu', icon: 'school-outline', library: 'MCI', color: '#386DFF' },
       { name: 'Diğer', enName: 'Other', icon: 'dots-horizontal-circle-outline', library: 'MCI', color: '#64748B' },
   ];

   const today = new Date();
   const currentDayStr = today.getDate().toString().padStart(2, '0');
   
   const dateLocale = language === 'tr' ? 'tr-TR' : 'en-US';
   const calendarDays = Array.from({ length: 7 }).map((_, i) => {
       const date = new Date();
       date.setDate(today.getDate() + i);
       const dayNumber = date.getDate();
       return {
           month: date.toLocaleDateString(dateLocale, { month: 'short' }).replace('.', ''),
           number: dayNumber.toString().padStart(2, '0'),
           name: date.toLocaleDateString(dateLocale, { weekday: 'short' }),
           hasPayment: Array.isArray(expenses) ? expenses.some(e => Number(e.payment_day) === Number(dayNumber)) : false
       };
   });

   const totalMonthlyLoad = (Array.isArray(expenses) ? expenses : []).reduce((sum, item) => sum + parseFloat(item.amount), 0);

   const fetchRecurring = async () => {
       try {
           const currentUser = auth.currentUser;
           if (!currentUser) return; 
           const userId = currentUser.uid;

           await processRecurringPayments(userId);

           const q = query(
               collection(db, 'recurring_expenses'),
               where('userId', '==', userId)
           );

           const querySnapshot = await getDocs(q);
           const data = [];

           querySnapshot.forEach((doc) => {
               data.push({ id: doc.id, ...doc.data() });
           });

           data.sort((a, b) => a.payment_day - b.payment_day);
           setExpenses(data);
       } catch (error) {
           console.error("Firebase Çekme Hatası:", error);
           setExpenses([]);
       }
   };
   
   useFocusEffect(useCallback(() => { fetchRecurring(); }, []));

   const handleOpenModal = (item = null) => {
       if (!auth.currentUser) {
           Alert.alert(
               t.guestTitle,
               t.guestMsg,
               [
                   { text: t.cancel, style: 'cancel' },
                   { text: t.guestRegister, onPress: () => navigation.navigate('Register') },
                   { text: t.guestLogin, onPress: () => navigation.navigate('Login') }
               ],
               { userInterfaceStyle: isDarkMode ? 'dark' : 'light' }
           );
           return;
       }

       if (item) {
           setEditingId(item.id); 
           setName(item.name); 
           setAmount(item.amount.toString());
           setCategory(item.category); 
           setDay(item.payment_day.toString()); 
       } else {
           setEditingId(null);
           setName(''); setAmount(''); setCategory(''); setDay('');
       }
       setModalVisible(true);
   };

   const handleSaveExpense = async () => {
       if (!name || !amount || !day) { Alert.alert(t.error, t.errFillAll); return; }
       
       try {
           const currentUser = auth.currentUser;
           if (!currentUser) return;
           const userId = currentUser.uid;

           const cleanAmount = parseFloat(amount.toString().replace(',', '.')) || 0;
           const cleanDay = parseInt(day) || 1;

                        // O anki tarihi ve ay anahtarını oluştur
                const now = new Date();
                const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                // Seçilen gün, bugünden küçükse (yani geçmişteyse) true döner
                const isPastDay = cleanDay < now.getDate();

                const expenseData = {
                    name, 
                    amount: cleanAmount, 
                    category, 
                    payment_day: cleanDay, 
                    userId: userId,
                    // EĞER GEÇMİŞ BİR GÜNSE, BU AYI ÖDENDİ OLARAK İŞARETLE
                    last_paid_month: isPastDay ? currentMonthKey : null 
                };

           if (editingId) {
               const expenseRef = doc(db, 'recurring_expenses', editingId);
               await updateDoc(expenseRef, expenseData);
           } else {
               await addDoc(collection(db, 'recurring_expenses'), expenseData);
           }

           handleCloseModal();
           fetchRecurring(); 
           
       } catch (error) { 
           console.error("Firebase Kaydetme Hatası:", error);
           Alert.alert(t.error, t.errConn); 
       }
   };

   const handleDelete = async (id) => {
       try {
           const expenseRef = doc(db, 'recurring_expenses', id);
           await deleteDoc(expenseRef);
           fetchRecurring(); 
       } catch (error) { 
           console.error("Silme hatası:", error); 
       }
   };

   const handleCloseModal = () => {
       setName(''); setAmount(''); setCategory(''); setDay('');
       setEditingId(null); setModalVisible(false); 
   };

   const getBarColor = (val) => {
       const amt = parseFloat(val);
       if (amt < 1000) return '#22C55E';    
       if (amt < 2000) return '#F4E000';   
       if (amt < 5000) return '#F98500';   
       return '#FD0808';                     
   };

   const groupedTotals = (Array.isArray(expenses) ? expenses : []).reduce((acc, item) => {
       let catName = 'Diğer';
       for (let cat of CATEGORIES) {
           if (item.category === cat.name || item.category === cat.enName) {
               catName = language === 'tr' ? cat.name : cat.enName;
               break;
           }
       }
       if (catName === 'Diğer' && language === 'en') catName = 'Other';

       acc[catName] = (acc[catName] || 0) + parseFloat(item.amount);
       return acc;
   }, {});

   const pieData = Object.keys(groupedTotals).map((cat) => {
       const getDynamicColor = () => {
           const isHousing = cat === 'Barınma' || cat === 'Housing';
           const isFun = cat === 'Eğlence' || cat === 'Fun';
           const isBill = cat === 'Fatura' || cat === 'Bill';
           const isSub = cat === 'Abonelik' || cat === 'Subscription';
           const isEdu = cat === 'Eğitim' || cat === 'Edu';

           if (isDarkMode) {
               if (isHousing) return '#60A5FA'; 
               if (isFun) return '#FDE047';
               if (isBill) return '#4ADE80';
               if (isSub) return '#F472B6'; 
               if (isEdu) return '#FB923C';
               return '#B5B4B4'; 
           } else {
               if (isHousing) return '#2563EB'; 
               if (isFun) return '#D97706'; 
               if (isBill) return '#16A34A'; 
               if (isSub) return '#DB2777'; 
               if (isEdu) return '#EA580C'; 
               return '#64748B';
           }
       };

       return {
           name: cat,
           population: groupedTotals[cat],
           color: getDynamicColor(),
           legendFontColor: themeText,
           legendFontSize: isTablet ? 16 : 12, 
       };
   });

   return (
     <SafeAreaView style={[styles.container, { backgroundColor: themeBackground }]}>
        <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={isTablet && { paddingHorizontal: 40, paddingBottom: 50 }} 
        >
            <View style={styles.headerContainer}>
                {/* 🌟 YENİ BAĞLANTI (GÜVENLİK KAPISI) */}
                <TouchableOpacity style={[styles.addButton, {backgroundColor: 'transparent', padding: 5}]} onPress={() => handleOpenModal()}>
                   <FontAwesome6 name="add" size={isTablet ? 42 : 32} color={themeAccent} />
                </TouchableOpacity>
            </View>

           <View style={[styles.totalStats, isTablet && { marginVertical: 35 }]}>
                <Text style={styles.mainTotalContainer}>
                    <Text style={[styles.currencySymbol, { color: isDarkMode ? '#DADADA' : '#001246', fontSize: isTablet ? 50 : 35 }]}>₺ </Text>
                    <Text style={[styles.totalAmountText, { color: isDarkMode ? '#EAE8E8' : '#001246', fontSize: isTablet ? 78 : 54 }]}>
                        {totalMonthlyLoad.toLocaleString('tr-TR')}
                    </Text>
                </Text>
                <Text style={[styles.subText, { color: themeSubText, fontSize: isTablet ? 15 : 11, marginTop: isTablet ? -5 : -15 }]}>{t.monthlyLoad}</Text>
            </View>

            <View style={[styles.calendar, isTablet && { height: 130, marginTop: 25 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarContainer}>
                  {calendarDays.map((dayItem, index) => (
                    <View key={index} style={[
                        styles.dayBox, 
                        { backgroundColor: themeCard, borderColor: themeBorder, borderWidth: 1 },
                        isTablet && { width: 90, height: 110, marginRight: 20, borderRadius: 24 }, 
                        dayItem.number === currentDayStr && { borderColor: themeAccent, borderWidth: 2 }
                    ]}>
                      <Text style={[styles.monthText, { color: themeSubText }, isTablet && { fontSize: 13 }, dayItem.number === currentDayStr && { color: themeAccent }]}>{dayItem.month}</Text>
                      <Text style={[styles.dayNumber, { color: themeText }, isTablet && { fontSize: 26, marginVertical: 4 }, dayItem.number === currentDayStr && { color: themeAccent }]}>{dayItem.number}</Text>
                      <Text style={[styles.dayName, { color: themeSubText }, isTablet && { fontSize: 13 }, dayItem.number === currentDayStr && { color: themeAccent }]}>{dayItem.name}</Text>
                      {dayItem.hasPayment && <View style={[styles.paymentDot, { backgroundColor: themeAccent }, isTablet && { width: 8, height: 8, borderRadius: 4, marginTop: 8 }]} />}
                    </View>
                  ))}
                </ScrollView>
            </View>

            <View style={[styles.sectionHeader, isTablet && { marginTop: 30, marginBottom: 15 }]}>
                {expenses.length > 3 && (
                    <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.seeAllBtn}>
                        <Text style={[styles.seeAllText, { color: isDarkMode ? '#FFFFFF' : '#01114E', fontSize: isTablet ? 16 : 13 }]}>
                            {isExpanded ? t.shrink : t.seeAll}
                        </Text>
                        <Ionicons name={isExpanded ? "chevron-up" : "chevron-forward"} size={isTablet ? 18 : 14} color={themeAccent} style={{ marginLeft: 4 }}/>
                    </TouchableOpacity>
                )}
            </View>

            <View style={{ paddingHorizontal: isTablet ? 0 : 20 }}>
                <GestureHandlerRootView>
                    {expenses.length === 0 ? (
                        <View style={[styles.emptyStateWrapper, { backgroundColor: themeCard, borderColor: themeBorder }, isTablet && { padding: 60 }]}>
                            <Ionicons name="calendar-outline" size={isTablet ? 60 : 40} color={themeAccent} style={{ opacity: 0.2, marginBottom: 10 }} />
                            <Text style={[styles.emptyStateText, { color: themeSubText, fontSize: isTablet ? 18 : 14 }]}>{t.emptyStateTitle}</Text>
                            <Text style={{ color: themeAccent, fontSize: isTablet ? 15 : 12, marginTop: 5, fontWeight: '600' }}>{t.emptyStateSub}</Text>
                        </View>
                    ) : (
                        (() => {
                            const maxAmount = Math.max(...expenses.map(e => parseFloat(e.amount))) || 1;
                            const visibleExpenses = isExpanded ? expenses : expenses.slice(0, 3);
                            
                            return (
                                <View style={isExpanded ? styles.expandedList : null}>
                                    {visibleExpenses.map((item) => {
                                        const currentAmount = parseFloat(item.amount);
                                        const dynamicColor = getBarColor(currentAmount);
                                        const barWidth = (currentAmount / maxAmount) * 100;
                                        
                                        let displayCategory = item.category;
                                        if (language === 'en') {
                                            const match = CATEGORIES.find(c => c.name === item.category);
                                            if (match) displayCategory = match.enName;
                                        } else {
                                            const match = CATEGORIES.find(c => c.enName === item.category);
                                            if (match) displayCategory = match.name;
                                        }

                                        return (
                                            <Swipeable key={item.id} renderRightActions={() => (
                                                <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(item.id)}>
                                                    <Ionicons name="trash-outline" size={24} color="#FFF" />
                                                </TouchableOpacity>
                                            )}>
                                                <View style={[styles.expenseWrapper, { backgroundColor: themeCard, borderColor: themeBorder, borderWidth: 1 }, isTablet && { padding: 22, marginBottom: 20 }]}>
                                                    <View style={[styles.expenseTopRow, isTablet && { marginBottom: 14 }]}>
                                                        <View style={styles.expenseInfo}>
                                                            {/* 🌟 YENİ BAĞLANTI (GÜVENLİK KAPISI) */}
                                                            <TouchableOpacity onPress={() => handleOpenModal(item)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                <Text style={[styles.expenseName, { color: themeText, fontSize: isTablet ? 20 : 16 }]}>{item.name}</Text>
                                                                <Ionicons name="create-outline" size={isTablet ? 18 : 14} color={themeAccent} style={{ marginLeft: 8, opacity: 0.8 }} />
                                                            </TouchableOpacity>
                                                            <Text style={[styles.expenseCategory, { color: themeSubText, fontSize: isTablet ? 15 : 12, marginTop: isTablet ? 6 : 2 }]}>
                                                                {displayCategory} • {item.payment_day}{t.daySuffix}
                                                            </Text>
                                                        </View>
                                                        <Text style={[styles.expenseAmountText, { color: dynamicColor, fontSize: isTablet ? 22 : 16 }]}>
                                                            ₺ {currentAmount.toLocaleString('tr-TR')}
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.progressTrack, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#E2E8F0', height: isTablet ? 10 : 6, borderRadius: isTablet ? 5 : 3 }]}>
                                                        <View style={[styles.progressBar, { width: `${barWidth}%`, backgroundColor: dynamicColor, borderRadius: isTablet ? 5 : 3 }]} />
                                                    </View>
                                                </View>
                                            </Swipeable>
                                        );
                                    })}
                                </View>
                            );
                        })()
                    )}
                </GestureHandlerRootView>
            </View>

            <View style={[styles.chartSection, isTablet && { marginTop: 40 }]}>
                <View style={[styles.chartCard, { backgroundColor: themeCard, borderColor: themeBorder, borderWidth: 1 }, isTablet && { width: '100%', padding: 35 }]}>
                    <Text style={[styles.chartTitle, { color: themeText, fontSize: isTablet ? 18 : 13 }]}>{t.categoryDist}</Text>
                    
                    {pieData.length === 0 ? (
                        <View style={styles.emptyChartContainer}>
                            <View style={[styles.ghostChart, { borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.33)' : 'rgba(0, 0, 0, 0.62)', width: isTablet ? 120 : 90, height: isTablet ? 120 : 90, borderRadius: isTablet ? 60 : 45 }]} />
                            <View style={styles.emptyChartInfo}>
                                <Text style={[styles.emptyStateText, { color: themeSubText, textAlign: 'left', fontSize: isTablet ? 16 : 14 }]}>{t.noData}</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.chartRow}>
                            <PieChart
                                data={pieData}
                                width={isTablet ? windowWidth * 0.7 : windowWidth * 0.4}
                                height={isTablet ? 260 : 140}
                                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                                paddingLeft={isTablet ? "40" : "20"}
                                hasLegend={false}
                            />
                            <View style={[styles.minimalLegend, isTablet && { paddingLeft: 40, gap: 14 }]}>
                                {pieData.map((item, index) => (
                                    <View key={index} style={styles.legendItem}>
                                        <View style={[styles.miniDot, { backgroundColor: item.color, width: isTablet ? 12 : 8, height: isTablet ? 12 : 8, borderRadius: isTablet ? 6 : 4 }]} />
                                        <Text style={[styles.categoryLabel, { color: themeSubText, fontSize: isTablet ? 14 : 10 }]}>{item.name}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </View>

            <Modal animationType="slide" transparent={true} visible={modalVisible} statusBarTranslucent={true}>
                <View style={[styles.premiumOverlay, { justifyContent: isTablet ? 'center' : 'flex-end' }]}>
                    <TouchableOpacity style={{ flex: 1, width: '100%' }} activeOpacity={1} onPress={handleCloseModal} />
                    
                    <View style={[
                        styles.premiumContent, 
                        { backgroundColor: isDarkMode ? '#192332' : '#F8FAFC', flexShrink: 1 },
                        isTablet && { width: 500, alignSelf: 'center', borderRadius: 32, paddingBottom: 20 }
                    ]}>
                        
                        <View style={[styles.minimalHandle, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]} />

                        <View style={styles.premiumHeader}>
                            <TouchableOpacity onPress={handleCloseModal} style={styles.headerBtn}>
                                <Text style={[styles.btnText, { color: isDarkMode ? '#94A3B8' : '#8E8E93' }]}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <Text style={[styles.premiumTitle, { color: themeText }]}>
                                {editingId ? t.editExpense : t.newExpense}
                            </Text>
                            <TouchableOpacity onPress={handleSaveExpense} style={styles.headerBtn}>
                                <Text style={[styles.btnText, { color: themeNavy, fontWeight: '800' }]}>{t.confirm}</Text>
                            </TouchableOpacity>
                        </View>

                        <KeyboardAvoidingView 
                            behavior={Platform.OS === "ios" ? "padding" : undefined} 
                            style={{ flexShrink: 1 }}
                            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} 
                        >
                            <ScrollView 
                                showsVerticalScrollIndicator={false} 
                                keyboardShouldPersistTaps="handled" 
                                contentContainerStyle={{ paddingBottom: 120 }} 
                                automaticallyAdjustKeyboardInsets={true} 
                            >
                                <View style={styles.premiumHeroSection}>
                                    <TextInput 
                                        value={amount}
                                        onChangeText={setAmount}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={isDarkMode ? '#334155' : '#CBD5E1'}
                                        style={[styles.premiumHugeInput, { color: themeText }]}
                                        autoFocus={true}
                                    />
                                    <Text style={[styles.premiumHeroSubText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>{t.currencyLabel}</Text>
                                </View>
                                
                                <View style={[styles.premiumFormGroup, { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF', borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
                                    <View style={styles.formRow}>
                                        <Text style={[styles.rowLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>{t.expenseName}</Text>
                                        <TextInput 
                                            value={name}
                                            onChangeText={setName}
                                            placeholder={t.expensePlaceholder}
                                            placeholderTextColor="#8E8E93"
                                            style={[styles.rowInputText, { color: themeText }]}
                                            textAlign="right"
                                        />
                                    </View>
                                    
                                    <View style={[styles.premiumSeparator, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]} />

                                    <View style={styles.formRow}>
                                        <Text style={[styles.rowLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>{t.everyMonth}</Text>
                                        <View style={styles.valueRow}>
                                            <TextInput 
                                                value={day}
                                                onChangeText={setDay}
                                                keyboardType="number-pad"
                                                maxLength={2}
                                                placeholder="1-31"
                                                placeholderTextColor="#8E8E93"
                                                style={[styles.dayInput, { color: themeNavy }]}
                                            />
                                            <Text style={[styles.suffixText, { color: themeText }]}>{t.daySuffix}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.premiumCategorySection}>
                                    <Text style={[styles.sectionTitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>{t.selectCategory}</Text>
                                    <View style={[styles.premiumChipGrid, isTablet && { gap: 14 }]}>
                                        {CATEGORIES.map((cat) => {
                                            const catName = language === 'tr' ? cat.name : cat.enName;
                                            return (
                                            <TouchableOpacity 
                                                key={cat.name}
                                                onPress={() => setCategory(catName)}
                                                activeOpacity={0.8}
                                                style={[
                                                    styles.premiumChip, 
                                                    { 
                                                        width: isTablet ? '31%' : '48.5%',
                                                        backgroundColor: category === catName ? cat.color + '25' : (isDarkMode ? '#0F172A' : '#FFFFFF'),
                                                        borderColor: category === catName ? cat.color : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                                                    }
                                                ]}
                                            >
                                                {cat.library === 'FA6' ? (
                                                    <FontAwesome6 name={cat.icon} size={16} color={cat.color} style={{ opacity: category === catName ? 1 : 0.7 }} />
                                                ) : cat.library === 'MI' ? (
                                                    <MaterialIcons name={cat.icon} size={20} color={cat.color} style={{ opacity: category === catName ? 1 : 0.7 }} />
                                                ) : (
                                                    <MaterialCommunityIcons name={cat.icon} size={20} color={cat.color} style={{ opacity: category === catName ? 1 : 0.7 }} />
                                                )}

                                                <Text style={[styles.chipLabelText, { 
                                                    color: category === catName ? cat.color : themeText,
                                                    marginLeft: 8 
                                                }]}>
                                                    {catName}
                                                </Text>
                                            </TouchableOpacity>
                                        )})}
                                    </View>
                                </View>
                           </ScrollView>
                        </KeyboardAvoidingView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
     </SafeAreaView>
   );
};

export default Recurring;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    headerContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', paddingHorizontal: 15, paddingTop: 10 },
    addButton: { justifyContent: 'flex-end', alignItems: 'flex-end' },
    totalStats: { alignItems: 'center', marginVertical: 13 },
    mainTotalContainer: { textAlign: 'center' },
    currencySymbol: { fontFamily: 'Poppins-Light', fontSize: 35, includeFontPadding: false, textAlignVertical: 'top' },
    totalAmountText: { fontFamily: 'Poppins-Black', fontSize: 54, letterSpacing: -1.5, includeFontPadding: false },
    subText: { fontFamily: 'Poppins-Bold', fontSize: 11, marginTop: -15, letterSpacing: 2, textTransform: 'uppercase' },
    calendar: { marginTop: 10, height: 100 },
    calendarContainer: { paddingHorizontal: 15, alignItems: 'center' },
    dayBox: { width: 60, height: 80, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    monthText: { fontFamily: 'Poppins-Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    dayNumber: { fontFamily: 'Poppins-Bold', fontSize: 18, marginVertical: 2 },
    dayName: { fontFamily: 'Poppins-SemiBold', fontSize: 10 },
    paymentDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 5 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', paddingHorizontal: 25, marginTop: 5, marginBottom: 8 },
    seeAllBtn: { flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 4, paddingHorizontal: 8 },
    seeAllText: { fontFamily: 'Poppins-Bold', fontSize: 13 },
    expandedList: { paddingBottom: 10 },
    expenseWrapper: { width: '100%', marginBottom: 12, padding: 8, alignSelf: 'center', borderRadius:10 },
    expenseTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
    expenseInfo: { flex: 1 },
    expenseName: { fontFamily: 'Poppins-SemiBold', fontSize: 16 },
    expenseCategory: { fontFamily: 'Poppins-Medium', fontSize: 12, marginTop: 2, opacity: 0.8 },
    expenseAmountText: { fontFamily: 'Poppins-Bold', fontSize: 16, letterSpacing: -0.5 },
    progressTrack: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
    progressBar: { height: '100%', borderRadius: 3 },
    deleteAction: { backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 60, height: '80%', borderRadius: 16, marginLeft: 10, marginBottom: 25 },
    chartSection: { marginTop: 10, paddingHorizontal: 20, marginBottom: 40 },
    chartCard: { borderRadius: 24, padding: 15 },
    chartTitle: { fontFamily: 'Poppins-Black', fontSize: 13, marginBottom: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
    chartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    minimalLegend: { flex: 1, paddingLeft: 10, gap: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    miniDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    categoryLabel: { fontFamily: 'Poppins-Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
    emptyStateWrapper: { padding: 40, marginVertical: 20, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    emptyStateText: { fontFamily: 'Poppins-Medium', fontSize: 14, textAlign: 'center', marginTop: 10 },
    emptyChartContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 25, paddingHorizontal: 15 },
    ghostChart: { width: 90, height: 90, borderRadius: 45, borderWidth: 12, opacity: 0.08, marginRight: 25 },
    premiumOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    premiumContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%', width: '100%', paddingBottom: 0, overflow: 'hidden' },
    premiumHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 53, borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.05)' },
    premiumHugeInput: { fontFamily: 'Poppins-Black', fontSize: 54, textAlign: 'center', width: '90%', letterSpacing: -1.5 },
    minimalHandle: { width: 40, height: 5, borderRadius: 10, alignSelf: 'center', marginTop: 12 },
    premiumHeroSection: { marginTop: -10, alignItems: 'center', paddingVertical: 17 },
    premiumTitle: { fontSize: 17, fontFamily: 'Poppins-Bold' },
    btnText: { fontSize: 15, fontFamily: 'Poppins-SemiBold' },
    premiumFormGroup: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
    formRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, height: 48 },
    rowLabel: { fontSize: 14, fontFamily: 'Poppins-Medium' },
    rowInputText: { fontSize: 14, fontFamily: 'Poppins-Bold', flex: 1, marginLeft: 15 },
    premiumSeparator: { height: 1, marginLeft: 16 },
    dayInput: { fontSize: 18, fontFamily: 'Poppins-Bold', width: 40, textAlign: 'center' },
    valueText: { fontSize: 14, fontFamily: 'Poppins-Bold' },
    premiumCategorySection: { paddingHorizontal: 20, marginTop: 20 },
    sectionTitle: { fontSize: 11, fontFamily: 'Poppins-Bold', marginBottom: 12, letterSpacing: 1, marginLeft: 6 },
    premiumChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 20 },
    premiumChip: { width: '48.5%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5 },
    chipLabelText: { fontSize: 13, fontFamily: 'Poppins-SemiBold' },
    valueRow: { flexDirection: 'row', alignItems: 'center' },
    suffixText: { fontSize: 14, fontFamily: 'Poppins-Medium' },
});