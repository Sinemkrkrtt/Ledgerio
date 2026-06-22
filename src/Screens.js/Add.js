import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  Platform,
  useWindowDimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from './ThemeContext'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

import { auth, db } from '../../firebaseConfig';
import { collection, addDoc, doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import { API_BASE_URL } from '../config'; 

export default function Add({ navigation }) {
    const { isDarkMode, language } = useTheme();

    const { width: windowWidth } = useWindowDimensions();
    const isTablet = windowWidth >= 768;

    const [type, setType] = useState('gider');
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedCategoryName, setSelectedCategoryName] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [ocrLoading, setOcrLoading] = useState(false);

    const slideAnim = useRef(new Animated.Value(0)).current;

    const t = {
        expense: language === 'tr' ? 'Gider' : 'Expense',
        income: language === 'tr' ? 'Gelir' : 'Income',
        amount: language === 'tr' ? 'TUTAR' : 'AMOUNT',
        category: language === 'tr' ? 'KATEGORİ' : 'CATEGORY',
        date: language === 'tr' ? 'TARİH' : 'DATE',
        note: language === 'tr' ? 'NOT' : 'NOTE',
        descPlaceholder: language === 'tr' ? 'Açıklama...' : 'Description...',
        quickEntry: language === 'tr' ? 'HIZLI VERİ GİRİŞİ' : 'QUICK DATA ENTRY',
        scanBtn: language === 'tr' ? 'Fişi Tara ve Tutarı Yakala' : 'Scan Receipt & Auto-Fill',
        transDate: language === 'tr' ? 'İŞLEM TARİHİ' : 'TRANSACTION DATE',
        incomeDesc: language === 'tr' ? 'GELİR AÇIKLAMASI' : 'INCOME DESCRIPTION',
        saveBtn: language === 'tr' ? 'KAYDET' : 'SAVE',
        alertAmount: language === 'tr' ? 'Lütfen bir tutar girin.' : 'Please enter an amount.',
        alertCategory: language === 'tr' ? 'Lütfen bir kategori seçin.' : 'Please select a category.',
        alertAuth: language === 'tr' ? 'İşlem yapabilmek için lütfen hesap oluşturun veya giriş yapın.' : 'Please create an account or log in to proceed.',
        alertSuccess: language === 'tr' ? 'Başarıyla kaydedildi!' : 'Saved successfully!',
        alertError: language === 'tr' ? 'İşlem kaydedilemedi.' : 'Transaction could not be saved.',
        alertNetError: language === 'tr' ? 'Bağlantı hatası!' : 'Connection error!',
        alertOcrWarningTitle: language === 'tr' ? 'Uyarı' : 'Warning',
        alertOcrWarning: language === 'tr' ? 'Tutar okunamadı, lütfen elle girin.' : 'Amount could not be read, enter manually.',
        alertOcrSuccess: language === 'tr' ? 'Fişteki tutar otomatik dolduruldu.' : 'Amount auto-filled from receipt.',
        // Yeni uyarı metinleri
        guestTitle: language === 'tr' ? 'Hesap Gerekli' : 'Account Required',
        guestMsg: language === 'tr' ? 'Portföyünüze gelir/gider eklemek ve verilerinizi güvenle saklamak için giriş yapmalı veya hesap oluşturmalısınız.' : 'You need to log in or create an account to add transactions and safely store your data.',
        guestCancel: language === 'tr' ? 'Vazgeç' : 'Cancel',
        guestRegister: language === 'tr' ? 'Kayıt Ol' : 'Sign Up',
        guestLogin: language === 'tr' ? 'Giriş Yap' : 'Log In',
    };

    const themeGider = isDarkMode ? '#F53939' : '#DC2626';
    const themeAccent = isDarkMode ? '#09F8F0' : '#040E68'; 
    const themeBackground = isDarkMode ? '#0F172A' : '#FFFFFF';
    const themeText = isDarkMode ? '#F8FAFC' : '#1E293B';
    const themeSubText = isDarkMode ? '#94A3B8' : '#64748B';
    const themeBorder = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0';
    const themeGlass = isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(248, 250, 252, 0.8)';
    const themeGlassBorder = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

    const formatAmount = (text) => {
        const cleaned = text.replace(/\D/g, '');
        return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const handleSave = async () => {
        Keyboard.dismiss();

        // 🌟 GÜVENLİK KAPISI: MİSAFİR KONTROLÜ
        const currentUser = auth.currentUser;
        if (!currentUser) {
            Alert.alert(
                t.guestTitle,
                t.guestMsg,
                [
                    { text: t.guestCancel, style: 'cancel' },
                    { text: t.guestRegister, onPress: () => navigation.navigate('Register') },
                    { text: t.guestLogin, onPress: () => navigation.navigate('Login') }
                ],
                // iOS için uygulamanın temasına göre siyah/beyaz alert stili
                { userInterfaceStyle: isDarkMode ? 'dark' : 'light' }
            );
            return;
        }

        // 🌟 Basit alert yerine iOS Dark/Light Mode uyumlu Alert eklendi
        if (!amount || amount === '0') { 
            Alert.alert('', t.alertAmount, [{ text: 'OK' }], { userInterfaceStyle: isDarkMode ? 'dark' : 'light' }); 
            return; 
        }
        if (!selectedCategoryName) { 
            Alert.alert('', t.alertCategory, [{ text: 'OK' }], { userInterfaceStyle: isDarkMode ? 'dark' : 'light' }); 
            return; 
        }
        
        setLoading(true);
        
        try {
            const userId = currentUser.uid;

            let cleanAmount;
            if (amount.includes(',') && amount.includes('.')) {
                cleanAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
            } else if (amount.includes(',')) {
                cleanAmount = parseFloat(amount.replace(',', '.'));
            } else if (amount.includes('.')) {
                cleanAmount = parseFloat(amount.replace(/\./g, ''));
            } else {
                cleanAmount = parseFloat(amount);
            }

            await addDoc(collection(db, 'transactions'), {
                userId: userId,
                name: selectedCategoryName,
                category: selectedCategoryName,
                amount: cleanAmount, 
                type: type, 
                date: date, 
                notes: notes || '',
                createdAt: new Date() 
            });

            const balanceChange = type === 'gelir' ? cleanAmount : -cleanAmount;
            const balanceRef = doc(db, 'users', userId); 
            const balanceSnap = await getDoc(balanceRef);

            if (balanceSnap.exists()) {
                await updateDoc(balanceRef, {
                    totalBalance: increment(balanceChange)
                });
            } else {
                await setDoc(balanceRef, {
                    totalBalance: balanceChange,
                    email: currentUser.email,
                    name: currentUser.displayName
                });
            }

            // 🌟 Başarı mesajı Dark/Light Mode uyumlu yapıldı
            Alert.alert('', t.alertSuccess, [{ text: 'OK' }], { userInterfaceStyle: isDarkMode ? 'dark' : 'light' });
            setAmount(''); 
            setNotes(''); 
            setSelectedCategory(null); 
            setSelectedCategoryName('');
            
        } catch (error) { 
            console.error("Firebase Kayıt Hatası:", error); 
            // 🌟 Hata mesajı Dark/Light Mode uyumlu yapıldı
            Alert.alert(language === 'tr' ? 'Hata' : 'Error', t.alertError + " " + error.message, [{ text: 'OK' }], { userInterfaceStyle: isDarkMode ? 'dark' : 'light' });
        } finally { 
            setLoading(false); 
        }
    };

    const handleToggle = (selection) => {
        setType(selection);
        Animated.spring(slideAnim, {
            toValue: selection == 'gider' ? 0 : 1,
            useNativeDriver: false,
            friction: 7,
        }).start();
    };

    const activeSwitchWidth = isTablet ? windowWidth * 0.7 : windowWidth * 0.9;
    const translateX = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [4, activeSwitchWidth / 2 - 2],
    });

    const handleReceiptScan = async () => {
        // 🌟 GÜVENLİK KAPISI: MİSAFİR OCR KULLANAMAZ
        if (!auth.currentUser) {
            Alert.alert(
                t.guestTitle,
                t.guestMsg,
                [
                    { text: t.guestCancel, style: 'cancel' },
                    { text: t.guestRegister, onPress: () => navigation.navigate('Register') },
                    { text: t.guestLogin, onPress: () => navigation.navigate('Login') }
                ],
                { userInterfaceStyle: isDarkMode ? 'dark' : 'light' }
            );
            return;
        }

        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                language === 'tr' ? 'İzin Gerekli' : 'Permission Required',
                language === 'tr' ? 'Fişi taramak için kamera izni vermelisiniz.' : 'Camera permission is required to scan receipt.',
                [{ text: 'OK' }],
                { userInterfaceStyle: isDarkMode ? 'dark' : 'light' }
            );
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 1.0,
            base64: false,
            exif: false,
        });

        if (result.canceled) return;

        const imageUri = result.assets[0].uri;
        setOcrLoading(true);

        const formData = new FormData();
        formData.append('receipt', {
            uri: imageUri,
            name: 'receipt.jpg',
            type: 'image/jpeg',
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 40000);

        try {
            const response = await fetch(`${API_BASE_URL}/api/ocr/scan`, {
                method: 'POST',
                body: formData,
                headers: { 'Content-Type': 'multipart/form-data' },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const data = await response.json();

            if (data.amount) {
                const formattedOcrAmount = data.amount.toString().replace('.', ',');
                setAmount(formattedOcrAmount);
                const icon = data.confidence === 'high' ? '🎯'
                    : data.confidence === 'medium' ? '✓'
                    : data.confidence === 'low' ? '✓' : '⚠️';
                const formattedAmt = Number(data.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                Alert.alert(
                    `${icon} ${t.alertOcrSuccess}`,
                    `${language === 'tr' ? 'Tespit edilen tutar' : 'Detected amount'}: ₺ ${formattedAmt}`,
                    [{ text: 'OK' }],
                    { userInterfaceStyle: isDarkMode ? 'dark' : 'light' }
                );
            } else {
                Alert.alert(
                    t.alertOcrWarningTitle,
                    t.alertOcrWarning,
                    [
                        { text: language === 'tr' ? 'Tamam' : 'OK', style: 'cancel' },
                        { text: language === 'tr' ? 'Tekrar Tara' : 'Re-scan', onPress: handleReceiptScan },
                    ],
                    { userInterfaceStyle: isDarkMode ? 'dark' : 'light' }
                );
            }
        } catch (error) {
            clearTimeout(timeoutId);
            const isTimeout = error.name === 'AbortError' || /timed? *out/i.test(error.message || '');
            const isNetwork = /network|fetch|connect|reach/i.test(error.message || '');

            let title, body;
            if (isTimeout) {
                title = language === 'tr' ? 'Tarama Zaman Aşımına Uğradı' : 'Scan Timed Out';
                body = language === 'tr'
                    ? 'Fiş analizi 40 saniyeden fazla sürdü. Daha net/küçük bir fotoğraf ile tekrar dene.'
                    : 'Receipt analysis took over 40 seconds. Try again with a clearer/smaller photo.';
            } else if (isNetwork) {
                title = language === 'tr' ? 'Bağlantı Hatası' : 'Connection Error';
                body = language === 'tr'
                    ? 'OCR sunucusuna ulaşılamadı. Backend\'in çalıştığından ve aynı Wi-Fi\'de olduğundan emin ol.'
                    : 'Could not reach OCR server. Make sure the backend is running and you are on the same Wi-Fi.';
            } else {
                title = t.alertOcrWarningTitle;
                body = language === 'tr' ? 'Beklenmedik bir hata oluştu.' : 'An unexpected error occurred.';
            }

            Alert.alert(title, body, [
                { text: language === 'tr' ? 'Tamam' : 'OK', style: 'cancel' },
                { text: language === 'tr' ? 'Tekrar Tara' : 'Re-scan', onPress: handleReceiptScan },
            ], { userInterfaceStyle: isDarkMode ? 'dark' : 'light' });
        } finally {
            setOcrLoading(false);
        }
    };

    const categories = [
        { id: '1', name: 'Yemek', enName: 'Food', icon: '🍔', catType: 'gider' },
        { id: '2', name: 'Market', enName: 'Grocery', icon: '🛒', catType: 'gider' },
        { id: '3', name: 'Ulaşım', enName: 'Transport', icon: '🚗', catType: 'gider' },
        { id: '4', name: 'Eğlence', enName: 'Fun', icon: '🎮', catType: 'gider' },
        { id: '5', name: 'Sağlık', enName: 'Health', icon: '🏥', catType: 'gider' },
        { id: '7', name: 'Giyim', enName: 'Clothing', icon: '👕', catType: 'gider' },
        { id: '13', name: 'Eğitim', enName: 'Edu', icon: '📚', catType: 'gider' },
        { id: '9', name: 'Maaş', enName: 'Salary', icon: '💰', catType: 'gelir' },
        { id: '10', name: 'Burs', enName: 'Grant', icon: '🎓', catType: 'gelir' },
        { id: '11', name: 'Ek İş', enName: 'Side Gig', icon: '🚀', catType: 'gelir' },
        { id: '14', name: 'Yatırım', enName: 'Invest', icon: '📈', catType: 'gelir' },
        { id: '15', name: 'Satış', enName: 'Sale', icon: '🏷️', catType: 'gelir' },
        { id: '16', name: 'Hediye', enName: 'Gift', icon: '🎁', catType: 'gelir' },
        { id: '17', name: 'Faiz', enName: 'Interest', icon: '🏦', catType: 'gelir' },
        { id: '8', name: 'Diğer', enName: 'Other', icon: '📦', catType: 'both' },
    ];

    const displayCategories = categories.filter(cat => cat.catType === type || cat.catType === 'both');

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeBackground }]}>
            <ScrollView
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
            >
                {/* --- SEÇİCİ (Gider/Gelir) --- */}
                <View style={[styles.switch, {
                    width: isTablet ? '70%' : '90%', 
                    backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderWidth: 1,
                }]}>
                    <Animated.View style={[styles.slidingBackground, { transform: [{ translateX }], shadowColor: type === 'gider' ? themeGider : themeAccent }]}>
                        <LinearGradient
                            colors={type === 'gider'
                                ? ['#F53939', '#B91C1C']
                                : (isDarkMode ? ['#09F8F0', '#0891B2'] : ['#040E68', '#070C46'])}
                            style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        />
                    </Animated.View>
                    <TouchableOpacity style={styles.Button} onPress={() => handleToggle('gider')} activeOpacity={1}>
                        <Text style={[styles.switchText, { color: type === 'gider' ? '#FFFFFF' : themeSubText }]}>{t.expense}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.Button} onPress={() => handleToggle('gelir')} activeOpacity={1}>
                        <Text style={[styles.switchText, { color: type === 'gelir' ? '#FFFFFF' : themeSubText }]}>{t.income}</Text>
                    </TouchableOpacity>
                </View>

                {/* --- TUTAR GİRİŞİ --- */}
                <View style={styles.amountContainer}>
                    <View style={styles.amountLabelRow}>
                        <Text style={[styles.amountLabel, { color: themeSubText }]}>{t.amount}</Text>
                    </View>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={[styles.amountInput, { color: themeText }]}
                            placeholder="0.00"
                            placeholderTextColor={isDarkMode ? '#475569' : '#CBD5E1'}
                            keyboardType="number-pad"
                            value={amount}
                            onChangeText={(text) => setAmount(formatAmount(text))}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        />
                        <Text style={[styles.currencyText, { color: type === 'gider' ? '#F53939' : themeAccent }]}>₺</Text>
                    </View>
                    <View style={[styles.amountAccentLineWrap, { width: isTablet ? '40%' : '60%' }]}>
                        <LinearGradient
                            colors={type === 'gider'
                                ? ['transparent', '#F53939', 'transparent']
                                : (isDarkMode ? ['transparent', '#09F8F0', 'transparent'] : ['transparent', '#040E68', 'transparent'])}
                            style={styles.amountAccentLine}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        />
                    </View>
                </View>

               {/* --- KATEGORİLER --- */}
               <View style={styles.categoryContainer}>
                  <View style={styles.categoryTitleRow}>
                      <Text style={[styles.categoryTitle, { color: themeSubText }]}>{t.category}</Text>
                  </View>
                  <View style={[styles.grid, { 
                      paddingHorizontal: windowWidth * 0.05,
                      width: isTablet ? '85%' : '100%', 
                  }]}>
                      {displayCategories.map((item) => {
                          const isSelected = selectedCategory === item.id;
                          const activeColor = type === 'gider' ? themeGider : themeAccent;
                          return (
                              <TouchableOpacity
                                  key={item.id}
                                  style={[
                                      styles.categoryItem,
                                      { 
                                          width: isTablet ? '48%' : '23%',
                                          paddingVertical: isTablet ? 26 : 14, 
                                          marginBottom: isTablet ? 16 : 10, 
                                      },
                                      {
                                          backgroundColor: isSelected
                                              ? activeColor + (isDarkMode ? '20' : '12')
                                              : themeGlass,
                                          borderColor: isSelected ? activeColor : themeGlassBorder,
                                          borderWidth: 1.5,
                                      },
                                      isSelected && {
                                          shadowColor: activeColor,
                                          shadowOpacity: isDarkMode ? 0.45 : 0.2,
                                          shadowRadius: 14,
                                          shadowOffset: { width: 0, height: 6 },
                                          elevation: 8,
                                      }
                                  ]}
                                  onPress={() => {
                                      setSelectedCategory(item.id);
                                      setSelectedCategoryName(language === 'tr' ? item.name : item.enName);
                                  }}
                                  activeOpacity={0.85}
                              >
                                  <View style={[
                                      styles.iconCircle,
                                      {
                                          width: isTablet ? 52 : 38,
                                          height: isTablet ? 52 : 38,
                                          borderRadius: isTablet ? 18 : 14,
                                          backgroundColor: isSelected
                                              ? activeColor + '30'
                                              : (isDarkMode ? 'rgba(255,255,255,0.04)' : '#FFFFFF'),
                                          borderWidth: isSelected ? 1 : 0,
                                          borderColor: isSelected ? activeColor + '55' : 'transparent',
                                      }
                                  ]}>
                                      <Text style={[styles.categoryIcon, { fontSize: isTablet ? 26 : 20 }]}>{item.icon}</Text>
                                  </View>
                                  <Text
                                    style={[
                                        styles.categoryName, 
                                        { 
                                            color: isSelected ? activeColor : themeText,
                                            fontSize: isTablet ? 12 : 9,
                                            marginTop: isTablet ? 6 : 0 
                                        }
                                    ]}
                                    adjustsFontSizeToFit
                                    numberOfLines={1}
                                  >
                                    {language === 'tr' ? item.name : item.enName}
                                  </Text>
                              </TouchableOpacity>
                          );
                      })}
                  </View>
              </View>

                {/* --- DETAYLAR VE EKSTRALAR --- */}
                {type === 'gider' ? (
                    <>
                        <View style={[styles.detailsContainer, { width: isTablet ? '80%' : '90%', marginTop: isTablet ? 30 : 20 }]}>
                            <View style={styles.dateSection}>
                                <View style={styles.detailLabelRow}>
                                    <Text style={[styles.detailLabel, { color: themeSubText }]}>{t.date}</Text>
                                </View>
                                <TouchableOpacity 
                                    style={[styles.datePickerButton, { borderBottomColor: themeBorder }]} 
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={[styles.dateText, { color: themeText }]} adjustsFontSizeToFit numberOfLines={1}>
                                        {date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.notesSection}>
                                <View style={styles.detailLabelRow}>
                                    <Text style={[styles.detailLabel, { color: themeSubText }]}>{t.note}</Text>
                                </View>
                                <TextInput
                                    style={[styles.noteInput, { borderBottomColor: themeBorder, color: themeText }]}
                                    placeholder={t.descPlaceholder}
                                    placeholderTextColor={themeSubText}
                                    value={notes}
                                    onChangeText={setNotes}
                                />
                            </View>
                        </View>

                        <View style={[styles.ocrWrapper, { width: isTablet ? '80%' : '90%' }]}>
                            <View style={styles.categoryTitleRow}>
                                <Text style={[styles.ocrLabel, { color: themeSubText }]}>{t.quickEntry}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.ocrButton, {
                                    borderColor: isDarkMode ? 'rgba(9, 248, 240, 0.6)' : 'rgba(7, 18, 123, 0.5)',
                                    overflow: 'hidden',
                                }, ocrLoading && { opacity: 0.85 }]}
                                onPress={handleReceiptScan}
                                activeOpacity={0.85}
                                disabled={ocrLoading}
                            >
                                <LinearGradient
                                    colors={isDarkMode
                                        ? ['rgba(9, 248, 240, 0.18)', 'rgba(8, 145, 178, 0.05)']
                                        : ['rgba(4, 14, 104, 0.08)', 'rgba(7, 18, 123, 0.02)']}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                />
                                {ocrLoading ? (
                                    <>
                                        <ActivityIndicator color={themeAccent} size="small" style={{ marginRight: 10 }} />
                                        <Text style={[styles.ocrButtonText, { color: themeAccent }]} adjustsFontSizeToFit numberOfLines={1}>
                                            {language === 'tr' ? 'Fiş analiz ediliyor...' : 'Analyzing receipt...'}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons name="camera-reverse-outline" size={22} color={themeAccent} />
                                        <Text style={[styles.ocrButtonText, { color: themeAccent }]} adjustsFontSizeToFit numberOfLines={1}>{t.scanBtn}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    // --- GELİR TASARIMI ---
                    <View style={[styles.gelirContainer, { width: isTablet ? '80%' : '90%' }]}>
                        <View style={styles.fullWidthSection}>
                            <View style={styles.detailLabelRow}>
                                <Text style={[styles.detailLabel, { color: themeSubText }]}>{t.transDate}</Text>
                            </View>
                            <TouchableOpacity 
                                style={[styles.fullWidthButton, { borderBottomColor: themeBorder }]} 
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color={themeAccent} style={{marginRight: 10}} />
                                <Text style={[styles.dateText, { color: themeText }]}>
                                    {date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.fullWidthSection, { marginTop: 15 }]}>
                            <View style={styles.detailLabelRow}>
                                <Text style={[styles.detailLabel, { color: themeSubText }]}>{t.incomeDesc}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: themeBorder }}>
                                <Ionicons name="document-text-outline" size={20} color={themeAccent} style={{marginRight: 10}} />
                                <TextInput
                                    style={[styles.noteInput, { borderBottomWidth: 0, flex: 1, color: themeText }]}
                                    placeholder={t.descPlaceholder}
                                    placeholderTextColor={themeSubText}
                                    value={notes}
                                    onChangeText={setNotes}
                                />
                            </View>
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.saveButton, {
                        width: isTablet ? '80%' : '90%', 
                        backgroundColor: 'transparent',
                        shadowColor: type === 'gider' ? themeGider : themeAccent,
                        shadowOpacity: 0.45,
                        shadowRadius: 14,
                    }, loading && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={type === 'gider'
                            ? ['#F53939', '#B91C1C']
                            : (isDarkMode ? ['#09F8F0', '#0891B2'] : ['#040E68', '#070C46'])}
                        style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                    {loading ? <ActivityIndicator color="white" /> : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.saveButtonText}>{t.saveBtn}</Text>
                        </View>
                    )}
                </TouchableOpacity>

               {showDatePicker && (
                <Modal transparent={true} animationType="fade">
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
                        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={[styles.pickerContainer, { backgroundColor: isDarkMode ? '#1E293B' : 'white' }]}>
                            <View style={styles.pickerHeader}>
                                <View style={[styles.pickerTitleBadge, { backgroundColor: themeAccent + '18', borderColor: themeAccent + '40' }]}>
                                    <Ionicons name="calendar" size={13} color={themeAccent} />
                                    <Text style={[styles.pickerTitle, { color: themeAccent }]}>{t.transDate}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => { setDate(new Date()); setShowDatePicker(false); }}
                                    style={[styles.todayBtn, { backgroundColor: themeAccent }]}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.todayBtnText}>{language === 'tr' ? 'Bugün' : 'Today'}</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={date}
                                mode="date"
                                display="inline"
                                maximumDate={new Date()}
                                themeVariant={isDarkMode ? 'dark' : 'light'}
                                onChange={(event, selectedDate) => {
                                    if (selectedDate) setDate(selectedDate);
                                    if (event.type === 'set') setShowDatePicker(false);
                                }}
                            />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>
            )}
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1, 
    alignItems: 'center', 
    paddingTop: 15,
    paddingBottom: 110,
  },
  switch: {
    flexDirection: 'row',
    height: 57,
    borderRadius: 25,
    padding: 4,
    position: 'relative',
  },
  slidingBackground: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    borderRadius: 22,
    top: 4,
    elevation: 6,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  Button: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  switchText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
  },
  activeText: {
    color: '#FFFFFF',
  },

  amountContainer: {
    marginTop: 35,
    width: '100%',
    alignItems: 'center',
  },
  amountLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    width: '90%', 
  },
  amountInput: {
    fontFamily: 'Poppins-Black',
    fontSize: 48, 
    letterSpacing: -1, 
    textAlign: 'center',
    maxWidth: '85%', 
  },
  currencyText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 28,
    marginLeft: 8,
  },

  categoryContainer: {
    marginTop: 30,
    width: '100%',
    alignItems: 'center',
  },
  categoryTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 10, 
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
  },
  iconCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6, 
    backgroundColor:'transparent',
  },
  categoryName: {
    fontFamily: 'Poppins-Bold', 
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  categoryIcon: {
     backgroundColor:'transparent'
  },
 
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    alignItems: 'flex-start', 
  },
  dateSection: {
    width: '47%', 
  },
  notesSection: {
    width: '47%',
  },
  detailLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 6,
  },
  datePickerButton: {
    height: 40, 
    borderBottomWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: 2,
    paddingBottom: 5, 
  },
  noteInput: {
    fontFamily: 'Poppins-Medium',
    height: 40, 
    borderBottomWidth: 1.5,
    fontSize: 13,
    paddingHorizontal: 2,
    paddingTop: 0, 
    paddingBottom: 5,
    letterSpacing: 0.5,
  },
  dateText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13, 
  },

  ocrWrapper: {
    marginTop: 35,
    alignSelf: 'center',
  },
  ocrLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  ocrButton: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed', 
    paddingHorizontal: 10,
  },
  ocrButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    marginLeft: 10,
  },

  gelirContainer: {
    marginTop: 20,
    alignSelf: 'center',
  },
  fullWidthSection: {
    width: '100%',
  },
  fullWidthButton: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    paddingHorizontal: 5,
  },

  saveButton: {
    height: 55, 
    borderRadius: 18,
    marginTop: 35, 
    marginBottom: 10, 
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  saveButtonText: {
    fontFamily: 'Poppins-Black', 
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    width: '90%',
    maxWidth: 400, 
    padding: 20,
    borderRadius: 24,
    elevation: 10,
  },
  amountLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  amountAccentLineWrap: {
    height: 2,
    marginTop: 6,
    alignItems: 'center',
  },
  amountAccentLine: {
    width: '100%',
    height: '100%',
    borderRadius: 1,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    alignSelf: 'center',
  },
  detailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  pickerTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickerTitle: {
    fontFamily: 'Poppins-Black',
    fontSize: 10,
    letterSpacing: 1.4,
    marginLeft: 6,
  },
  todayBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  todayBtnText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});