import React, { useState, useCallback, useRef, useEffect  } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Animated, Dimensions, KeyboardAvoidingView, Platform, useWindowDimensions} from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons, EvilIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useTheme } from './ThemeContext'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';

const getAssetMeta = (ticker) => {
    const map = {
        'BTC': { icon: 'bitcoin', color: '#F7931A', library: 'FontAwesome5' },
        'ETH': { icon: 'ethereum', color: '#627EEA', library: 'FontAwesome5' },
        'SOL': { icon: 'bolt', color: '#14F195', library: 'FontAwesome5' },
        'BNB': { icon: 'coins', color: '#F3BA2F', library: 'FontAwesome5' },
        'XRP': { icon: 'ripple', color: '#23292F', library: 'MaterialCommunityIcons' },
        'AVAX': { icon: 'mountain', color: '#E84142', library: 'FontAwesome5' },
        'DOGE': { icon: 'dog', color: '#C2A633', library: 'FontAwesome5' },
        'GAU': { icon: 'gold', color: '#FFD700', library: 'MaterialCommunityIcons' },
        'USD': { icon: 'dollar-sign', color: '#85BB65', library: 'FontAwesome5' },
        'EUR': { icon: 'euro-sign', color: '#003399', library: 'FontAwesome5' },
        'GBP': { icon: 'pound-sign', color: '#00843D', library: 'FontAwesome5' },
        'TRY': { icon: 'lira-sign', color: '#E11D48', library: 'FontAwesome5' },
    };
    return map[ticker] || { icon: 'database', color: '#64748B', library: 'FontAwesome5' };
};

const getGoalMeta = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('araba') || lowerName.includes('motor') || lowerName.includes('araç') || lowerName.includes('taşıt')) {
        return { icon: 'car-sport-outline', color: '#3B82F6' }; 
    }
    if (lowerName.includes('ev') || lowerName.includes('daire') || lowerName.includes('arsa') || lowerName.includes('kira')) {
        return { icon: 'home-outline', color: '#10B981' }; 
    }
    if (lowerName.includes('bilgisayar') || lowerName.includes('mac') || lowerName.includes('laptop') || lowerName.includes('pc')) {
        return { icon: 'laptop-outline', color: '#8B5CF6' }; 
    }
    if (lowerName.includes('telefon') || lowerName.includes('iphone') || lowerName.includes('samsung')) {
        return { icon: 'phone-portrait-outline', color: '#F59E0B' }; 
    }
    if (lowerName.includes('tatil') || lowerName.includes('seyahat') || lowerName.includes('bilet') || lowerName.includes('kamp')) {
        return { icon: 'airplane-outline', color: '#06B6D4' }; 
    }
    if (lowerName.includes('düğün') || lowerName.includes('evlilik') || lowerName.includes('yüzük') || lowerName.includes('nişan')) {
        return { icon: 'heart-outline', color: '#E11D48' }; 
    }
    return { icon: 'rocket-outline', color: '#0EA5E9' }; 
};

const formatAmount = (text) => {
    const cleaned = text.replace(/\D/g, '');
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const translations = {
    tr: {
        totalAssetValue: 'Toplam Varlık Değeri',
        liveDataActive: 'Canlı Veri Aktif',
        marketWatch: 'Piyasa İzleme',
        myPortfolio: 'Portföyüm',
        noAssets: 'Henüz varlık eklenmedi.',
        showLess: 'Daha Az Göster',
        showAll: 'Tümünü Gör',
        addNewAsset: 'Yeni Varlık Ekle',
        assetName: 'VARLIK İSMİ',
        assetNamePlaceholder: 'Bitcoin...',
        tickerSymbol: 'SEMBOL (TICKER)',
        tickerPlaceholder: 'BTC...',
        quantity: 'MİKTAR',
        totalValueTL: 'TOPLAM DEĞER (TL)',
        addToPortfolio: 'Kasaya Ekle',
        popularAssets: 'POPÜLER VARLIKLAR',
        assetToAdd: 'EKLENECEK VARLIK',
        noSelection: 'Henüz Seçim Yok',
        livePrice: 'CANLI FİYAT',
        perUnit: '/ adet',
        estimatedTotalValue: 'TAHMİNİ TOPLAM DEĞER',
        myGoals: 'Hedeflerim',
        noGoals: 'Henüz bir hedef belirlemedin.',
        completed: 'Tamamlandı!',
        remaining: 'Kalan',
        addNewGoal: 'Yeni Hedef Ekle',
        setGoal: 'Hedef Belirle',
        goalAmount: 'HEDEF TUTARI (TL)',
        goalDreamPlaceholder: 'Hayalin nedir? (Araba, Tatil...)',
        startDream: 'Hedefi Başlat',
        error: 'Hata',
        transactionFailed: 'İşlem başarısız.',
        couldNotDelete: 'Silinemedi.',
        enterGoalDetails: 'Lütfen hedef adı ve tutarını girin.',
        guestTitle: 'Hesap Gerekli',
        guestMsgAsset: 'Portföyünüze varlık eklemek ve verilerinizi güvenle saklamak için lütfen hesap oluşturun veya giriş yapın.',
        guestMsgGoal: 'Kendinize yeni hedefler belirlemek için lütfen hesap oluşturun veya giriş yapın.',
        guestCancel: 'Vazgeç',
        guestRegister: 'Kayıt Ol',
        guestLogin: 'Giriş Yap',
    },
    en: {
        totalAssetValue: 'Total Asset Value',
        liveDataActive: 'Live Data Active',
        marketWatch: 'Market Watch',
        myPortfolio: 'My Portfolio',
        noAssets: 'No assets added yet.',
        showLess: 'Show Less',
        showAll: 'Show All',
        addNewAsset: 'Add New Asset',
        assetName: 'ASSET NAME',
        assetNamePlaceholder: 'Bitcoin...',
        tickerSymbol: 'SYMBOL (TICKER)',
        tickerPlaceholder: 'BTC...',
        quantity: 'QUANTITY',
        totalValueTL: 'TOTAL VALUE (TL)',
        addToPortfolio: 'Add to Vault',
        popularAssets: 'POPULAR ASSETS',
        assetToAdd: 'ASSET TO ADD',
        noSelection: 'No Selection Yet',
        livePrice: 'LIVE PRICE',
        perUnit: '/ unit',
        estimatedTotalValue: 'ESTIMATED TOTAL VALUE',
        myGoals: 'My Goals',
        noGoals: 'You haven\'t set a goal yet.',
        completed: 'Completed!',
        remaining: 'Remaining',
        addNewGoal: 'Add New Goal',
        setGoal: 'Set a Goal',
        goalAmount: 'GOAL AMOUNT (TL)',
        goalDreamPlaceholder: 'What is your dream? (Car, Vacation...)',
        startDream: 'Start the Target',
        error: 'Error',
        transactionFailed: 'Transaction failed.',
        couldNotDelete: 'Could not delete.',
        enterGoalDetails: 'Please enter goal name and amount.',
        guestTitle: 'Account Required',
        guestMsgAsset: 'Please create an account or log in to add assets to your portfolio and safely store your data.',
        guestMsgGoal: 'Please create an account or log in to set new goals for yourself.',
        guestCancel: 'Cancel',
        guestRegister: 'Sign Up',
        guestLogin: 'Log In',
    }
};

const Vault = () => {
    const navigation = useNavigation();
    const { isDarkMode } = useTheme();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
    const [isAddGoalVisible, setIsAddGoalVisible] = useState(false);
    const [goals, setGoals] = useState([]);
    const [newGoalName, setNewGoalName] = useState('');
    const [newGoalAmount, setNewGoalAmount] = useState('');
    const [newName, setNewName] = useState('');
    const [newTicker, setNewTicker] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [assets, setAssets] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [language, setLanguage] = useState('tr');
    const [apiError, setApiError] = useState(false);
    const { width: windowWidth } = useWindowDimensions();
    const isTablet = windowWidth >= 768;

    const themeAccent = isDarkMode ? '#09F8F0' : '#000A47'; 
    const themeBackground = isDarkMode ? '#0F172A' : '#FFFFFF';
    const themeSurface = isDarkMode ? '#1E293B' : '#F8FAFC';
    const themeText = isDarkMode ? '#F8FAFC' : '#06003F';
    const themeSubText = isDarkMode ? '#94A3B8' : '#64748B';
    const themeBorder = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9';

    const t = (key) => translations[language][key] || key;

    const [marketPrices, setMarketPrices] = useState([
        { id: '1', name: 'Bitcoin', symbol: 'BTCTRY', ticker: 'BTC', price: 0, change: '0%', up: true, type: 'crypto' },
        { id: '2', name: 'Ethereum', symbol: 'ETHTRY', ticker: 'ETH', price: 0, change: '0%', up: true, type: 'crypto' },
        { id: '3', name: 'Solana', symbol: 'SOLTRY', ticker: 'SOL', price: 0, change: '0%', up: true, type: 'crypto' },
        { id: '4', name: 'Binance Coin', symbol: 'BNBTRY', ticker: 'BNB', price: 0, change: '0%', up: true, type: 'crypto' },
        { id: '5', name: 'Avalanche', symbol: 'AVAXTRY', ticker: 'AVAX', price: 0, change: '0%', up: true, type: 'crypto' },
        { id: '6', name: 'Dogecoin', symbol: 'DOGETRY', ticker: 'DOGE', price: 0, change: '0%', up: true, type: 'crypto' },
        { id: '7', name: 'Dolar/TL', symbol: 'USD', ticker: 'USD', price: 0, change: '+0.01%', up: true, type: 'fiat' },
        { id: '8', name: 'Gram Altın', symbol: 'GAU', ticker: 'GAU', price: 0, change: '0%', up: true, type: 'gold' },
    ]);

    const isLiveAsset = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'AVAX', 'DOGE', 'GAU', 'USD', 'EUR', 'GBP'].includes(newTicker.toUpperCase());

    const fetchAssets = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return; 
            const q = query(collection(db, 'assets'), where('userId', '==', currentUser.uid));
            const querySnapshot = await getDocs(q);
            const data = [];
            querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            setAssets(data);
        } catch (error) { setAssets([]); }
    };

    const fetchGoals = async () => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return; 
            const q = query(collection(db, 'goals'), where('userId', '==', currentUser.uid));
            const querySnapshot = await getDocs(q);
            const data = [];
            querySnapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
            setGoals(data);
        } catch (error) { setGoals([]); }
    };

    const fetchMarketData = async () => {
    try {
        setApiError(false); 
        const symbols = ["BTCTRY", "ETHTRY", "SOLTRY", "BNBTRY", "AVAXTRY", "DOGETRY", "PAXGUSDT"];
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const cryptoPromises = symbols.map(s => 
            fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${s}`, { signal: controller.signal })
            .then(r => {
                if (!r.ok) throw new Error(`Binance Hatası`);
                return r.json();
            })
        );
        
        const fiatPromise = fetch(`https://open.er-api.com/v6/latest/USD`, { signal: controller.signal })
            .then(r => {
                if (!r.ok) throw new Error(`Döviz Hatası`);
                return r.json();
            });

        const [cryptoResults, fiatData] = await Promise.all([Promise.all(cryptoPromises), fiatPromise]);
        clearTimeout(timeoutId); 

        const usdTryRate = fiatData.rates.TRY;

        setMarketPrices(prev => prev.map(item => {
            if (item.type === 'crypto') {
                const live = cryptoResults.find(r => r.symbol === item.symbol);
                return live ? { ...item, price: parseFloat(live.lastPrice), change: `${parseFloat(live.priceChangePercent).toFixed(2)}%`, up: parseFloat(live.priceChangePercent) >= 0 } : item;
            }
            if (item.symbol === 'USD') return { ...item, price: usdTryRate };
            if (item.symbol === 'GAU') {
                const paxg = cryptoResults.find(r => r.symbol === 'PAXGUSDT');
                const gramGold = (parseFloat(paxg.lastPrice) * usdTryRate) / 31.1035;
                return { ...item, price: gramGold, change: `${parseFloat(paxg.priceChangePercent).toFixed(2)}%`, up: parseFloat(paxg.priceChangePercent) >= 0 };
            }
            return item;
        }));
    } catch (err) {
        setApiError(true); 
        Alert.alert(
            "Bağlantı Sorunu", 
            "Canlı piyasa verilerine ulaşılamıyor. Lütfen internet bağlantınızı veya operatörünüzün Güvenli İnternet filtresini kontrol edin."
        );
    }
};
    const fetchLanguage = async () => {
        try {
            const savedLang = await AsyncStorage.getItem('appLanguage');
            if (savedLang) setLanguage(savedLang);
        } catch (error) {}
    };

    useFocusEffect(useCallback(() => { fetchLanguage(); fetchMarketData(); fetchAssets(); fetchGoals(); }, []));

   const liveAssets = (Array.isArray(assets) ? assets : []).map(asset => {
    const ticker = asset.ticker.toUpperCase();
    const marketItem = marketPrices.find(m => m.ticker === ticker);
    const currentPrice = marketItem ? marketItem.price : 0;
    const liveValue = currentPrice > 0 ? (parseFloat(asset.amount) * currentPrice) : 0; 
    return { ...asset, liveValue };
});
    const totalValue = liveAssets.reduce((sum, a) => sum + (a.liveValue || 0), 0);

    const handleOpenAssetModal = () => {
        if (!auth.currentUser) {
            Alert.alert(
                t('guestTitle'),
                t('guestMsgAsset'),
                [
                    { text: t('guestCancel'), style: 'cancel' },
                    { text: t('guestRegister'), onPress: () => navigation.navigate('Register') },
                    { text: t('guestLogin'), onPress: () => navigation.navigate('Login') }
                ],
                { userInterfaceStyle: isDarkMode ? 'dark' : 'light' }
            );
            return;
        }
        setNewName(''); setNewTicker(''); setNewAmount('');
        setIsModalVisible(true);
    };

    const handleAddAsset = async () => {
        if (!newName || !newTicker || !newAmount) return;
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            const cleanAmount = parseFloat(newAmount.replace(/\./g, '').replace(',', '.')) || 0;
            await addDoc(collection(db, 'assets'), { name: newName, ticker: newTicker.toUpperCase(), amount: cleanAmount, value: 0, userId: currentUser.uid, createdAt: new Date() });
            setIsModalVisible(false); setNewName(''); setNewTicker(''); setNewAmount(''); fetchAssets();
        } catch (error) { Alert.alert(t('error'), t('transactionFailed')); }
    };

    const handleDeleteAsset = async (id) => {
        try { await deleteDoc(doc(db, 'assets', id)); fetchAssets(); } 
        catch (error) { Alert.alert(t('error'), t('couldNotDelete')); }
    };

    const handleAddGoalClick = () => {
        if (!auth.currentUser) {
            setIsGoalModalVisible(false);
            Alert.alert(
                t('guestTitle'),
                t('guestMsgGoal'),
                [
                    { text: t('guestCancel'), style: 'cancel' },
                    { text: t('guestRegister'), onPress: () => navigation.navigate('Register') },
                    { text: t('guestLogin'), onPress: () => navigation.navigate('Login') }
                ],
                { userInterfaceStyle: isDarkMode ? 'dark' : 'light' }
            );
            return;
        }
        setIsGoalModalVisible(false); 
        setTimeout(() => setIsAddGoalVisible(true), 350); 
    };

    const handleCloseAddGoal = () => { setIsAddGoalVisible(false); setTimeout(() => setIsGoalModalVisible(true), 350); };

    const handleSaveGoal = async () => {
        if (!newGoalName || !newGoalAmount) { Alert.alert(t('error'), t('enterGoalDetails')); return; }
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            const cleanAmount = parseFloat(newGoalAmount.replace(/\./g, '')) || 0;
            await addDoc(collection(db, 'goals'), { name: newGoalName, targetAmount: cleanAmount, userId: currentUser.uid, createdAt: new Date() });
            setNewGoalName(''); setNewGoalAmount(''); handleCloseAddGoal(); fetchGoals();
        } catch (error) {}
    };

    const handleDeleteGoal = async (id) => {
        try { await deleteDoc(doc(db, 'goals', id)); fetchGoals(); } catch (error) {}
    };

    const renderRightActions = (id) => (
        <TouchableOpacity onPress={() => handleDeleteAsset(id)} style={styles.deleteAction}>
            <Ionicons name="trash" size={26} color="white" />
        </TouchableOpacity>
    );
            
    const pulseAnim = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        ])).start();
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={[styles.container, { backgroundColor: themeBackground }]}>
                
                <View style={[styles.topHeaderBar, isTablet && { width: '90%', paddingVertical: 10 }]}>
                    <Text style={[styles.headerTitleText, { color: themeText }]}></Text>
                    <TouchableOpacity 
                        style={[styles.goalTriggerBtn, { backgroundColor: themeSurface, borderColor: themeBorder }, isTablet && { width: 54, height: 54, borderRadius: 18 }]}
                        onPress={() => setIsGoalModalVisible(true)}
                    >
                        <MaterialCommunityIcons name="bullseye-arrow" size={isTablet ? 32 : 24} color={themeAccent} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 50, paddingHorizontal: isTablet ? 40 : 0 }}>

                    <View style={[
                        styles.vaultCard, 
                        { backgroundColor: isDarkMode ? '#09F8F0' : '#030C46', shadowColor: isDarkMode ? '#09F8F0' : '#030C46', elevation: 20 },
                        isTablet && { width: '100%', height: 240, borderRadius: 40, marginTop: 25 } 
                    ]}>
                        <View style={[styles.cardGlow, styles.glowTop, { backgroundColor: isDarkMode ? '#030C46' : '#09F8F0', opacity: isDarkMode ? 0.15 : 0.25 }]} />
                        <View style={[styles.cardGlow, styles.glowBottom, { backgroundColor: isDarkMode ? '#030C46' : '#09F8F0', opacity: isDarkMode ? 0.1 : 0.2 }]} />

                        <View style={[styles.content, isTablet && { paddingLeft: 40 }]}>
                            <Text style={[styles.vaultLabel, { color: isDarkMode ? 'rgba(30, 0, 0, 0.41)' : 'rgba(255, 255, 255, 0.7)' }, isTablet && { fontSize: 16 }]}>{t('totalAssetValue')}</Text>
                             <Text style={[styles.totalText, { color: isDarkMode ? '#010E49' : '#FFFFFF' }, isTablet && { fontSize: 64 }]}>
                                <Text style={[styles.currencySymbol, { color: isDarkMode ? '#010E49' : '#FFFFFF' }, isTablet && { fontSize: 40 }]}>₺ </Text>
                                {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(totalValue)}
                            </Text>
                         <View style={styles.badgeRow}>
                        <View style={[styles.profitBadge, { backgroundColor: apiError ? 'rgba(239, 68, 68, 0.15)' : (isDarkMode ? 'rgba(3, 12, 70, 0.1)' : 'rgba(255, 255, 255, 0.15)') }]}>
                            <View style={styles.liveContainer}>
                                <Animated.View style={[styles.liveDot, { 
                                    backgroundColor: apiError ? '#EF4444' : (isDarkMode ? '#00FF9D' : '#00FF7B'), 
                                    opacity: apiError ? 1 : pulseAnim, 
                                    transform: [{ scale: apiError ? 1 : pulseAnim }] 
                                }]} />
                                <Text style={[styles.profitText, { color: apiError ? '#EF4444' : (isDarkMode ? '#00FF73' : '#00FF7B') }, isTablet && { fontSize: 13 }]}>
                                    {apiError ? 'BAĞLANTI HATASI' : t('liveDataActive')}
                                </Text>
                            </View>
                        </View>
                    </View>
                        </View>
                    </View>

                    <View style={[styles.assetsSection, { marginTop: isTablet ? 40 : 25 }]}>
                        <View style={styles.marketTitleRow}>
                            <View style={[styles.liveIndicator, {backgroundColor: isDarkMode ?  '#EF415B' : '#DA0324' }]} />
                            <Text style={[styles.assetsLabel, { color: themeText }, isTablet && { fontSize: 24 }]}>{t('marketWatch')}</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                            {marketPrices.map((item) => (
                                <View key={item.id} style={[
                                    styles.proTickerItem, 
                                    { backgroundColor: themeSurface, borderColor: themeBorder },
                                    isTablet && { width: 220, padding: 24, marginRight: 20, borderRadius: 30 }
                                ]}>
                                    <View style={styles.tickerTop}>
                                        <Text style={[styles.tickerNameText, isTablet && { fontSize: 14 }]}>{item.name}</Text>
                                        <Text style={[styles.tickerChangeText, { color: item.up ? '#4ADE80' : '#FB7185' }, isTablet && { fontSize: 15 }]}>{item.change}</Text>
                                    </View>
                                    <Text style={[styles.tickerPriceText, { color: themeText }, isTablet && { fontSize: 22 }]}>
                                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(item.price)}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={[styles.assetsSection, { marginTop: isTablet ? 45 : 30 }]}>
                        <View style={[styles.assetsHeader, isTablet && { marginBottom: 20 }]}>
                            <Text style={[styles.assetsLabel, { color: themeText }, isTablet && { fontSize: 26 }]}>{t('myPortfolio')}</Text>
                            {/* 🌟 YENİ BAĞLANTI (GÜVENLİK KAPISI) */}
                            <TouchableOpacity onPress={handleOpenAssetModal} style={[styles.addBtn, isTablet && { width: 54, height: 54 }]}>
                                <MaterialIcons name="add" size={isTablet ? 36 : 28} color={themeAccent} />
                            </TouchableOpacity>
                        </View>
                        
                        {liveAssets.length === 0 ? (
                            <View style={[styles.emptyContainer, { backgroundColor: themeSurface, borderColor: themeBorder }, isTablet && { paddingVertical: 60 }]}>
                                <Ionicons name="wallet-outline" size={isTablet ? 64 : 48} color={themeSubText} />
                                <Text style={[styles.emptyText, { color: themeSubText }, isTablet && { fontSize: 18, marginTop: 15 }]}>{t('noAssets')}</Text>
                            </View>
                        ) : (
                        <>
                        {(isExpanded ? liveAssets : liveAssets.slice(0, 2)).map((asset) => {
                            const meta = getAssetMeta(asset.ticker);
                            const IconComponent = meta.library === 'MaterialCommunityIcons' ? MaterialCommunityIcons : FontAwesome5;
                            return (
                                <Swipeable key={asset.id} renderRightActions={() => renderRightActions(asset.id)} containerStyle={{ width: '100%' }}>
                                    <View style={[
                                        styles.assetItem, 
                                        { backgroundColor: themeBackground, borderBottomColor: themeBorder },
                                        isTablet && { paddingVertical: 30 } 
                                    ]}>
                                        <View style={[styles.iconWrapper, { backgroundColor: `${meta.color}25` }, isTablet && { width: 68, height: 68, borderRadius: 24 }]}>
                                            <IconComponent name={meta.icon} size={isTablet ? 28 : 20} color={meta.color} />
                                        </View>
                                        <View style={[styles.assetDetails, isTablet && { marginLeft: 25 }]}>
                                            <Text style={[styles.assetName, { color: themeText }, isTablet && { fontSize: 20 }]}>{asset.name}</Text>
                                            <Text style={[styles.assetTicker, isTablet && { fontSize: 15, marginTop: 5 }]}>{asset.amount} {asset.ticker}</Text>
                                        </View>
                                        <View style={styles.assetValueContainer}>
                                            <Text style={[styles.assetValue, { color: themeText }, isTablet && { fontSize: 22 }]}>
                                                ₺ {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(asset.liveValue)}
                                            </Text>
                                        </View>
                                    </View>
                                </Swipeable>
                            );
                        })}

                       {liveAssets.length > 2 && (
                            <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={[styles.toggleButton, isTablet && { paddingVertical: 25 }]}>
                                <Text style={[styles.toggleButtonText, { color: isDarkMode ? '#FFFFFF' : '#00033B' }, isTablet && { fontSize: 16 }]}>
                                    {isExpanded ? t('showLess') : `${t('showAll')} (${liveAssets.length})`}
                                </Text>
                                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={isTablet ? 22 : 18} color={themeAccent} style={{ marginLeft: 5 }} />
                            </TouchableOpacity>
                        )}
                        </>
                    )}
                </View>
            </ScrollView>

           <Modal visible={isModalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modalOverlay, { justifyContent: isTablet ? 'center' : 'flex-end' }]}>
                    <TouchableOpacity style={{ flex: 1, width: '100%' }} activeOpacity={1} onPress={() => setIsModalVisible(false)} />

                    <View style={[
                        styles.premiumSheet, 
                        { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF' },
                        isTablet && { width: 500, alignSelf: 'center', borderRadius: 32 }
                    ]}>
                        {!isTablet && <View style={[styles.sheetHandle, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]} />}

                        <TouchableOpacity style={styles.closeHeaderBtn} onPress={() => setIsModalVisible(false)}>
                            <Ionicons name="close" size={20} color={themeSubText} />
                        </TouchableOpacity>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }} keyboardShouldPersistTaps="handled">

                            {(() => {
                                const tickerUpper = newTicker.toUpperCase();
                                const meta = getAssetMeta(tickerUpper);
                                const IconComp = meta.library === 'MaterialCommunityIcons' ? MaterialCommunityIcons : FontAwesome5;
                                const marketItem = marketPrices.find(m => m.ticker === tickerUpper);
                                const livePrice = marketItem?.price || 0;
                                const isLive = livePrice > 0;
                                const cleanAmount = parseFloat((newAmount || '').replace(/\./g, '').replace(',', '.')) || 0;
                                const estValue = isLive ? cleanAmount * livePrice : 0;

                                return (
                                    <View style={[styles.assetHeroCompact, { borderColor: meta.color + '35', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#FAFBFC' }]}>
                                        <LinearGradient colors={[meta.color + (isDarkMode ? '1F' : '14'), meta.color + '03', 'transparent']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                                        <View style={styles.heroCompactRow}>
                                            <View style={[styles.heroCompactIcon, { backgroundColor: meta.color + '22', borderColor: meta.color + '50' }]}>
                                                <IconComp name={meta.icon} size={22} color={meta.color} />
                                            </View>
                                            <View style={styles.heroCompactText}>
                                                <Text style={[styles.heroCompactName, { color: themeText }]} numberOfLines={1}>
                                                    {newName || tickerUpper || t('noSelection')}
                                                </Text>
                                                {isLive ? (
                                                    <Text style={[styles.heroCompactPrice, { color: meta.color }]} numberOfLines={1}>
                                                        ₺ {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(livePrice)}
                                                        <Text style={[styles.heroCompactUnit, { color: themeSubText }]}> {t('perUnit')}</Text>
                                                    </Text>
                                                ) : (
                                                    <Text style={[styles.heroCompactSub, { color: themeSubText }]}>{t('assetToAdd')}</Text>
                                                )}
                                            </View>
                                            {isLive && <Animated.View style={[styles.liveDotMini, { backgroundColor: meta.color, opacity: pulseAnim }]} />}
                                        </View>

                                        {estValue > 0 && (
                                            <View style={[styles.heroEstimateInline, { borderTopColor: meta.color + '20' }]}>
                                                <Text style={[styles.heroEstimateInlineLabel, { color: themeSubText }]}>{t('estimatedTotalValue')}</Text>
                                                <Text style={[styles.heroEstimateInlineValue, { color: themeText }]}>
                                                    ₺ {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(estValue)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })()}

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularChipsScroll} contentContainerStyle={{ paddingRight: 20 }}>
                                {[
                                    { name: 'Bitcoin', ticker: 'BTC' },
                                    { name: 'Ethereum', ticker: 'ETH' },
                                    { name: 'Solana', ticker: 'SOL' },
                                    { name: 'Gram Altın', ticker: 'GAU' },
                                    { name: 'Dolar', ticker: 'USD' },
                                    { name: 'Avalanche', ticker: 'AVAX' },
                                    { name: 'Dogecoin', ticker: 'DOGE' },
                                ].map((opt) => {
                                    const m = getAssetMeta(opt.ticker);
                                    const IconC = m.library === 'MaterialCommunityIcons' ? MaterialCommunityIcons : FontAwesome5;
                                    const active = newTicker.toUpperCase() === opt.ticker;
                                    return (
                                        <TouchableOpacity
                                            key={opt.ticker}
                                            onPress={() => { setNewName(opt.name); setNewTicker(opt.ticker); }}
                                            activeOpacity={0.7}
                                            style={[styles.assetSuggestionChipMini, {
                                                backgroundColor: active ? m.color + '20' : (isDarkMode ? 'rgba(255,255,255,0.04)' : '#F1F5F9'),
                                                borderColor: active ? m.color : themeBorder
                                            }]}
                                        >
                                            <IconC name={m.icon} size={12} color={active ? m.color : themeSubText} />
                                            <Text style={[styles.assetSuggestionChipTextMini, { color: active ? m.color : themeText }]}>{opt.ticker}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <View style={styles.twoColRow}>
                                <View style={[styles.inputGroupCompact, { flex: 2.1, marginBottom: 0 }]}>
                                    <Text style={[styles.premiumLabelMini, { color: themeSubText }]}>{t('assetName')}</Text>
                                    <View style={[styles.compactInput, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(241, 245, 249, 0.6)', borderColor: themeBorder }]}>
                                        <Ionicons name="wallet-outline" size={16} color={themeAccent} style={{ marginRight: 8 }} />
                                        <TextInput style={[styles.premiumInputMini, { color: themeText }]} placeholder={t('assetNamePlaceholder')} placeholderTextColor={themeSubText} value={newName} onChangeText={setNewName} />
                                    </View>
                                </View>
                                <View style={[styles.inputGroupCompact, { flex: 1, marginLeft: 10, marginBottom: 0 }]}>
                                    <Text style={[styles.premiumLabelMini, { color: themeSubText }]}>{t('tickerSymbol')}</Text>
                                    <View style={[styles.compactInput, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(241, 245, 249, 0.6)', borderColor: themeBorder, paddingHorizontal: 8 }]}>
                                        <TextInput style={[styles.premiumInputMini, { color: themeText, textAlign: 'center', fontFamily: 'Poppins-Black', fontSize: 14, letterSpacing: 0.5 }]} placeholder="BTC" placeholderTextColor={themeSubText} autoCapitalize="characters" value={newTicker} onChangeText={setNewTicker} />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.inputGroupCompact}>
                                <Text style={[styles.premiumLabelMini, { color: themeSubText }]}>{t('quantity')}</Text>
                                <View style={[styles.compactInput, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(241, 245, 249, 0.6)', borderColor: themeBorder }]}>
                                    <Ionicons name="analytics-outline" size={16} color={themeAccent} style={{ marginRight: 8 }} />
                                    <TextInput style={[styles.premiumInputMini, { color: themeText }]} placeholder="0.00" placeholderTextColor={themeSubText} keyboardType="decimal-pad" value={newAmount} onChangeText={setNewAmount} />
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScrollTight} contentContainerStyle={{ paddingRight: 20 }}>
                                    {['0.1', '0.5', '1', '5', '10', '100'].map((v) => (
                                        <TouchableOpacity key={v} onPress={() => setNewAmount(v)} activeOpacity={0.7} style={[styles.amountChipMini, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F1F5F9', borderColor: themeBorder }]}>
                                            <Text style={[styles.amountChipTextMini, { color: themeText }]}>{v}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    <TouchableOpacity onPress={() => setNewAmount('')} activeOpacity={0.7} style={[styles.amountChipMini, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)', borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
                                        <Ionicons name="refresh-outline" size={11} color="#EF4444" style={{ marginRight: 3 }} />
                                        <Text style={[styles.amountChipTextMini, { color: '#EF4444' }]}>Sıfırla</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>

                            <TouchableOpacity style={[styles.actionBtnCompact, (!newName || !newTicker || !newAmount) && styles.actionBtnDisabled]} onPress={handleAddAsset} activeOpacity={0.85} disabled={!newName || !newTicker || !newAmount}>
                                <LinearGradient colors={isDarkMode ? ['#09F8F0', '#0891B2'] : ['#030C46', '#050B3B']} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                                    <Text style={styles.btnTextMini}>{t('addToPortfolio')}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal visible={isGoalModalVisible} transparent animationType="slide">
                <View style={[styles.modalOverlay, { justifyContent: isTablet ? 'center' : 'flex-end' }]}>
                    <TouchableOpacity style={{ flex: 1, width: '100%' }} activeOpacity={1} onPress={() => setIsGoalModalVisible(false)} />
                    <View style={[
                        styles.modalCard, 
                        { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF', maxHeight: Dimensions.get('window').height * 0.85 },
                        isTablet && { width: 600, alignSelf: 'center', borderRadius: 32, paddingBottom: 20 }
                    ]}>
                        <View style={styles.modalHeader}>
                            {!isTablet && <View style={[styles.modalHandle, { backgroundColor: themeBorder }]} />}
                            <View style={styles.titleRow}>
                                <Text style={[styles.modalTitle, { color: themeText }]}>{t('myGoals')}</Text>
                                <TouchableOpacity onPress={() => setIsGoalModalVisible(false)} style={styles.headerCloseIcon}>
                                    <EvilIcons name='close' size={35} color={themeSubText} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            {goals.length === 0 ? (
                                <View style={[styles.emptyContainer, { backgroundColor: themeSurface, borderColor: themeBorder }]}>
                                    <Ionicons name="flag-outline" size={48} color={themeSubText} />
                                    <Text style={[styles.emptyText, { color: themeSubText }]}>{t('noGoals')}</Text>
                                </View>
                            ) : (
                                goals.map((goal) => {
                                    const goalPercentage = Math.min((totalValue / goal.targetAmount) * 100, 100).toFixed(1);
                                    const remainingAmount = Math.max(0, goal.targetAmount - totalValue);
                                    const goalMeta = getGoalMeta(goal.name);

                                    return (
                                        <View key={goal.id} style={[styles.goalCardIsolated, { backgroundColor: themeSurface, borderColor: goalMeta.color + '30' }]}>
                                            <View style={styles.goalTopRow}>
                                                <View style={[styles.goalIconWrapper, { backgroundColor: goalMeta.color + '15' }]}>
                                                    <Ionicons name={goalMeta.icon} size={28} color={goalMeta.color} />
                                                </View>
                                                <View style={styles.goalTextContainer}>
                                                    <Text style={[styles.goalTitle, { color: themeText }]}>{goal.name}</Text>
                                                    <Text style={[styles.goalAmountText, { color: themeSubText }]}>
                                                        ₺{new Intl.NumberFormat('tr-TR').format(totalValue)} / ₺{new Intl.NumberFormat('tr-TR').format(goal.targetAmount)}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity onPress={() => handleDeleteGoal(goal.id)} style={{ padding: 5 }}>
                                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>

                                            <View style={[styles.goalProgressBarBg, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#E2E8F0' }]}>
                                                <View style={[styles.goalProgressBarFill, { width: `${goalPercentage}%`, backgroundColor: goalPercentage >= 100 ? '#10B981' : goalMeta.color }]} />
                                            </View>
                                            
                                            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 10}}>
                                                <Text style={{fontFamily: 'Poppins-Bold', fontSize: 14, color: goalPercentage >= 100 ? '#10B981' : goalMeta.color}}>%{goalPercentage}</Text>
                                                <Text style={{fontFamily: 'Poppins-Medium', fontSize: 12, color: themeSubText}}>
                                                    {remainingAmount === 0 ? `🎉 ${t('completed')}` : `${t('remaining')}: ₺${new Intl.NumberFormat('tr-TR').format(remainingAmount)}`}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })
                            )}

                            {/* 🌟 YENİ BAĞLANTI (GÜVENLİK KAPISI) */}
                            <TouchableOpacity onPress={handleAddGoalClick} style={[styles.addNewGoalListBtn, { borderColor: themeAccent }]}>
                                <MaterialIcons name="add" size={24} color={themeAccent} />
                                <Text style={[styles.addNewGoalListText, { color: themeAccent }]}>{t('addNewGoal')}</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

          <Modal visible={isAddGoalVisible} transparent animationType="slide">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modalOverlay, { justifyContent: isTablet ? 'center' : 'flex-end' }]}>
                <TouchableOpacity style={{ flex: 1, width: '100%' }} activeOpacity={1} onPress={handleCloseAddGoal} />

                <View style={[
                    styles.premiumSheet, 
                    { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF' },
                    isTablet && { width: 500, alignSelf: 'center', borderRadius: 32, paddingBottom: 20 }
                ]}>
                    {!isTablet && <View style={[styles.sheetHandle, { backgroundColor: isDarkMode ? '#334155' : '#E2E8F0' }]} />}

                    <TouchableOpacity style={styles.closeHeaderBtn} onPress={handleCloseAddGoal}>
                        <Ionicons name="close" size={22} color={themeSubText} />
                    </TouchableOpacity>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                        {(() => {
                            const previewMeta = getGoalMeta(newGoalName || '');
                            const previewAmount = newGoalAmount ? parseFloat(newGoalAmount.replace(/\./g, '')) : 0;
                            const previewProgress = previewAmount > 0 ? Math.min((totalValue / previewAmount) * 100, 100) : 0;
                            const isComplete = previewProgress >= 100;
                            return (
                                <View style={[styles.goalHeroCard, { borderColor: previewMeta.color + '40', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#FAFBFC' }]}>
                                    <LinearGradient colors={[previewMeta.color + (isDarkMode ? '20' : '18'), previewMeta.color + '05', 'transparent']} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
                                    <View style={[styles.heroIconCircle, { backgroundColor: previewMeta.color + '22', borderColor: previewMeta.color + '55' }]}>
                                        <Ionicons name={previewMeta.icon} size={38} color={previewMeta.color} />
                                    </View>
                                    <Text style={[styles.heroLabel, { color: themeSubText }]}>YENİ HEDEFİN</Text>
                                    <Text style={[styles.heroName, { color: themeText }]} numberOfLines={1}>{newGoalName || 'Hayalini Yaz'}</Text>
                                    <Text style={[styles.heroAmount, { color: previewMeta.color }]}>₺ {previewAmount > 0 ? new Intl.NumberFormat('tr-TR').format(previewAmount) : '0'}</Text>
                                    {previewAmount > 0 && (
                                        <View style={styles.heroProgressRow}>
                                            <View style={[styles.heroProgressBg, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }]}>
                                                <View style={[styles.heroProgressFill, { width: `${previewProgress}%`, backgroundColor: isComplete ? '#10B981' : previewMeta.color }]} />
                                            </View>
                                            <Text style={[styles.heroProgressText, { color: themeSubText }]}>
                                                {isComplete ? `🎉 Mevcut varlıklarınla bu hedefe ulaştın!` : `Mevcut varlıklarınla %${previewProgress.toFixed(0)} tamamlandı`}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })()}

                        <View style={styles.inputGroup}>
                            <Text style={[styles.premiumLabel, { color: themeSubText }]}>HEDEF İSMİ</Text>
                            <View style={[styles.modernInputContainer, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(241, 245, 249, 0.6)', borderColor: themeBorder }]}>
                                <View style={styles.inputIconBox}><Ionicons name="flag-outline" size={20} color={themeAccent} /></View>
                                <TextInput style={[styles.premiumInput, { color: themeText }]} placeholder={t('goalDreamPlaceholder')} placeholderTextColor={themeSubText} value={newGoalName} onChangeText={setNewGoalName} />
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ paddingRight: 20 }}>
                                {['Araba', 'Ev', 'Tatil', 'Telefon', 'Bilgisayar', 'Düğün'].map((s) => {
                                    const m = getGoalMeta(s);
                                    const active = newGoalName.trim().toLowerCase() === s.toLowerCase();
                                    return (
                                        <TouchableOpacity key={s} onPress={() => setNewGoalName(s)} activeOpacity={0.7} style={[styles.suggestionChip, { backgroundColor: active ? m.color + '20' : (isDarkMode ? 'rgba(255,255,255,0.04)' : '#F1F5F9'), borderColor: active ? m.color : themeBorder }]}>
                                            <Ionicons name={m.icon} size={14} color={active ? m.color : themeSubText} />
                                            <Text style={[styles.suggestionChipText, { color: active ? m.color : themeSubText }]}>{s}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.premiumLabel, { color: themeSubText }]}>{t('goalAmount')}</Text>
                            <View style={[styles.modernInputContainer, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(241, 245, 249, 0.6)', borderColor: themeBorder }]}>
                                <View style={styles.inputIconBox}><Text style={[styles.inputIconCurrency, { color: themeAccent }]}>₺</Text></View>
                                <TextInput style={[styles.premiumInput, { color: themeText }]} placeholder="0" placeholderTextColor={themeSubText} keyboardType="numeric" value={newGoalAmount} onChangeText={(text) => setNewGoalAmount(formatAmount(text))} />
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ paddingRight: 20 }}>
                                {[{ label: '+1K', val: 1000 }, { label: '+10K', val: 10000 }, { label: '+50K', val: 50000 }, { label: '+100K', val: 100000 }, { label: '+500K', val: 500000 }].map((q) => (
                                    <TouchableOpacity key={q.label} onPress={() => { const current = parseFloat((newGoalAmount || '').replace(/\./g, '')) || 0; setNewGoalAmount(formatAmount(String(current + q.val))); }} activeOpacity={0.7} style={[styles.amountChip, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F1F5F9', borderColor: themeBorder }]}>
                                        <Text style={[styles.amountChipText, { color: themeText }]}>{q.label}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity onPress={() => setNewGoalAmount('')} activeOpacity={0.7} style={[styles.amountChip, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)', borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
                                    <Ionicons name="refresh-outline" size={13} color="#EF4444" style={{ marginRight: 4 }} />
                                    <Text style={[styles.amountChipText, { color: '#EF4444' }]}>Sıfırla</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>

                        <TouchableOpacity style={[styles.actionBtn, (!newGoalName || !newGoalAmount) && styles.actionBtnDisabled]} onPress={handleSaveGoal} activeOpacity={0.85} disabled={!newGoalName || !newGoalAmount}>
                            <LinearGradient colors={isDarkMode ? ['#09F8F0', '#0891B2'] : ['#030C46', '#050B3B']} style={styles.btnGradient} start={{x:0, y:0}} end={{x:1, y:0}}>
                                <Text style={styles.btnText}>{t('startDream')}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    topHeaderBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '90%', alignSelf: 'center', marginTop: 10 },
    headerTitleText: { fontFamily: 'Poppins-Black', fontSize: 24, letterSpacing: -0.5 },
    goalTriggerBtn: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    vaultCard: { width: '92%', height: 180, borderRadius: 30, marginTop: 15, overflow: 'hidden' },
    content: { flex: 1, justifyContent: 'center', paddingLeft: 25, zIndex: 2 },
    vaultLabel: { fontFamily: 'Poppins-Bold', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
    totalText: { fontFamily: 'Poppins-Bold', fontSize: 36, letterSpacing: -1.5 },
    cardGlow: { position: 'absolute', width: 250, height: 250, borderRadius: 125 },
    glowTop: { top: -120, right: -100 },
    glowBottom: { bottom: -150, left: -120 },
   badgeRow: { 
        flexDirection: 'row', 
        marginTop: 15,
        justifyContent: 'flex-start', 
    },
    profitBadge: { 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 12,
        alignSelf: 'flex-start', 
    },
    liveContainer: {
        flexDirection: 'row',    
        alignItems: 'center',      
        justifyContent: 'center',
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,            
    },
    profitText: {
        fontFamily: 'Poppins-Bold', 
        fontSize: 11,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    currencySymbol: { fontFamily: 'Poppins-Light', fontSize: 22 },
    assetsSection: { width: '100%', alignSelf: 'center', paddingHorizontal: 20 },
    assetsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    assetsLabel: { fontFamily: 'Poppins-Bold', fontSize: 20 },
    addBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    assetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1 },
    iconWrapper: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    assetDetails: { flex: 1, marginLeft: 15 },
    assetName: { fontFamily: 'Poppins-Bold', fontSize: 16 },
    assetTicker: { fontFamily: 'Poppins-SemiBold', fontSize: 12, color: '#94A3B8' },
    assetValueContainer: { alignItems: 'flex-end' },
    assetValue: { fontFamily: 'Poppins-Black' },
    deleteAction: { backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 75, height: '90%', borderRadius: 15, marginLeft: 10 },
    marketTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    liveIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    proTickerItem: { width: 160, padding: 18, borderRadius: 24, marginRight: 15, borderWidth: 1 },
    tickerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    tickerNameText: { fontFamily: 'Poppins-Bold', fontSize: 11, color: '#94A3B8' },
    tickerChangeText: { fontFamily: 'Poppins-Black', fontSize: 12 },
    tickerPriceText: { fontFamily: 'Poppins-Bold', fontSize: 18 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'flex-end' },
    modalCard: { borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 28, paddingTop: 12 },
    modalHeader: { alignItems: 'center', paddingBottom: 20 },
    modalHandle: { width: 40, height: 5, borderRadius: 2.5, marginBottom: 20 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
    modalTitle: { fontFamily: 'Poppins-Black', fontSize: 22 },
    inputGroup: { marginBottom: 22 },
    premiumLabel: { fontFamily: 'Poppins-Bold', fontSize: 10, letterSpacing: 1.5, color: '#94A3B8' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 15, height: 56, borderWidth: 1 },
    premiumInput: { flex: 1, fontFamily: 'Poppins-Medium', fontSize: 15 },
    saveBtnWrapper: { borderRadius: 22, overflow: 'hidden', marginTop: 10 },
    saveBtnGradient: { height: 60, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
    saveBtnText: { fontFamily: 'Poppins-Black', fontSize: 17, color: '#FFF' },
    emptyContainer: { alignItems: 'center', paddingVertical: 40, borderRadius: 25, borderStyle: 'dashed', borderWidth: 2 },
    toggleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
    liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    headerCloseIcon: { position: 'absolute', right: 0 },
    addNewGoalListBtn: { width: '100%', height: 60, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 20 },
    addNewGoalListText: { fontFamily: 'Poppins-Bold', fontSize: 14, marginLeft: 8 },
    goalCardIsolated: { padding: 20, borderRadius: 24, borderWidth: 1.5, marginBottom: 15 },
    goalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    goalIconWrapper: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    goalTextContainer: { flex: 1, marginLeft: 15 },
    goalTitle: { fontFamily: 'Poppins-Bold', fontSize: 16 },
    goalProgressBarBg: { width: '100%', height: 12, borderRadius: 6, marginTop: 20, overflow: 'hidden' },
    goalProgressBarFill: { height: '100%', borderRadius: 6 },
    giantInputContainer: { alignItems: 'center', marginBottom: 30 },
    giantInputWrapper: { flexDirection: 'row', alignItems: 'center' },
    giantCurrency: { fontFamily: 'Poppins-Bold', fontSize: 32 },
    giantInput: { fontFamily: 'Poppins-Black', fontSize: 44, textAlign: 'center', minWidth: 100 },
    minimalInputBox: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
    minimalInput: { fontFamily: 'Poppins-Medium', fontSize: 16 },
    premiumSheet: {
        width: '100%',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 25,
        paddingTop: 10,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    sheetHandle: {
        width: 50,
        height: 5,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginVertical: 15,
        opacity: 0.5,
    },
    closeHeaderBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
        padding: 5,
    },
    sheetTitle: {
        fontFamily: 'Poppins-Black',
        fontSize: 22,
        marginBottom: 25,
        textAlign: 'center',
    },
    modernInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 60,
        borderRadius: 20,
        borderWidth: 1.5,
        overflow: 'hidden',
        marginTop: 5,
    },
    inputIconBox: {
        width: 50,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.1)',
    },
    actionBtn: {
        marginTop: 10,
        height: 65,
        borderRadius: 22,
        overflow: 'hidden',
    },
    btnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    btnText: {
        fontFamily: 'Poppins-Black',
        color: '#FFFFFF',
        fontSize: 17,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    goalHeroCard: {
        borderRadius: 28,
        paddingVertical: 26,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderWidth: 1.5,
        overflow: 'hidden',
        marginTop: 6,
        marginBottom: 28,
    },
    heroIconCircle: {
        width: 78,
        height: 78,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 18,
    },
    heroLabel: {
        fontFamily: 'Poppins-Bold',
        fontSize: 10,
        letterSpacing: 2.2,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    heroName: {
        fontFamily: 'Poppins-Black',
        fontSize: 22,
        letterSpacing: -0.5,
        marginBottom: 6,
        textAlign: 'center',
    },
    heroAmount: {
        fontFamily: 'Poppins-Black',
        fontSize: 30,
        letterSpacing: -1,
    },
    heroProgressRow: {
        width: '100%',
        marginTop: 18,
    },
    heroProgressBg: {
        width: '100%',
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    heroProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    heroProgressText: {
        fontFamily: 'Poppins-Medium',
        fontSize: 11,
        marginTop: 10,
        textAlign: 'center',
        letterSpacing: 0.2,
    },
    chipScroll: {
        marginTop: 12,
        marginLeft: -2,
    },
    suggestionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    suggestionChipText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 12,
        marginLeft: 6,
    },
    amountChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        marginRight: 8,
    },
    amountChipText: {
        fontFamily: 'Poppins-Bold',
        fontSize: 12,
        letterSpacing: 0.3,
    },
    inputIconCurrency: {
        fontFamily: 'Poppins-Black',
        fontSize: 22,
    },
    actionBtnDisabled: {
        opacity: 0.4,
    },
    assetHeroCompact: {
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderWidth: 1,
        overflow: 'hidden',
        marginTop: 6,
        marginBottom: 16,
    },
    heroCompactRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    heroCompactIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    heroCompactText: {
        flex: 1,
        marginLeft: 12,
    },
    heroCompactName: {
        fontFamily: 'Poppins-Black',
        fontSize: 16,
        letterSpacing: -0.3,
    },
    heroCompactPrice: {
        fontFamily: 'Poppins-Bold',
        fontSize: 12.5,
        marginTop: 2,
        letterSpacing: -0.1,
    },
    heroCompactUnit: {
        fontFamily: 'Poppins-Medium',
        fontSize: 10,
    },
    heroCompactSub: {
        fontFamily: 'Poppins-Bold',
        fontSize: 9.5,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        marginTop: 3,
    },
    liveDotMini: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    heroEstimateInline: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    heroEstimateInlineLabel: {
        fontFamily: 'Poppins-Bold',
        fontSize: 9,
        letterSpacing: 1.4,
    },
    heroEstimateInlineValue: {
        fontFamily: 'Poppins-Black',
        fontSize: 15,
        letterSpacing: -0.3,
    },
    popularChipsScroll: {
        marginBottom: 16,
    },
    assetSuggestionChipMini: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: 13,
        borderWidth: 1,
        marginRight: 7,
    },
    assetSuggestionChipTextMini: {
        fontFamily: 'Poppins-Black',
        fontSize: 11,
        marginLeft: 5,
        letterSpacing: 0.3,
    },
    twoColRow: {
        flexDirection: 'row',
        marginBottom: 14,
    },
    inputGroupCompact: {
        marginBottom: 14,
    },
    premiumLabelMini: {
        fontFamily: 'Poppins-Bold',
        fontSize: 9,
        letterSpacing: 1.3,
        textTransform: 'uppercase',
        marginBottom: 6,
        marginLeft: 3,
    },
    compactInput: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 46,
        borderRadius: 13,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    premiumInputMini: {
        flex: 1,
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },
    chipScrollTight: {
        marginTop: 10,
    },
    amountChipMini: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        marginRight: 6,
    },
    amountChipTextMini: {
        fontFamily: 'Poppins-Bold',
        fontSize: 11,
        letterSpacing: 0.2,
    },
    actionBtnCompact: {
        marginTop: 6,
        height: 50,
        borderRadius: 16,
        overflow: 'hidden',
    },
    btnTextMini: {
        fontFamily: 'Poppins-Black',
        color: '#FFFFFF',
        fontSize: 14,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
});

export default Vault;