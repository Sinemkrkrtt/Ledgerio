import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Animated, Image, Dimensions, StatusBar, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

const Splash = ({ navigation }) => {
    const [language, setLanguage] = useState('tr'); 
    
    const logoScale = useRef(new Animated.Value(0.1)).current; 
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loadLanguage = async () => {
            try {
                const savedLang = await AsyncStorage.getItem('appLanguage');
                if (savedLang) setLanguage(savedLang);
            } catch (error) {
                console.error("Dil yükleme hatası:", error);
            }
        };
        loadLanguage();

        Animated.sequence([
            Animated.parallel([
                Animated.spring(logoScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
                Animated.timing(logoOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
            ]),
            Animated.timing(textOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]).start();

        let didNavigate = false;
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (didNavigate) return;
            didNavigate = true;

            const goTo = async (route) => {
                setTimeout(() => navigation.replace(route), 4500);
            };

            if (!user) {
                // Oturum yok → Login'e gönder ve cache'i temizle
                await AsyncStorage.multiRemove(['userName', 'userId']).catch(() => {});
                goTo('Login');
                return;
            }

            let name = user.displayName;
            if (!name) {
                try {
                    const snap = await getDoc(doc(db, 'users', user.uid));
                    if (snap.exists()) name = snap.data().name;
                } catch (e) { /* sessizce geç */ }
            }
            if (!name && user.email) name = user.email.split('@')[0];
            if (!name) name = 'Kullanıcı';

            await AsyncStorage.setItem('userId', user.uid);
            await AsyncStorage.setItem('userName', name);

            goTo('Main');
        });

        return () => unsubscribe();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar hidden={true} />
            <Animated.View style={[styles.logoWrapper, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
                <Image 
                    source={require('../../assets/StartPage.png')} 
                    style={styles.logoImage}
                    resizeMode="contain" 
                />
            </Animated.View>
            <Animated.View style={[styles.textWrapper, { opacity: textOpacity }]}>
                <Text style={styles.brandTitle}>LEDGERIO</Text>
                <View style={styles.separator} />
                <Text style={styles.tagline}>
                    {/* 🚀 SLOGAN DİLE GÖRE DEĞİŞİYOR */}
                    {language === 'tr' 
                        ? 'Finansal geleceğinizi şeffaflıkla yönetin.' 
                        : 'Manage your financial future with transparency.'}
                </Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoWrapper: {
        marginBottom: 30, 
        shadowColor: '#09F8F0',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 25,
        elevation: 15,
    },
    logoImage: {
        width: Dimensions.get('window').width * 1.85,
        height: Dimensions.get('window').width * 1.85,
    },
    textWrapper: {
        alignItems: 'center',
        position: 'absolute',
        bottom: 60,
    },
    brandTitle: {
        fontFamily: 'Poppins-Black', 
        fontSize: 34,
        color: '#FFFFFF',
        letterSpacing: 8, 
        textAlign: 'center',
    },
    separator: {
        width: 50,
        height: 3,
        backgroundColor: '#09F8F0',
        marginVertical: 12,
        borderRadius: 2,
    },
    tagline: {
        fontFamily: 'Poppins-Medium', 
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
        letterSpacing: 1.5,
        textAlign: 'center',
        paddingHorizontal: 30,
    },
});

export default Splash;