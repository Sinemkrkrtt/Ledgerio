import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, StatusBar,
    useWindowDimensions, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth } from '../../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Image } from 'expo-image';

const Login = ({ navigation }) => {
    const [language, setLanguage] = useState('tr');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focusField, setFocusField] = useState(null);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const contentMaxWidth = isTablet ? 440 : '100%'; 

    useEffect(() => {
        const loadLanguage = async () => {
            const savedLang = await AsyncStorage.getItem('appLanguage');
            if (savedLang) setLanguage(savedLang);
        };
        loadLanguage();
    }, []);

    const t = {
        alertEmpty: language === 'tr' ? 'Lütfen tüm alanları eksiksiz doldurun!' : 'Please fill in all fields completely!',
        alertFailed: language === 'tr' ? 'Giriş başarısız!' : 'Login failed!',
        invalidCreds: language === 'tr' ? 'E-posta veya şifre hatalı!' : 'Invalid email or password!',
        tooManyReq: language === 'tr' ? 'Çok fazla deneme yaptınız. Lütfen bekleyin.' : 'Too many attempts. Please try again later.',
        title: language === 'tr' ? 'Tekrar Hoş Geldin' : 'Welcome Back',
        subtitle: language === 'tr' ? 'Finansal kontrolüne devam etmek için giriş yap.' : 'Log in to continue your financial control.',
        emailPlace: language === 'tr' ? 'E-posta adresi' : 'Email address',
        passPlace: language === 'tr' ? 'Şifre' : 'Password',
        loginBtn: language === 'tr' ? 'Giriş Yap' : 'Log In',
        noAccount: language === 'tr' ? 'Hesabın yok mu?' : "Don't have an account?",
        register: language === 'tr' ? 'Kayıt Ol' : 'Sign Up',
        emailLabel: language === 'tr' ? 'E-POSTA' : 'EMAIL',
        passLabel: language === 'tr' ? 'ŞİFRE' : 'PASSWORD',
    };

    const handleLogin = async () => {
        if (!email || !password) { alert(t.alertEmpty); return; }
        setLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            const user = userCredential.user;
            await AsyncStorage.setItem('userId', user.uid);
            await AsyncStorage.setItem('userName', user.displayName || user.email.split('@')[0]);
            navigation.replace('Main');
        } catch (error) {
            if (
                error.code === 'auth/invalid-credential' ||
                error.code === 'auth/user-not-found' ||
                error.code === 'auth/wrong-password' ||
                error.code === 'auth/invalid-email'
            ) {
                alert(t.invalidCreds);
            } else if (error.code === 'auth/too-many-requests') {
                alert(t.tooManyReq);
            } else if (error.code === 'auth/network-request-failed') {
                alert(language === 'tr' ? 'İnternet bağlantısı yok!' : 'No internet connection!');
            } else {
                console.warn("Beklenmedik giriş hatası:", error.code);
                alert(t.alertFailed);
            }
        } finally {
            setLoading(false);
        }
    };

    const accent = '#09F8F0';
    const accentBorder = (active) => active ? accent : 'rgba(255, 255, 255, 0.08)';

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor="#020617" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                >
                    <View style={[
                        styles.innerWrapper, 
                        { maxWidth: contentMaxWidth },
                        isTablet && styles.tabletCard
                    ]}>
                        {!keyboardVisible && (
                            <View style={styles.heroSection}>
                                <View style={styles.logoCircle}>
                                    <Image
    source={require('../../assets/icon.png')}
    style={styles.logoImg}
    contentFit="cover" 
    transition={200} 
/>
                                </View>
                                <Text style={styles.brand}>LEDGERIO</Text>
                                <View style={styles.brandSeparator} />
                            </View>
                        )}

                        {/* WELCOME */}
                        <View style={styles.titleSection}>
                            <Text style={styles.title}>{t.title}</Text>
                            <Text style={styles.subtitle}>{t.subtitle}</Text>
                        </View>

                        {/* FORM */}
                        <View style={styles.form}>
                            {/* E-posta */}
                            <Text style={styles.fieldLabel}>{t.emailLabel}</Text>
                            <View style={[styles.inputWrapper, { borderColor: accentBorder(focusField === 'email') }]}>
                                <View style={styles.iconBox}>
                                    <Ionicons name="mail-outline" size={18} color={accent} />
                                </View>
                                <TextInput
                                    placeholder={t.emailPlace}
                                    placeholderTextColor="#475569"
                                    style={styles.input}
                                    value={email}
                                    onChangeText={setEmail}
                                    onFocus={() => setFocusField('email')}
                                    onBlur={() => setFocusField(null)}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    autoComplete="email"
                                    cursorColor={accent}
                                />
                            </View>

                            {/* Şifre */}
                            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{t.passLabel}</Text>
                            <View style={[styles.inputWrapper, { borderColor: accentBorder(focusField === 'password') }]}>
                                <View style={styles.iconBox}>
                                    <Ionicons name="lock-closed-outline" size={18} color={accent} />
                                </View>
                                <TextInput
                                    placeholder={t.passPlace}
                                    placeholderTextColor="#475569"
                                    style={styles.input}
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                    onFocus={() => setFocusField('password')}
                                    onBlur={() => setFocusField(null)}
                                    autoCapitalize="none"
                                    cursorColor={accent}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(v => !v)}
                                    style={styles.eyeBtn}
                                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                >
                                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            {/* CTA */}
                            <TouchableOpacity
                                style={[styles.btn, loading && { opacity: 0.7 }]}
                                onPress={handleLogin}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={['#09F8F0', '#0891B2']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={styles.btnGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Text style={styles.btnText}>{t.loginBtn}</Text>
                                            <Ionicons name="arrow-forward" size={18} color="#020617" style={{ marginLeft: 8 }} />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* 🌟 YENİ ALT MENÜ (Kayıt Ol & Misafir Girişi Yan Yana) */}
                            <View style={styles.footerRow}>
                                <TouchableOpacity 
                                    onPress={() => navigation.navigate('Register')} 
                                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                >
                                    <Text style={styles.footerText}>{t.register}</Text>
                                </TouchableOpacity>

                                <View style={styles.footerDivider} />

                                <TouchableOpacity 
                                    style={styles.guestLink}
                                    onPress={() => navigation.replace('Main')} 
                                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                >
                                    <Ionicons name="compass-outline" size={16} color="#09F8F0" style={{ marginRight: 4 }} />
                                    <Text style={styles.footerTextAccent}>
                                        {language === 'tr' ? 'Misafir Girişi' : 'Guest Login'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#020617' }, 
    container: { flex: 1 },
    
    scroll: { 
        flexGrow: 1, 
        justifyContent: 'center', 
        paddingHorizontal: 24, 
        paddingVertical: 30 
    },

    innerWrapper: {
        width: '100%',
        alignSelf: 'center',
    },

    tabletCard: {
        backgroundColor: '#0F172A', 
        padding: 40,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
        elevation: 15,
    },

    // --- HERO ---
    heroSection: {
        alignItems: 'center',
        marginBottom: 28,
    },
    logoCircle: {
        width: 150, 
        height: 150, 
        borderRadius: 32, 
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(9, 248, 240, 0.15)',
        backgroundColor: 'transparent',
        shadowColor: '#09F8F0',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    logoImg: {
        width: '100%',
        height: '100%',
    },
    brand: {
        fontFamily: 'Poppins-Black',
        fontSize: 22, 
        color: '#F8FAFC',
        letterSpacing: 6,
        marginTop: 18,
    },
    brandSeparator: {
        width: 32,
        height: 3,
        backgroundColor: '#09F8F0',
        marginTop: 8,
        borderRadius: 2,
        opacity: 0.8,
    },

    // --- WELCOME ---
    titleSection: {
        alignItems: 'center',
        marginBottom: 25,
    },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 26,
        color: '#F8FAFC',
        textAlign: 'center',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    subtitle: {
        fontFamily: 'Poppins-Medium',
        fontSize: 14,
        color: '#64748B', 
        textAlign: 'center',
        lineHeight: 22,
    },

    // --- FORM ---
    form: { width: '100%' },
    fieldLabel: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 11,
        color: '#94A3B8',
        letterSpacing: 1.2,
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        backgroundColor: '#0F172A', 
        borderRadius: 16,
        paddingHorizontal: 8,
        borderWidth: 1.5,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(9, 248, 240, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontFamily: 'Poppins-Medium',
        color: '#F8FAFC',
        fontSize: 15,
        height: '100%',
        letterSpacing: 0.5,
    },
    eyeBtn: {
        paddingHorizontal: 12,
        height: '100%',
        justifyContent: 'center',
    },

    // --- BUTON ---
    btn: {
        height: 56,
        marginTop: 32,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#09F8F0',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    btnGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        fontFamily: 'Poppins-Bold',
        color: '#020617', 
        fontSize: 15,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },

    // --- YENİ ALT MENÜ (FOOTER) ---
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 36,
    },
    footerText: {
        fontFamily: 'Poppins-Medium',
        color: '#94A3B8', 
        fontSize: 14,
        letterSpacing: 0.5,
    },
    footerDivider: {
        width: 1.5,
        height: 14,
        backgroundColor: '#334155', 
        marginHorizontal: 16,
    },
    guestLink: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerTextAccent: {
        fontFamily: 'Poppins-SemiBold',
        color: '#09F8F0', 
        fontSize: 14,
        letterSpacing: 0.5,
    },
});

export default Login;