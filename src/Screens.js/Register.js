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
import { Image } from 'expo-image';

import { auth, db } from '../../firebaseConfig';
import { createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const Register = ({ navigation }) => {
    const [language, setLanguage] = useState('tr');

    const [name, setName] = useState('');
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
        title: language === 'tr' ? 'Hesap Oluştur' : 'Create Account',
        subtitle: language === 'tr' ? 'Ledgerio ailesine katıl ve portföyünü yönet.' : 'Join the Ledgerio family and manage your portfolio.',
        namePlace: language === 'tr' ? 'Adın ve soyadın' : 'Full name',
        emailPlace: language === 'tr' ? 'E-posta adresi' : 'Email address',
        passPlace: language === 'tr' ? 'Şifre (en az 8 karakter)' : 'Password (min 8 chars)',
        nameLabel: language === 'tr' ? 'AD SOYAD' : 'FULL NAME',
        emailLabel: language === 'tr' ? 'E-POSTA' : 'EMAIL',
        passLabel: language === 'tr' ? 'ŞİFRE' : 'PASSWORD',
        veryWeak: language === 'tr' ? 'Çok Zayıf' : 'Very Weak',
        weak: language === 'tr' ? 'Zayıf' : 'Weak',
        medium: language === 'tr' ? 'Orta' : 'Medium',
        strong: language === 'tr' ? 'Güçlü' : 'Strong',
        errEmpty: language === 'tr' ? 'Tüm alanlar doldurulmalıdır.' : 'All fields must be filled.',
        errEmail: language === 'tr' ? 'Geçerli bir e-posta giriniz.' : 'Please enter a valid email.',
        errPass: language === 'tr' ? 'Şifreniz en az 8 karakter olmalıdır.' : 'Password must be at least 8 characters.',
        errFail: language === 'tr' ? 'Kayıt başarısız.' : 'Registration failed.',
        errInUse: language === 'tr' ? 'Bu e-posta adresi zaten kullanılıyor.' : 'This email address is already in use.',
        btnReg: language === 'tr' ? 'Kayıt Ol' : 'Sign Up',
        hasAcc: language === 'tr' ? 'Zaten hesabın var mı?' : 'Already have an account?',
        login: language === 'tr' ? 'Giriş Yap' : 'Log In',
    };

    const getPasswordStrength = () => {
        if (password.length === 0) return { score: 0, label: '', color: '#334155' };
        if (password.length < 6) return { score: 1, label: t.veryWeak, color: '#F43F5E' };
        if (password.length < 8) return { score: 2, label: t.weak, color: '#F59E0B' };
        const hasNumbers = /\d/.test(password);
        const hasLetters = /[a-zA-Z]/.test(password);
        const hasSpecial = /[^a-zA-Z0-9]/.test(password);
        if (hasNumbers && hasLetters && hasSpecial && password.length >= 10) return { score: 4, label: t.strong, color: '#10B981' };
        if (hasNumbers && hasLetters) return { score: 3, label: t.medium, color: '#0EA5E9' };
        return { score: 2, label: t.weak, color: '#F59E0B' };
    };
    const strength = getPasswordStrength();

    const handleRegister = async () => {
        if (!name || !email || !password) { alert(t.errEmpty); return; }
        if (!email.includes('@')) { alert(t.errEmail); return; }
        if (password.length < 8) { alert(t.errPass); return; }

        setLoading(true);

        try {
            if (auth.currentUser) await signOut(auth);
            await AsyncStorage.multiRemove(['userName', 'userId']).catch(() => {});
        } catch (e) { /* sessiz */ }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: name.trim() });

            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name: name.trim(),
                email: email.trim().toLowerCase(),
                totalBalance: 0,
                createdAt: serverTimestamp(),
            });

            await AsyncStorage.setItem('userName', name.trim());
            await AsyncStorage.setItem('userId', user.uid);
            navigation.replace('Main');
        } catch (error) {
            try { if (auth.currentUser) await signOut(auth); } catch (e) {}
            await AsyncStorage.multiRemove(['userName', 'userId']).catch(() => {});

            if (error.code === 'auth/email-already-in-use') {
                alert(t.errInUse);
            } else if (error.code === 'auth/invalid-email') {
                alert(t.errEmail);
            } else if (error.code === 'auth/weak-password') {
                alert(t.errPass);
            } else if (error.code === 'auth/network-request-failed') {
                alert(language === 'tr' ? 'İnternet bağlantısı yok!' : 'No internet connection!');
            } else if (error.code === 'permission-denied') {
                alert(language === 'tr' ? 'Firestore izinleri engelliyor.' : 'Firestore rules denied access.');
            } else {
                console.warn("Beklenmedik kayıt hatası:", error.code);
                alert(t.errFail);
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

                        {/* 🌟 HERO */}
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

                        <View style={styles.titleSection}>
                            <Text style={styles.title}>{t.title}</Text>
                            <Text style={styles.subtitle}>{t.subtitle}</Text>
                        </View>

                        <View style={styles.form}>
                            {/* Ad Soyad */}
                            <Text style={styles.fieldLabel}>{t.nameLabel}</Text>
                            <View style={[styles.inputWrapper, { borderColor: accentBorder(focusField === 'name') }]}>
                                <View style={styles.iconBox}>
                                    <Ionicons name="person-outline" size={18} color={accent} />
                                </View>
                                <TextInput
                                    placeholder={t.namePlace}
                                    placeholderTextColor="#475569"
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    onFocus={() => setFocusField('name')}
                                    onBlur={() => setFocusField(null)}
                                    autoComplete="name"
                                    cursorColor={accent}
                                />
                            </View>

                            {/* E-posta */}
                            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>{t.emailLabel}</Text>
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
                            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>{t.passLabel}</Text>
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

                            {/* Şifre Güç Göstergesi */}
                            {password.length > 0 && (
                                <View style={styles.strengthRow}>
                                    <View style={styles.strengthBars}>
                                        {[1, 2, 3, 4].map((seg) => (
                                            <View
                                                key={seg}
                                                style={[
                                                    styles.strengthSeg,
                                                    {
                                                        backgroundColor: seg <= strength.score ? strength.color : 'rgba(255, 255, 255, 0.05)',
                                                    }
                                                ]}
                                            />
                                        ))}
                                    </View>
                                    <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                                </View>
                            )}

                            {/* CTA */}
                            <TouchableOpacity
                                style={[styles.btn, loading && { opacity: 0.7 }]}
                                onPress={handleRegister}
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
                                            <Text style={styles.btnText}>{t.btnReg}</Text>
                                            <Ionicons name="arrow-forward" size={18} color="#020617" style={{ marginLeft: 8 }} />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* 🌟 YENİ ALT MENÜ (Giriş Yap & Misafir Girişi Yan Yana) */}
                            <View style={styles.footerRow}>
                                <TouchableOpacity 
                                    onPress={() => navigation.navigate('Login')} 
                                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                >
                                    <Text style={styles.footerText}>{t.login}</Text>
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
        marginBottom: 20,
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
        marginTop: 10,
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
        marginBottom: 10,
    },
    title: {
        fontFamily: 'Poppins-Bold',
        fontSize: 24,
        color: '#F8FAFC',
        textAlign: 'center',
        letterSpacing: -0.5,
        marginBottom: 6,
        marginTop: 0,
    },
    subtitle: {
        fontFamily: 'Poppins-Medium',
        fontSize: 13,
        color: '#64748B', 
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 7,
    },

    // --- FORM ---
    form: { width: '100%' },
    fieldLabel: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 11,
        color: '#94A3B8',
        letterSpacing: 1.2,
        marginBottom: 3,
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

    // --- ŞİFRE GÜÇ ---
    strengthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingHorizontal: 6,
    },
    strengthBars: {
        flexDirection: 'row',
        flex: 1,
        gap: 6,
    },
    strengthSeg: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    strengthLabel: {
        fontFamily: 'Poppins-Bold',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 12,
        minWidth: 60,
        textAlign: 'right',
    },

    // --- BUTON ---
    btn: {
        height: 54,
        marginTop: 28,
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
        marginTop: 32, // Kayıt butonundan uzaklık
    },
    footerText: {
        fontFamily: 'Poppins-Medium',
        color: '#94A3B8', // Daha pasif, şık bir gri (Giriş Yap için)
        fontSize: 14,
        letterSpacing: 0.5,
    },
    footerDivider: {
        width: 1.5,
        height: 14,
        backgroundColor: '#334155', // İki seçenek arasına koyu/zarif bir ayırıcı çizgi
        marginHorizontal: 16,
    },
    guestLink: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerTextAccent: {
        fontFamily: 'Poppins-SemiBold',
        color: '#09F8F0', // Misafir yazısı
        fontSize: 14,
        letterSpacing: 0.5,
    },
});

export default Register;