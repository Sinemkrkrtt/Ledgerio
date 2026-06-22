import React, { useState, useCallback, useRef, useEffect } from 'react'; 
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, 
  Modal, TextInput, Animated, KeyboardAvoidingView, Platform, Alert,
  useWindowDimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; 
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from "react-native-chart-kit";
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from './ThemeContext'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { processRecurringPayments } from '../utils/processRecurring';

const Home = () => {
  const navigation = useNavigation();
  const { isDarkMode, language: contextLanguage } = useTheme(); 
  const [userName, setUserName] = useState('Misafir');
  const [language, setLanguage] = useState(contextLanguage || 'tr'); // contextten al
  
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isTablet = windowWidth >= 768;

  const themeNavy = isDarkMode ? '#09F8F0' : '#040E68'; 
  const themeBackground = isDarkMode ? '#0F172A' : '#FFFFFF';
  const themeText = isDarkMode ? '#F8FAFC' : '#1E293B';
  const themeSubText = isDarkMode ? '#94A3B8' : '#64748B';
  const themeAccent = isDarkMode ? '#09F8F0' : '#040E68'; 

  const cardGradient = isDarkMode ? ['#21DEEB', '#15ADB8'] : ['#030C46', '#050A8F'];
  const cardShadow = isDarkMode ? '#21DEEB' : '#1E3A8A';

  const [salaryModalVisible, setSalaryModalVisible] = useState(false);
  const [tempSalary, setTempSalary] = useState('0.00');
  const [originalBalance, setOriginalBalance] = useState('0');
  
  const tGuest = {
      title: language === 'tr' ? 'Hesap Gerekli' : 'Account Required',
      msg: language === 'tr' ? 'Bakiyenizi güncellemek ve verilerinizi güvenle saklamak için lütfen hesap oluşturun veya giriş yapın.' : 'Please create an account or log in to update your balance and safely store your data.',
      cancel: language === 'tr' ? 'Vazgeç' : 'Cancel',
      register: language === 'tr' ? 'Kayıt Ol' : 'Sign Up',
      login: language === 'tr' ? 'Giriş Yap' : 'Log In',
  };

  useEffect(() => {
    if (salaryModalVisible) {
      setOriginalBalance(tempSalary);
    }
  }, [salaryModalVisible]);

  const [balanceTrend, setBalanceTrend] = useState('0'); 
  const [spendingData, setSpendingData] = useState({
    labels: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"],
    datasets: [{ data: [0, 0, 0, 0, 0, 0] }] 
  });
  const [forecast, setForecast] = useState({
    dailyBurnRate: "0", daysToZero: 0, endOfMonthEstimate: "0", status: 'safe',
    todayRemaining: 0, dailyLimit: 0, activeDays: 0, txCount: 0
  });

  const displayName = userName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, [])
  
  const fetchBalance = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        let amount = 0;
        if (userSnap.exists() && userSnap.data().totalBalance !== undefined) {
            amount = userSnap.data().totalBalance;
        }
        setTempSalary(new Intl.NumberFormat('tr-TR').format(amount));
        return amount;
    } catch (error) { console.error("Bakiye hatası:", error); return 0; }
  };

  const handleUpdateBalance = async () => {
    // 🌟 GÜVENLİK KAPISI: MİSAFİR KONTROLÜ
    const currentUser = auth.currentUser;
    if (!currentUser) {
        setSalaryModalVisible(false); // Modalı kapat (eğer açıksa)
        Alert.alert(
            tGuest.title,
            tGuest.msg,
            [
                { text: tGuest.cancel, style: 'cancel' },
                { text: tGuest.register, onPress: () => navigation.navigate('Register') },
                { text: tGuest.login, onPress: () => navigation.navigate('Login') }
            ],
            { userInterfaceStyle: isDarkMode ? 'dark' : 'light' }
        );
        return;
    }

    try {
        const userId = currentUser.uid;

        const newBalanceStr = tempSalary.replace(/\./g, '').replace(',', '.');
        const newBalanceNum = parseFloat(newBalanceStr) || 0;

        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            await updateDoc(userRef, { totalBalance: newBalanceNum });
        } else {
            await setDoc(userRef, { totalBalance: newBalanceNum, email: currentUser.email });
        }
        
        setSalaryModalVisible(false);
        fetchBalance(userId); 
    } catch (error) {
        console.error("Bakiye güncelleme hatası:", error);
    }
  };
  const handleOpenEditBalance = () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
          Alert.alert(
              tGuest.title,
              tGuest.msg,
              [
                  { text: tGuest.cancel, style: 'cancel' },
                  { text: tGuest.register, onPress: () => navigation.navigate('Register') },
                  { text: tGuest.login, onPress: () => navigation.navigate('Login') }
              ],
              { userInterfaceStyle: isDarkMode ? 'dark' : 'light' }
          );
          return;
      }
     
      setSalaryModalVisible(true);
  };

  const fetchStatsAndForecast = async (userId, currentBalance) => {
    try {
        const savedLang = await AsyncStorage.getItem('appLanguage') || 'tr';
        
        const q = query(collection(db, 'transactions'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        const transactions = [];
        
        querySnapshot.forEach((doc) => {
             const data = doc.data();
             transactions.push({
                 ...data,
                 date: data.date?.toDate ? data.date.toDate() : new Date(data.date)
             });
        });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)); 
        startOfWeek.setHours(0,0,0,0);
        
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);

        let monthIncome = 0;
        let monthExpense = 0;
        
        let thirtyDaysExpense = 0;
        let thirtyDaysTxCount = 0;
        const activeDaysSet = new Set();
        
        let todayExpense = 0;
        
        const weekData = [0, 0, 0, 0, 0, 0, 0];

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            const amt = parseFloat(t.amount) || 0;

            if (tDate >= startOfMonth) {
                if (t.type === 'gelir') monthIncome += amt;
                else if (t.type === 'gider') monthExpense += amt;
            }

            if (tDate >= thirtyDaysAgo && t.type === 'gider') {
                thirtyDaysExpense += amt;
                thirtyDaysTxCount++;
                activeDaysSet.add(tDate.toDateString());
            }

            if (tDate.toDateString() === now.toDateString() && t.type === 'gider') {
                todayExpense += amt;
            }

            if (tDate >= startOfWeek && t.type === 'gider') {
                let dayIndex = tDate.getDay() - 1; 
                if (dayIndex === -1) dayIndex = 6; 
                weekData[dayIndex] += amt;
            }
        });

        const netChange = monthIncome - monthExpense;
        const trendValue = currentBalance > 0 ? ((netChange / currentBalance) * 100).toFixed(1) : 0;
        setBalanceTrend(trendValue);

        const allLabels = savedLang === 'tr' 
            ? ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] 
            : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            
        let todayIndex = now.getDay();
        if (todayIndex === 0) todayIndex = 7;

        setSpendingData({
          labels: allLabels.slice(0, todayIndex),
          datasets: [{ data: weekData.slice(0, todayIndex) }]
        });

        const activeDaysCount = activeDaysSet.size;
        const dailyBurnRate = thirtyDaysExpense / 30;
        const daysToZero = dailyBurnRate > 0 ? (currentBalance / dailyBurnRate) : 999;
        
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const remainingDays = lastDayOfMonth - now.getDate();
        const endOfMonthEstimate = currentBalance - (dailyBurnRate * remainingDays);

        setForecast({
            dailyLimit: Math.max(0, dailyBurnRate),
            todayRemaining: Math.max(0, dailyBurnRate - todayExpense).toFixed(2),
            dailyBurnRate: dailyBurnRate.toFixed(2),
            daysToZero: isFinite(daysToZero) ? Math.floor(daysToZero) : 999,
            endOfMonthEstimate: endOfMonthEstimate.toFixed(2),
            status: endOfMonthEstimate < 0 ? 'warning' : 'safe',
            txCount: thirtyDaysTxCount,
            activeDays: activeDaysCount
        });

    } catch (error) { console.error("İstatistik hatası:", error); }
  };

  useFocusEffect(
    useCallback(() => {
      const loadAllData = async () => {
          const savedLang = await AsyncStorage.getItem('appLanguage');
          if (savedLang) setLanguage(savedLang);
          
          const currentUser = auth.currentUser;
          if (currentUser) {
              setUserName(currentUser.displayName || currentUser.email.split('@')[0]);
              await processRecurringPayments(currentUser.uid);
              const curBal = await fetchBalance(currentUser.uid);
              fetchStatsAndForecast(currentUser.uid, curBal);
          } else {
              setUserName('Misafir');
              setTempSalary('0.00'); // Misafir için bakiye sıfır
          }
      };
      
      loadAllData();
    }, [])
  );

  const formatCurrency = (value) => {
    const cleanValue = value.replace(/\D/g, "");
    return new Intl.NumberFormat('tr-TR').format(cleanValue);
  };

  const isChartEmpty = spendingData.datasets[0].data.every(val => val === 0);

  const dynamicChartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: themeBackground,
    backgroundGradientTo: themeBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => isDarkMode ? `rgba(9, 248, 240, ${opacity})` : `rgba(15, 5, 108, ${opacity})`,
    labelColor: (opacity = 1) => isDarkMode ? `rgba(248, 250, 252, ${opacity})` : `rgba(100, 116, 139, ${opacity})`,
    propsForDots: { r: "3", strokeWidth: "2", stroke: themeNavy, fill: themeNavy },
    propsForBackgroundLines: { strokeDasharray: "5", strokeWidth: 0.5, stroke: isDarkMode ? "#334155" : "#E2E8F0" }
  };

  const getFinancialHealth = () => {
    const remainingToday = Number(forecast?.todayRemaining) || 0;
    const dailyBurnRate = parseFloat(forecast?.dailyBurnRate) || 0;
    const trendValue = parseFloat(balanceTrend) || 0;
    const activeDays = Number(forecast?.activeDays) || 0;
    const txCount = Number(forecast?.txCount) || 0;
    const endOfMonth = Number(forecast?.endOfMonthEstimate) || 0;
    const currentBalance = parseFloat((tempSalary || '0').toString().replace(/\./g, '').replace(',', '.')) || 0;

    const thirtyDaysExpense = dailyBurnRate * 30;
    const effectiveDaily = activeDays > 0 ? thirtyDaysExpense / activeDays : 0;
    const todaySpent = Math.max(0, dailyBurnRate - remainingToday);
    const dailyCapacity = Math.max(0, effectiveDaily - todaySpent);
    const usagePercent = effectiveDaily > 0 ? Math.min(100, (todaySpent / effectiveDaily) * 100) : 0;

    const fmt = (n) => `₺${Math.round(Math.max(0, n)).toLocaleString('tr-TR')}`;

    let title, subtitle, statusColor, advice;

    if (txCount === 0 && currentBalance === 0) {
        title = language === 'tr' ? 'Başlangıç' : 'Getting Started';
        subtitle = language === 'tr' ? 'Bakiyeni ekleyerek başla' : 'Add your balance to begin';
        statusColor = themeNavy;
        advice = language === 'tr' ? 'Bakiyeni belirle ve ilk işlemini ekle. Günlük kapasite, ay sonu projeksiyonu ve trend analizi harcamalarınla birlikte gerçek zamanlı şekilde devreye girecek.' : 'Set your balance and add your first transaction...';
    } else if (txCount === 0) {
        title = fmt(currentBalance);
        subtitle = language === 'tr' ? 'Kullanılabilir bakiye' : 'Available balance';
        statusColor = '#22C55E';
        advice = language === 'tr' ? 'Bakiyen hazır. İlk harcamandan itibaren günlük kapasite ve harcama tempon burada anlık olarak analiz edilecek.' : 'Your balance is ready...';
    } else if (usagePercent >= 100 && effectiveDaily > 0) {
        const overAmount = Math.max(0, todaySpent - effectiveDaily);
        title = `+${fmt(overAmount)}`;
        subtitle = language === 'tr' ? `Ortalama üstü · Ort. ${fmt(effectiveDaily)}` : `Above average · Avg ${fmt(effectiveDaily)}`;
        statusColor = '#EF4444';
        advice = language === 'tr' ? `Bugün günlük ortalamandan ${fmt(overAmount)} fazla harcadın. Yarın için daha sıkı bir bütçe planı, ay sonu projeksiyonunu dengede tutar.` : `You spent ${fmt(overAmount)} above...`;
    } else if (usagePercent >= 75 && effectiveDaily > 0) {
        title = fmt(dailyCapacity);
        subtitle = language === 'tr' ? `Kapasite · %${Math.round(usagePercent)} kullanıldı` : `Capacity · ${Math.round(usagePercent)}% used`;
        statusColor = '#F59E0B';
        advice = language === 'tr' ? `Günlük kapasitenin %${Math.round(usagePercent)}'ine ulaştın. Geri kalan ${fmt(dailyCapacity)} için akşam harcamalarını gözden geçirmen önerilir.` : `You've reached...`;
    } else if (effectiveDaily > 0) {
        title = fmt(dailyCapacity);
        subtitle = language === 'tr' ? `Ort. ${fmt(effectiveDaily)} · ${activeDays} aktif gün` : `Avg ${fmt(effectiveDaily)} · ${activeDays} active days`;
        statusColor = '#22C55E';
        if (trendValue > 5) {
            advice = language === 'tr' ? `Net bakiye ivmen pozitif (%${Math.abs(trendValue)}). Bu artıyı yatırım veya birikim hedefine yönlendirerek finansal momentum kazanabilirsin.` : `Net balance momentum...`;
        } else if (trendValue < -5) {
            advice = language === 'tr' ? `Bakiye trendi %${Math.abs(trendValue)} negatif. Gelir-gider dengeni gözden geçir; sabit giderlerini optimize etmek hızlı kazanım sağlar.` : `Balance trend...`;
        } else {
            advice = language === 'tr' ? `Harcama tempon dengeli. Mevcut hızda ay sonu projeksiyonun ${fmt(endOfMonth)} seviyesinde kalıyor.` : `Spending pace is balanced...`;
        }
    } else {
        title = fmt(currentBalance);
        subtitle = language === 'tr' ? 'Bakiye · Veriler işleniyor' : 'Balance · Processing';
        statusColor = themeNavy;
        advice = language === 'tr' ? 'Harcama verilerin işleniyor. Birkaç işlem sonrası akıllı bütçe analizi tam kapasiteyle devreye girecek.' : 'Your spending data is processing...';
    }

    return {
        usagePercent: Math.max(0, Math.min(usagePercent, 100)),
        statusColor,
        advice,
        title,
        subtitle
    };
  };

  const health = getFinancialHealth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeBackground }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ 
            alignItems: 'center', 
            paddingBottom: isTablet ? 80 : 30, 
            flexGrow: 1 
        }}
      >
        
        <View style={[
            styles.topBar, 
            isTablet && { paddingHorizontal: 40, paddingVertical: 25 }
        ]}>
          <View>
            <Text style={[styles.hello, { color: themeText, fontSize: isTablet ? 28 : 20 }]}>{language === 'tr' ? 'Merhaba' : 'Hello'}, {displayName}!</Text>
            <Text style={[styles.welcome, { color: themeSubText, fontSize: isTablet ? 16 : 13 }]}>{language === 'tr' ? 'Hoş geldin.' : 'Welcome.'}</Text>
          </View>
          <View style={styles.rightActions}>
            <TouchableOpacity
              style={[styles.settingsCircle, { backgroundColor: themeNavy + '12', borderColor: themeNavy + '30', width: isTablet ? 54 : 42, height: isTablet ? 54 : 42 }]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={isTablet ? 28 : 22} color={themeNavy} />
            </TouchableOpacity>
          </View>
        </View>

        <LinearGradient 
            colors={cardGradient} 
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} 
            style={[
                styles.salaryBox, 
                { shadowColor: cardShadow },
                isTablet && { width: '90%', height: 230, padding: 35, marginTop: 10 }
            ]}
        >
          <View style={[styles.balanceGlowTop, { backgroundColor: isDarkMode ? '#030C46' : '#09F8F0', opacity: isDarkMode ? 0.18 : 0.25 }]} />
          <View style={[styles.balanceGlowBottom, { backgroundColor: isDarkMode ? '#030C46' : '#09F8F0', opacity: isDarkMode ? 0.12 : 0.18 }]} />
          <View style={styles.balanceShine} />

          <View style={styles.cardHeader}>
            <View style={styles.bakiyeLabelRow}>
              <Text style={[styles.bakiyeLabel, isTablet && { fontSize: 16 }]}>{language === 'tr' ? 'Mevcut Bakiye' : 'Current Balance'}</Text>
            </View>
            {/* 🌟 BURAYA handleOpenEditBalance EKLENDİ */}
            <TouchableOpacity onPress={handleOpenEditBalance} style={[styles.editBalanceBtn, isTablet && { width: 44, height: 44, borderRadius: 14 }]}>
              <Ionicons name="create-outline" size={isTablet ? 24 : 18} color="rgba(255, 255, 255, 0.95)" />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.salaryText, isTablet && { fontSize: 64 }]}>{tempSalary} <Text style={[styles.currencySymbol, isTablet && { fontSize: 46 }]}>₺</Text></Text>
          
          <View style={styles.cardFooter}>
            <View style={[styles.trendBox, { 
                backgroundColor: parseFloat(balanceTrend) >= 0 ? (isDarkMode ? 'rgba(11, 2, 73, 0.3)' : 'rgba(13, 253, 253, 0.27)') : (isDarkMode ? 'rgba(245, 57, 57, 0.15)' : 'rgba(225, 29, 72, 0.1)'), 
                borderWidth: 1, borderColor: parseFloat(balanceTrend) >= 0 ? 'rgba(52, 211, 187, 0.66)' : 'rgba(251, 113, 133, 0.3)',
                paddingHorizontal: isTablet ? 16 : 10, paddingVertical: isTablet ? 8 : 4, borderRadius: isTablet ? 16 : 12
            }]}>
              <Ionicons name={parseFloat(balanceTrend) >= 0 ? "trending-up" : "trending-down"} size={isTablet ? 16 : 10} color={parseFloat(balanceTrend) >= 0 ? "#D1FAE5" : "#FFE4E6"} />
              <Text style={[styles.trendText, { color: parseFloat(balanceTrend) >= 0 ? "#D1FAE5" : "#FFE4E6", fontSize: isTablet ? 15 : 11 }]}>{Math.abs(parseFloat(balanceTrend))}%</Text>
            </View>
          </View>
        </LinearGradient>
        
        <View style={[
            styles.smartPanelModern, 
            { backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : '#EEEEF3' },
            isTablet && { width: '90%', padding: 40, marginTop: 30 }
        ]}>
            <View style={styles.smartHeader}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                    <View style={[styles.smartLabelChip, { backgroundColor: health.statusColor + '15', borderColor: health.statusColor + '40' }]}>
                        <Ionicons name="sparkles" size={isTablet ? 16 : 11} color={health.statusColor} style={{marginRight: 5}} />
                        <Text style={[styles.smartLabelText, { color: health.statusColor, fontSize: isTablet ? 13 : 10 }]}>{language === 'tr' ? 'AI GÜNLÜK ANALİZ' : 'AI DAILY ANALYSIS'}</Text>
                    </View>
                    <Text style={[styles.smartValue, { color: health.statusColor, marginTop: 10, fontSize: isTablet ? 36 : 22 }]} numberOfLines={1} adjustsFontSizeToFit>{health.title}</Text>
                    <Text style={[styles.smartSubtext, { color: themeSubText, fontSize: isTablet ? 15 : 11, marginTop: 4 }]} numberOfLines={1}>{health.subtitle}</Text>
                </View>
                
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <TouchableOpacity 
                      style={[
                          styles.aiButtonWrapper, 
                          { backgroundColor: health.statusColor + '15', borderColor: health.statusColor + '40' },
                          isTablet && { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 40 }
                      ]}
                      onPress={() => navigation.navigate('AIChat')} 
                      activeOpacity={0.8}
                  >
                      <MaterialCommunityIcons name="brain" size={isTablet ? 28 : 20} color={health.statusColor} />
                      <Text style={[styles.aiButtonText, { color: health.statusColor, fontSize: isTablet ? 17 : 13 }]}>{language === 'tr' ? 'Bana Sor' : 'Ask Me'}</Text>
                      <View style={[styles.chatNotificationDot, { borderColor: isDarkMode ? '#1E293B' : '#F1F5F9', width: isTablet ? 18 : 14, height: isTablet ? 18 : 14, borderRadius: isTablet ? 9 : 7, right: -6, top: -6 }]} />
                  </TouchableOpacity>
              </Animated.View>

            </View>

            <View style={[styles.gaugeContainerPro, isTablet && { marginTop: 30 }]}>
                <View style={[styles.gaugeBgPro, { backgroundColor: isDarkMode ? 'rgba(148, 163, 184, 0.08)' : 'rgba(148, 163, 184, 0.15)', height: isTablet ? 18 : 10 }]}>
                    <LinearGradient
                        colors={[health.statusColor, health.statusColor + 'CC']}
                        style={[styles.gaugeFillPro, { width: `${health.usagePercent}%` }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    />
                </View>
            </View>
            <View style={[styles.proDividerWrap, isTablet && { marginVertical: 25 }]}>
                <LinearGradient
                    colors={['transparent', isDarkMode ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.4)', 'transparent']}
                    style={styles.proDividerLine}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
            </View>
            <View style={styles.futureRowPro}>
                <View style={styles.futureStatPro}>
                    <Text style={[styles.futureLabelPro, isTablet && { fontSize: 13, marginBottom: 8 }]}>{language === 'tr' ? 'PROJEKSİYON' : 'PROJECTION'}</Text>
                    <Text style={[styles.futureValuePro, { color: themeText, fontSize: isTablet ? 26 : 17 }]}>₺{(Number(forecast.endOfMonthEstimate) || 0).toLocaleString('tr-TR')}</Text>
                </View>
                <View style={[styles.verticalDividerPro, isTablet && { height: 60 }]} />
                <View style={styles.futureStatPro}>
                    <Text style={[styles.futureLabelPro, isTablet && { fontSize: 13, marginBottom: 8 }]}>{language === 'tr' ? 'LİKİDİTE ÖMRÜ' : 'LIQUIDITY LIFE'}</Text>
                    <Text style={[styles.futureValuePro, { color: themeNavy, fontSize: isTablet ? 26 : 17 }]}>{forecast.daysToZero || 0} {language === 'tr' ? 'GÜN' : 'DAYS'}</Text>
                </View>
            </View>

           <View style={[styles.asistanBoxPro, { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF', borderWidth: 1, borderColor: health.statusColor + '40', overflow: 'hidden' }, isTablet && { paddingVertical: 25, marginTop: 35, paddingLeft: 30, borderRadius: 20 }]}>
                <LinearGradient colors={[health.statusColor, health.statusColor + '80']} style={styles.asistanAccentBar} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
                <View style={[styles.asistanIconBubble, { backgroundColor: health.statusColor + '20', borderColor: health.statusColor + '50' }, isTablet && { width: 44, height: 44, borderRadius: 16, marginRight: 18 }]}>
                    <MaterialCommunityIcons name="lightbulb-on-outline" size={isTablet ? 24 : 14} color={health.statusColor} />
                </View>
                <Text style={[styles.asistanTextPro, { color: themeText, flex: 1 }, isTablet && { fontSize: 16, lineHeight: 26 }]}>{health.advice}</Text>
           </View>
        </View>

        <View style={[styles.chartSection, isTablet && { marginTop: 35 }]}>
            <View style={[styles.chartHeaderRow, isTablet && { width: '90%', marginBottom: 15 }]}>
                <View style={styles.sectionTitleRow}>
                    <Text style={[styles.sectionTitle, { color: themeText }, isTablet && { fontSize: 22 }]}>{language === 'tr' ? 'Harcama Analizi' : 'Spending Analysis'}</Text>
                </View>
                <View style={[styles.proBadge, { backgroundColor: themeNavy + '15', borderColor: themeNavy + '35' }, isTablet && { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }]}>
                    <Ionicons name="calendar-outline" size={isTablet ? 16 : 10} color={themeNavy} style={{ marginRight: 6 }} />
                    <Text style={[styles.proBadgeText, { color: themeNavy }, isTablet && { fontSize: 14 }]}>{language === 'tr' ? 'Haftalık' : 'Weekly'}</Text>
                </View>
            </View>

            <View style={[styles.modernCard, { backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.4)' : '#F2F2F6' }, isTablet && { width: '90%', paddingVertical: 35 }]}>
                <LinearGradient
                    colors={[themeNavy + '00', themeNavy + (isDarkMode ? '14' : '0A'), themeNavy + '00']}
                    style={styles.chartTopAccent}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <LineChart 
                    data={spendingData} 
                    width={windowWidth * (isTablet ? 0.85 : 0.8)} 
                    height={isTablet ? 360 : 170} 
                    chartConfig={{...dynamicChartConfig, backgroundGradientFromOpacity: 0, backgroundGradientToOpacity: 0, fillShadowGradientFrom: themeNavy, fillShadowGradientTo: themeBackground, fillShadowGradientFromOpacity: 0.1, fillShadowGradientToOpacity: 0, propsForBackgroundLines: { strokeWidth: 0.5, stroke: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }}} 
                    bezier 
                    withDots={!isChartEmpty} 
                    withInnerLines={true} 
                    withOuterLines={false} 
                    segments={isTablet ? 5 : 3} 
                    style={styles.chartAdjustment} 
                />
                {isChartEmpty && <View style={styles.absoluteOverlay}><Text style={[styles.emptyChartText, { color: themeSubText, fontSize: isTablet ? 18 : 13 }]}>{language === 'tr' ? 'Henüz veri eklenmedi' : 'No data added yet'}</Text></View>}
            </View>
        </View>

<Modal visible={salaryModalVisible} transparent animationType="slide">
    <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.modalOverlay, { justifyContent: isTablet ? 'center' : 'flex-end' }]}
    >
        <TouchableOpacity style={{ flex: 1, width: '100%' }} activeOpacity={1} onPress={() => setSalaryModalVisible(false)} />

        {(() => {
            const parseAmt = (str) => parseFloat((str || '0').toString().replace(/\./g, '').replace(',', '.')) || 0;
            const oldVal = parseAmt(originalBalance);
            const newVal = parseAmt(tempSalary);
            const diff = newVal - oldVal;
            const diffColor = diff > 0 ? '#22C55E' : diff < 0 ? '#EF4444' : themeSubText;
            const isEmpty = !tempSalary || tempSalary === '0';

            return (
                <View style={[
                    styles.salarySheet, 
                    { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF', borderColor: themeAccent + '20', borderWidth: 1 },
                    isTablet && { width: 500, alignSelf: 'center', borderRadius: 32 }
                ]}>
                    <View style={[styles.salaryGlowTop, { backgroundColor: themeAccent, opacity: isDarkMode ? 0.12 : 0.08 }]} />
                    <View style={[styles.salaryGlowBottom, { backgroundColor: themeAccent, opacity: isDarkMode ? 0.08 : 0.06 }]} />

                    {!isTablet && <View style={[styles.sheetHandle, { backgroundColor: themeSubText + '40' }]} />}

                    <View style={styles.modalHeaderRow}>
                        <View style={styles.modalHeaderLeft}>
                            <View style={[styles.modalIconBadgePremium, { borderColor: themeAccent + '50' }]}>
                                <LinearGradient
                                    colors={isDarkMode ? ['#09F8F0', '#0891B2'] : ['#040E68', '#070C46']}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                />
                                <Ionicons name="wallet" size={20} color="#FFFFFF" />
                            </View>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={[styles.modalTitlePremium, { color: themeText }]}>{language === 'tr' ? 'Bakiyeyi Düzenle' : 'Edit Balance'}</Text>
                                <View style={styles.modalSubtitleRow}>
                                    <View style={[styles.statusPulseDot, { backgroundColor: '#10B981' }]} />
                                    <Text style={[styles.modalSubtitlePremium, { color: themeSubText }]}>
                                        {language === 'tr' ? 'Anlık güncelleme aktif' : 'Live update enabled'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => setSalaryModalVisible(false)} style={[styles.modalCloseBtnPremium, { backgroundColor: themeSubText + '12' }]}>
                            <Ionicons name="close" size={18} color={themeSubText} />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.balanceHeroCard, { borderColor: themeAccent + '30', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#FAFBFC' }]}>
                        <LinearGradient
                            colors={[themeAccent + (isDarkMode ? '1A' : '10'), themeAccent + '03', 'transparent']}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        />

                        <View style={styles.previousBalanceRow}>
                            <Text style={[styles.heroLabelMini, { color: themeSubText }]}>{language === 'tr' ? 'ÖNCEKİ BAKİYE' : 'PREVIOUS'}</Text>
                            <Text style={[styles.previousBalanceValue, { color: themeSubText }]}>₺ {originalBalance}</Text>
                        </View>

                        <View style={[styles.heroDivider, { backgroundColor: themeAccent + '20' }]} />

                        <Text style={[styles.heroLabelMini, { color: themeAccent, marginTop: 6 }]}>{language === 'tr' ? 'YENİ BAKİYE' : 'NEW BALANCE'}</Text>
                        <View style={styles.giantInputRow}>
                            <Text style={[styles.currencyPrefixPremium, { color: themeAccent }]}>₺</Text>
                            <TextInput
                                style={[styles.giantInputPremium, { color: themeText }]}
                                value={tempSalary}
                                onChangeText={(text) => setTempSalary(formatCurrency(text))}
                                keyboardType="number-pad"
                                autoFocus
                                placeholder="0"
                                placeholderTextColor={themeSubText + '40'}
                            />
                        </View>

                        {diff !== 0 && (
                            <View style={[styles.diffBadge, { backgroundColor: diffColor + '15', borderColor: diffColor + '45' }]}>
                                <Ionicons name={diff > 0 ? 'trending-up' : 'trending-down'} size={13} color={diffColor} />
                                <Text style={[styles.diffText, { color: diffColor }]}>
                                    {diff > 0 ? '+' : '−'}₺ {Math.abs(diff).toLocaleString('tr-TR')}
                                </Text>
                                <Text style={[styles.diffSubText, { color: diffColor + 'AA' }]}>
                                    {diff > 0 ? (language === 'tr' ? 'artış' : 'increase') : (language === 'tr' ? 'azalış' : 'decrease')}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.quickAdjustLabelRow}>
                        <View style={[styles.sectionDot, { backgroundColor: themeAccent }]} />
                        <Text style={[styles.quickAdjustLabel, { color: themeSubText }]}>{language === 'tr' ? 'HIZLI AYAR' : 'QUICK ADJUST'}</Text>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.quickAdjustRow}
                        contentContainerStyle={{ paddingRight: 25, paddingLeft: 4 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {[
                            { label: '−1K', val: -1000, neg: true },
                            { label: '−500', val: -500, neg: true },
                            { label: '−100', val: -100, neg: true },
                            { label: '+100', val: 100, neg: false },
                            { label: '+500', val: 500, neg: false },
                            { label: '+1K', val: 1000, neg: false },
                            { label: '+5K', val: 5000, neg: false },
                        ].map(q => (
                            <TouchableOpacity
                                key={q.label}
                                onPress={() => {
                                    const cur = parseAmt(tempSalary);
                                    const next = Math.max(0, cur + q.val);
                                    setTempSalary(new Intl.NumberFormat('tr-TR').format(next));
                                }}
                                activeOpacity={0.7}
                                style={[styles.quickAdjustChip, {
                                    backgroundColor: q.neg
                                        ? (isDarkMode ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.06)')
                                        : (isDarkMode ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)'),
                                    borderColor: q.neg ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.40)',
                                }]}
                            >
                                <Text style={[styles.quickAdjustChipText, { color: q.neg ? '#EF4444' : '#16A34A' }]}>{q.label}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            onPress={() => setTempSalary(originalBalance)}
                            activeOpacity={0.7}
                            style={[styles.quickAdjustChip, { backgroundColor: themeSubText + '12', borderColor: themeSubText + '35' }]}
                        >
                            <Ionicons name="refresh-outline" size={12} color={themeSubText} style={{ marginRight: 4 }} />
                            <Text style={[styles.quickAdjustChipText, { color: themeSubText }]}>{language === 'tr' ? 'Sıfırla' : 'Reset'}</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <TouchableOpacity
                        style={[
                            styles.actionBtn,
                            { shadowColor: themeAccent, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
                            isEmpty && { opacity: 0.5 }
                        ]}
                        onPress={handleUpdateBalance} 
                        activeOpacity={0.85}
                        disabled={isEmpty}
                    >
                        <LinearGradient
                            colors={isDarkMode ? ['#09F8F0', '#0891B2'] : ['#030C46', '#050B3B']}
                            style={[styles.btnGradient, { flexDirection: 'row' }]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.btnText}>{language === 'tr' ? 'GÜNCELLE' : 'UPDATE'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            );
        })()}
    </KeyboardAvoidingView>
</Modal>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  hello: { fontFamily: 'Poppins-Bold', fontSize: 20, letterSpacing: -0.5 },
  welcome: { fontFamily: 'Poppins-Medium', fontSize: 13, opacity: 0.7 },
  rightActions: { flexDirection: 'row', alignItems: 'center' ,marginTop:-20,},
  actionBtn: { padding: 5, marginLeft: 10,  },
  salaryBox: { marginTop: 5, width: '92%', height: 140, borderRadius: 28, padding: 22, justifyContent: 'space-between', elevation: 12, overflow: 'hidden', paddingVertical:10,shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 18 },
  bakiyeLabel: { fontFamily: 'Poppins-SemiBold', color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  salaryText: { fontFamily: 'Poppins-Bold', color: '#FFFFFF', fontSize: 38, letterSpacing: -1 },
  currencySymbol: { fontFamily: 'Poppins-Light', fontSize: 28, opacity: 0.9 },
  trendBox: { flexDirection: 'row', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  trendText: { fontFamily: 'Poppins-Bold', fontSize: 11, marginLeft: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartSection: { width: '100%', marginTop: 15, alignItems: 'center' },
  chartHeaderRow: { width: '90%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontFamily: 'Poppins-Bold', fontSize: 16, letterSpacing: -0.4 },
  proBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  proBadgeText: { fontFamily: 'Poppins-Bold', fontSize: 11, textTransform: 'uppercase' },
  modernCard: { width: '92%', borderRadius: 24, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)', overflow: 'hidden', position: 'relative' },
  chartAdjustment: { paddingRight: 60, marginTop: 5, borderRadius: 20 },
  smartPanelModern: { width: '92%', marginTop: 18, padding: 20, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)', elevation: 8 },
  smartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  smartLabelText: { fontFamily: 'Poppins-Bold', fontSize: 10, color: '#94A3B8', letterSpacing: 1.5 },
  smartValue: { fontFamily: 'Poppins-Black', fontSize: 22, letterSpacing: -0.8 },
  smartSubtext: { fontFamily: 'Poppins-Medium', fontSize: 11, letterSpacing: 0.2, marginTop: 2, opacity: 0.85 },
  gaugeContainerPro: { marginBottom: 5, marginTop: 10 },
  gaugeBgPro: { height: 10, backgroundColor: 'rgba(148, 163, 184, 0.1)', borderRadius: 20, overflow: 'hidden' },
  gaugeFillPro: { height: '100%', borderRadius: 20 },
  proDivider: { height: 1, backgroundColor: 'rgba(148, 163, 184, 0.08)', marginVertical: 10 },
  futureRowPro: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  futureStatPro: { flex: 1, alignItems: 'center' },
  futureLabelPro: { fontFamily: 'Poppins-Bold', fontSize: 9, color: '#94A3B8', letterSpacing: 0.5, marginBottom: 4 },
  futureValuePro: { fontFamily: 'Poppins-Black', fontSize: 17 },
  verticalDividerPro: { width: 1, height: 35, backgroundColor: 'rgba(148, 163, 184, 0.1)' },
  asistanBoxPro: { marginTop: 15, paddingVertical: 14, paddingLeft: 22, paddingRight: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  asistanTextPro: { fontFamily: 'Poppins-Medium', fontSize: 12, lineHeight: 18, opacity: 0.9 },
  modalOverlay: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  salaryEditCard: { width: '85%', padding: 30, borderRadius: 32, alignItems: 'center', elevation: 20 },
  editInputWrapper: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'rgba(148, 163, 184, 0.2)', marginBottom: 30 },
  editInput: { fontFamily: 'Poppins-Black', fontSize: 36, textAlign: 'center', minWidth: 150 },
  editCurrency: { fontFamily: 'Poppins-Bold', fontSize: 24, marginLeft: 10 },
  saveBtn: { width: '100%', height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontFamily: 'Poppins-Bold', color: '#FFFFFF', fontSize: 17, letterSpacing: 1 },
  absoluteOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  emptyChartText: { fontFamily: 'Poppins-SemiBold', fontSize: 13, letterSpacing: 0.2 },
  
  aiButtonWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 30,
    borderWidth: 1.5,
  },
  aiButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    marginLeft: 6,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  chatNotificationDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF2727',
    borderWidth: 2.5,
  },
  settingsCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    padding: 0,
    marginLeft: 0,
  },
  balanceGlowTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -110,
    right: -90,
  },
  balanceGlowBottom: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: -130,
    left: -100,
  },
  balanceShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  bakiyeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bakiyeLabelDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginRight: 8,
  },
  editBalanceBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  smartLabelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  proDividerWrap: {
    marginVertical: 12,
  },
  proDividerLine: {
    height: 1,
    width: '100%',
  },
  asistanAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  asistanIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 8,
  },
  chartTopAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  modalHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalEditTitle: {
    fontFamily: 'Poppins-Black',
    fontSize: 22,
    letterSpacing: -0.5,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  modalEditSubtitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 18,
    letterSpacing: 0.2,
  },
  salarySheet: {
        width: '100%',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 30,
        paddingBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalIconBadge: {
        width: 50,
        height: 50,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontFamily: 'Poppins-Black',
        fontSize: 22,
        textAlign: 'center',
        marginTop: 10,
    },
    modalSubtitle: {
        fontFamily: 'Poppins-Medium',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    giantInputContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: 100,
        backgroundColor: 'rgba(148, 163, 184, 0.05)',
        borderRadius: 25,
        marginVertical: 10,
    },
    currencyPrefix: {
        fontFamily: 'Poppins-Bold',
        fontSize: 32,
        marginRight: 10,
    },
    giantInput: {
        fontFamily: 'Poppins-Black',
        fontSize: 42,
        minWidth: 100,
        textAlign: 'center',
    },
    actionBtn: {
        marginTop: 20,
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
    },
    btnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        fontFamily: 'Poppins-Black',
        color: '#FFFFFF',
        fontSize: 16,
        letterSpacing: 1.2,
    },
    sheetHandle: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 10,
    },
    salaryGlowTop: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        top: -120,
        right: -90,
    },
    salaryGlowBottom: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        bottom: -130,
        left: -100,
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    modalIconBadgePremium: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    modalTitlePremium: {
        fontFamily: 'Poppins-Black',
        fontSize: 18,
        letterSpacing: -0.4,
    },
    modalSubtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusPulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    modalSubtitlePremium: {
        fontFamily: 'Poppins-Medium',
        fontSize: 11,
        letterSpacing: 0.2,
    },
    modalCloseBtnPremium: {
        width: 34,
        height: 34,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    balanceHeroCard: {
        borderRadius: 22,
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderWidth: 1,
        overflow: 'hidden',
        marginTop: 4,
        marginBottom: 18,
    },
    previousBalanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroLabelMini: {
        fontFamily: 'Poppins-Bold',
        fontSize: 9,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
    },
    previousBalanceValue: {
        fontFamily: 'Poppins-Bold',
        fontSize: 13,
        letterSpacing: -0.2,
    },
    heroDivider: {
        height: 1,
        width: '100%',
        marginTop: 12,
    },
    giantInputRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginTop: 6,
    },
    currencyPrefixPremium: {
        fontFamily: 'Poppins-Bold',
        fontSize: 28,
        marginRight: 8,
    },
    giantInputPremium: {
        fontFamily: 'Poppins-Black',
        fontSize: 44,
        minWidth: 100,
        textAlign: 'center',
        letterSpacing: -1.5,
        padding: 0,
    },
    diffBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 12,
    },
    diffText: {
        fontFamily: 'Poppins-Black',
        fontSize: 12,
        marginLeft: 5,
        letterSpacing: -0.2,
    },
    diffSubText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 9,
        marginLeft: 6,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    quickAdjustLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        marginLeft: 4,
    },
    quickAdjustLabel: {
        fontFamily: 'Poppins-Bold',
        fontSize: 9,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
    },
    quickAdjustRow: {
        marginBottom: 18,
        marginHorizontal: -4,
    },
    quickAdjustChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 13,
        paddingVertical: 8,
        borderRadius: 11,
        borderWidth: 1,
        marginRight: 7,
    },
    quickAdjustChipText: {
        fontFamily: 'Poppins-Black',
        fontSize: 11,
        letterSpacing: 0.3,
    },
});

export default Home;