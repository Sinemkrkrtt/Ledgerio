import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch,
  Alert, ActivityIndicator, Modal, TextInput, Linking, Platform,
  KeyboardAvoidingView, useWindowDimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { deleteUser, signOut } from 'firebase/auth';
import { deleteDoc, doc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

const Settings = () => {
  const navigation = useNavigation();
  const { isDarkMode, toggleTheme, language, changeLanguage } = useTheme();
  
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;


  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isGuest, setIsGuest] = useState(false); 
  const [isDeleting, setIsDeleting] = useState(false);


  const [langModalVisible, setLangModalVisible] = useState(false);
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);


  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isPwdLoading, setIsPwdLoading] = useState(false);


  const themeAccent = isDarkMode ? '#09F8F0' : '#040E68';
  const themeBackground = isDarkMode ? '#0F172A' : '#F4F7F9';
  const themeText = isDarkMode ? '#F8FAFC' : '#0F172A';
  const themeCard = isDarkMode ? '#1E293B' : '#FFFFFF';
  const themeSubText = isDarkMode ? '#94A3B8' : '#64748B';
  const themeBorder = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';
  const themeShadow = isDarkMode ? '#000000' : '#94A3B8';

  const cardShadowStyle = {
    shadowColor: themeShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDarkMode ? 0.3 : 0.06,
    shadowRadius: 15,
    elevation: isDarkMode ? 8 : 4,
  };

  useEffect(() => {
    const loadUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        setUserName(user.displayName || (language === 'tr' ? "Kullanıcı" : "User"));
        setUserEmail(user.email);
        setIsGuest(false);
      } else {
        setUserName(language === 'tr' ? "Misafir" : "Guest");
        setUserEmail(language === 'tr' ? "Kayıtlı hesap yok" : "No registered account");
        setIsGuest(true);
      }
    };
    loadUserData();
  }, [language]);

  const handleLanguageChange = async (selectedLang) => {
    await changeLanguage(selectedLang);
    setLangModalVisible(false);
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) {
        Alert.alert("Hata", language === 'tr' ? "Lütfen tüm alanları doldurun." : "Please fill in all fields.");
        return;
    }
    try {
        setIsPwdLoading(true);
        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, oldPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        
        setIsPwdLoading(false);
        setPwdModalVisible(false);
        setOldPassword('');
        setNewPassword('');
        Alert.alert(language === 'tr' ? "Başarılı" : "Success", language === 'tr' ? "Şifreniz güncellendi." : "Password updated.");
    } catch (error) {
        setIsPwdLoading(false);
        Alert.alert("Hata", language === 'tr' ? "Eski şifre hatalı veya yeni şifre çok zayıf." : "Wrong old password or weak new password.");
    }
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:ledgerio.destek@gmail.com?subject=Ledgerio%20Destek%20Talebi');
  };

  const handleLogout = async () => {
    if (isGuest) {
        navigation.replace('Login');
        return;
    }

    Alert.alert(
        language === 'tr' ? "Oturumu Kapat" : "Logout",
        language === 'tr' ? "Çıkış yapmak istediğine emin misin?" : "Are you sure you want to log out?",
    [
      { text: language === 'tr' ? "Vazgeç" : "Cancel", style: "cancel" },
      { text: language === 'tr' ? "Evet" : "Yes", onPress: async () => {
          try { await signOut(auth); } catch (e) {}
          await AsyncStorage.multiRemove(['userName', 'userId']);
          navigation.replace('Login');
      }}
    ]);
  };
  const deleteUserDocsInCollection = async (collectionName, userId) => {
    const q = query(collection(db, collectionName), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;
    const batches = [];
    let batch = writeBatch(db);
    let counter = 0;
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
      counter++;
      if (counter % 500 === 0) {
        batches.push(batch);
        batch = writeBatch(db);
      }
    });
    batches.push(batch);
    await Promise.all(batches.map(b => b.commit()));
    return counter;
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "⚠️ " + (language === 'tr' ? "HESABI SİL" : "DELETE ACCOUNT"),
      language === 'tr'
        ? "Bu işlem GERİ ALINAMAZ. Tüm işlemlerin, varlıkların, hedeflerin ve hesabın kalıcı olarak silinecek. Devam etmek istiyor musun?"
        : "This action CANNOT be undone. All your transactions, assets, goals and account will be permanently deleted. Continue?",
      [
        { text: language === 'tr' ? "Vazgeç" : "Cancel", style: "cancel" },
        {
          text: language === 'tr' ? "Hesabımı Sil" : "Delete My Account",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) {
              Alert.alert(
                language === 'tr' ? "Oturum Yok" : "Not Signed In",
                language === 'tr' ? "Önce tekrar giriş yapman gerekiyor." : "Please sign in again."
              );
              return;
            }
            const userId = user.uid;

            try {
              setIsDeleting(true);
              await deleteUserDocsInCollection('transactions', userId);
              await deleteUserDocsInCollection('recurring_expenses', userId);
              await deleteUserDocsInCollection('assets', userId);
              await deleteUserDocsInCollection('goals', userId);
              await deleteDoc(doc(db, 'users', userId)).catch(() => {});
              await deleteUser(user);
              await AsyncStorage.clear();

              setIsDeleting(false);
              Alert.alert(
                language === 'tr' ? "Hesap Silindi" : "Account Deleted",
                language === 'tr' ? "Hesabın ve tüm verilerin kalıcı olarak silindi." : "Your account and all data have been permanently deleted."
              );
              navigation.replace('Login');

            } catch (error) {
              setIsDeleting(false);
              if (error.code === 'auth/requires-recent-login') {
                try { await signOut(auth); } catch (e) {}
                await AsyncStorage.multiRemove(['userName', 'userId']).catch(() => {});
                Alert.alert(
                  language === 'tr' ? "Güvenlik Onayı Gerekli" : "Security Confirmation Required",
                  language === 'tr'
                    ? "Hesap silme hassas bir işlem olduğu için yakın zamanda giriş yapmış olman gerekiyor. Tekrar giriş yapıp hesabını silebilirsin."
                    : "Account deletion requires recent authentication. Please sign in again and then delete your account.",
                  [{ text: 'OK', onPress: () => navigation.replace('Login') }]
                );
              } else if (error.code === 'auth/network-request-failed') {
                Alert.alert(
                  language === 'tr' ? "Bağlantı Hatası" : "Connection Error",
                  language === 'tr' ? "İnternet bağlantını kontrol edip tekrar dene." : "Check your connection and try again."
                );
              } else {
                console.warn('Hesap silme hatası:', error.code);
                Alert.alert(
                  language === 'tr' ? "Hata" : "Error",
                  language === 'tr'
                    ? `Hesap silinemedi. (${error.code || 'bilinmeyen'})`
                    : `Could not delete account. (${error.code || 'unknown'})`
                );
              }
            }
          }
        }
      ]
    );
  };

  const SettingItem = ({ icon, label, value, onPress, type = 'chevron', color = themeText, iconColor = themeAccent }) => (
    <TouchableOpacity 
        style={[styles.item, { borderBottomColor: themeBorder, paddingVertical: isTablet ? 24 : 16 }]} 
        onPress={onPress}
        disabled={type === 'switch' || type === 'info'} 
        activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: iconColor + '15', width: isTablet ? 54 : 40, height: isTablet ? 54 : 40, borderRadius: isTablet ? 18 : 14 }]}>
        <Ionicons name={icon} size={isTablet ? 26 : 20} color={iconColor} />
      </View>
      <Text style={[styles.label, { color: color, fontSize: isTablet ? 20 : 15 }]}>{label}</Text>
      
      {(type === 'chevron' || type === 'info') && (
        <View style={styles.rightSide}>
          <Text style={[styles.valueText, { color: themeSubText, fontSize: isTablet ? 18 : 13 }]}>{value}</Text>
          {type === 'chevron' && <Ionicons name="chevron-forward" size={isTablet ? 22 : 16} color={themeSubText} />}
        </View>
      )}
      
      {type === 'switch' && (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: isDarkMode ? '#334155' : '#CBD5E1', true: themeAccent }}
          thumbColor="#FFFFFF"
          style={isTablet && { transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] }}
        />
      )}
    </TouchableOpacity>
  );

  const headerColor = isDarkMode ? '#FFFFFF' : '#000000';

  const privacyTextTR = `Ledgerio olarak gizliliğinize en üst düzeyde önem veriyoruz. Bu Gizlilik Politikası, uygulamamızı kullanırken kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.\n\n1. Veri Toplama ve Kullanım\nUygulamamız, size daha iyi bir finansal deneyim sunabilmek amacıyla yalnızca belirttiğiniz harcama, gelir, varlık ve hedef verilerini toplar. Bu veriler, tamamen size özel yapay zeka analizleri (AI Danışman) üretmek, akıllı grafikler sunmak ve finansal projeksiyonlar yapmak için kullanılır.\n\n2. Veri Güvenliği ve Şifreleme\nTüm finansal verileriniz ve kişisel bilgileriniz, endüstri standardı olan AES-256 bit modern şifreleme teknolojileri ile korunmaktadır. Sunucularımızda tutulan veriler, yetkisiz erişimlere ve siber saldırılara karşı sıkı güvenlik duvarlarıyla izole edilmiştir. Veri ihlallerini önlemek adına altyapımız düzenli olarak denetlenmektedir.\n\n3. Üçüncü Taraf Paylaşımı\nKişisel bilgileriniz, harcama alışkanlıklarınız veya portföy verileriniz KESİNLİKLE reklam verenlerle, pazarlama şirketleriyle veya yetkisiz üçüncü şahıslarla paylaşılmaz, satılmaz veya takas edilemez. Gizliliğiniz, iş modelimizin temel taşıdır.\n\n4. Cihaz İzinleri (Kamera ve Bildirimler)\nUygulama, yalnızca fiş tarama (Akıllı Tarama OCR) işlemi için kameranıza erişim talep eder. Taranan görseller sunucularımızda saklanmaz, sadece anlık analiz edilir. Bildirim izni ise yalnızca bütçe aşımları ve hedef hatırlatmaları için kullanılır.\n\n5. Kullanıcı Hakları ve Veri Silme\nUygulama içerisindeki "Hesabı Kalıcı Olarak Sil" seçeneğini kullanarak dilediğiniz zaman tüm verilerinizin sistemlerimizden kalıcı ve geri döndürülemez biçimde silinmesini talep edebilirsiniz.`;

  const privacyTextEN = `At Ledgerio, we prioritize your privacy at the highest level. This Privacy Policy explains how your personal data is collected, used, and protected when you use our app.\n\n1. Data Collection and Usage\nTo provide you with a better financial experience, our app only collects the expense, income, asset, and goal data you provide. This data is used exclusively to generate personalized artificial intelligence (AI Advisor) analysis, provide smart charts, and create financial projections.\n\n2. Data Security and Encryption\nAll your financial data and personal information are protected by industry-standard AES-256 bit encryption technologies. Data stored on our servers is isolated by strict firewalls against unauthorized access and cyberattacks. Our infrastructure is regularly audited to prevent data breaches.\n\n3. Third-Party Sharing\nYour personal information, spending habits, or portfolio data are ABSOLUTELY NOT shared, sold, or traded with advertisers, marketing companies, or unauthorized third parties. Your privacy is the cornerstone of our business model.\n\n4. Device Permissions (Camera & Notifications)\nThe app only requests access to your camera for the receipt scanning (Smart Scan OCR) process. Scanned images are not stored on our servers; they are only analyzed instantly. Notification permissions are used strictly for budget overages and goal reminders.\n\n5. User Rights and Data Deletion\nYou can request the permanent and irreversible deletion of all your data from our systems at any time by using the "Delete Account Permanently" option within the application.`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeBackground }]}>
      <View style={[styles.header, isTablet && { paddingHorizontal: 40, height: 80 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={isTablet ? 36 : 26} color={themeText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeText, fontSize: isTablet ? 28 : 20 }]}>{language === 'tr' ? 'Ayarlar' : 'Settings'}</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[
            styles.scrollContent, 
            isTablet && { paddingHorizontal: 60, paddingBottom: 80 } 
        ]}
      >
        <View style={[styles.profileCard, { backgroundColor: themeCard, borderColor: themeBorder, padding: isTablet ? 35 : 20, borderRadius: isTablet ? 35 : 28 }, cardShadowStyle]}>
          <View style={[styles.avatarCircle, { backgroundColor: themeAccent, width: isTablet ? 100 : 64, height: isTablet ? 100 : 64, borderRadius: isTablet ? 35 : 22 }]}>
              <Text style={[styles.avatarText, { fontSize: isTablet ? 44 : 26 }]}>
                  {userName ? userName.charAt(0).toUpperCase() : 'M'}
              </Text>
          </View>
          <View style={[styles.profileInfo, isTablet && { marginLeft: 25 }]}>
              <Text style={[styles.userName, { color: themeText, fontSize: isTablet ? 26 : 18 }]}>{userName}</Text>
              <Text style={[styles.userEmail, { color: themeSubText, fontSize: isTablet ? 18 : 13, marginTop: isTablet ? 6 : 2 }]}>{userEmail}</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: headerColor, fontSize: isTablet ? 15 : 11, marginTop: isTablet ? 45 : 35 }]}>{language === 'tr' ? 'TERCİHLER' : 'PREFERENCES'}</Text>
        <View style={[styles.sectionCard, { backgroundColor: themeCard, borderColor: themeBorder, borderRadius: isTablet ? 32 : 24 }, cardShadowStyle]}>
          <SettingItem icon="moon-outline" label={language === 'tr' ? "Karanlık Mod" : "Dark Mode"} type="switch" value={isDarkMode} onPress={toggleTheme} />
          <SettingItem icon="language-outline" label={language === 'tr' ? "Uygulama Dili" : "App Language"} value={language === 'tr' ? 'Türkçe' : 'English'} onPress={() => setLangModalVisible(true)} />
        </View>

        <Text style={[styles.sectionLabel, { color: headerColor, fontSize: isTablet ? 15 : 11, marginTop: isTablet ? 45 : 35 }]}>{language === 'tr' ? 'GÜVENLİK' : 'SECURITY'}</Text>
        <View style={[styles.sectionCard, { backgroundColor: themeCard, borderColor: themeBorder, borderRadius: isTablet ? 32 : 24 }, cardShadowStyle]}>
          {/* 🌟 Misafir ise Şifre Değiştirme seçeneğini gizle */}
          {!isGuest && (
              <SettingItem icon="lock-closed-outline" label={language === 'tr' ? "Şifre Değiştir" : "Change Password"} onPress={() => setPwdModalVisible(true)} />
          )}
          <SettingItem icon="shield-checkmark-outline" label={language === 'tr' ? "Gizlilik Politikası" : "Privacy Policy"} onPress={() => setPrivacyModalVisible(true)} />
        </View>

        <Text style={[styles.sectionLabel, { color: headerColor, fontSize: isTablet ? 15 : 11, marginTop: isTablet ? 45 : 35 }]}>{language === 'tr' ? 'UYGULAMA' : 'APP'}</Text>
        <View style={[styles.sectionCard, { backgroundColor: themeCard, borderColor: themeBorder, borderRadius: isTablet ? 32 : 24 }, cardShadowStyle]}>
          <SettingItem icon="help-circle-outline" label={language === 'tr' ? "Destek Merkezi" : "Help Center"} onPress={handleEmailSupport} />
          <SettingItem icon="information-circle-outline" label={language === 'tr' ? "Versiyon" : "Version"} value="1.0.0" type="info" />
        </View>

        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)', paddingVertical: isTablet ? 26 : 18, marginTop: isTablet ? 50 : 40, borderRadius: isTablet ? 28 : 20 }]} onPress={handleLogout}>
          <MaterialCommunityIcons name={isGuest ? "login" : "logout"} size={isTablet ? 30 : 22} color="#EF4444" />
          <Text style={[styles.logoutText, { fontSize: isTablet ? 20 : 16 }]}>
              {/* 🌟 Misafir ise Çıkış Yap yerine Giriş Ekranına Dön yazdır */}
              {isGuest ? (language === 'tr' ? "Giriş Ekranına Dön" : "Return to Login") : (language === 'tr' ? "Oturumu Kapat" : "Log Out")}
          </Text>
        </TouchableOpacity>

        {/* 🌟 Misafir ise Hesabı Sil Butonunu Tamamen Gizle */}
        {!isGuest && (
            <TouchableOpacity style={[styles.deleteAccountBtn, isTablet && { marginTop: 35 }]} onPress={handleDeleteAccount} disabled={isDeleting}>
            {isDeleting ? <ActivityIndicator color="#EF4444" size="small" /> : (
                <Text style={[styles.deleteAccountText, { fontSize: isTablet ? 17 : 13 }]}>{language === 'tr' ? "Hesabı Kalıcı Olarak Sil" : "Delete Account Permanently"}</Text>
            )}
            </TouchableOpacity>
        )}

        <Text style={[styles.footerText, { color: themeSubText, fontSize: isTablet ? 14 : 10, marginTop: isTablet ? 45 : 35 }]}>
          Ledgerio Project - 2026 | {language === 'tr' ? "Tüm Hakları Saklıdır." : "All Rights Reserved."}
        </Text>
      </ScrollView>

      {/* 🌟 MODAL 1: DİL SEÇİMİ */}
      <Modal visible={langModalVisible} transparent animationType="slide">
        <View style={[styles.modalOverlay, { justifyContent: isTablet ? 'center' : 'flex-end' }]}>
          <View style={[
              styles.proBottomSheet, 
              { backgroundColor: themeCard }, 
              cardShadowStyle,
              isTablet && { width: 500, alignSelf: 'center', borderRadius: 36, paddingBottom: 25 }
          ]}>
            {!isTablet && <View style={[styles.sheetHandle, { backgroundColor: themeBorder }]} />}
            
            <View style={styles.proSheetHeader}>
                <Ionicons name="language" size={26} color={themeAccent} style={{marginRight: 10}} />
                <Text style={[styles.proSheetTitle, { color: themeText }]}>{language === 'tr' ? 'Dil Seçimi' : 'Language Selection'}</Text>
            </View>
            
            <Text style={[styles.proSheetSubtitle, { color: themeSubText }]}>
                {language === 'tr' ? 'Uygulama deneyiminiz için tercih ettiğiniz dili seçin.' : 'Select your preferred language for the app experience.'}
            </Text>

            <TouchableOpacity style={[styles.proLangOption, language === 'tr' ? { borderColor: themeAccent, backgroundColor: themeAccent + '10' } : { borderColor: themeBorder }]} onPress={() => handleLanguageChange('tr')} activeOpacity={0.7}>
                <View style={styles.proLangLeft}>
                    <Text style={{fontSize: 24, marginRight: 15}}>🇹🇷</Text>
                    <Text style={[styles.proLangText, { color: themeText }]}>Türkçe</Text>
                </View>
                <View style={[styles.proRadioCircle, language === 'tr' && { borderColor: themeAccent }]}>
                    {language === 'tr' && <View style={[styles.proRadioInner, { backgroundColor: themeAccent }]} />}
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.proLangOption, language === 'en' ? { borderColor: themeAccent, backgroundColor: themeAccent + '10' } : { borderColor: themeBorder }]} onPress={() => handleLanguageChange('en')} activeOpacity={0.7}>
                <View style={styles.proLangLeft}>
                    <Text style={{fontSize: 24, marginRight: 15}}>🇬🇧</Text>
                    <Text style={[styles.proLangText, { color: themeText }]}>English</Text>
                </View>
                <View style={[styles.proRadioCircle, language === 'en' && { borderColor: themeAccent }]}>
                    {language === 'en' && <View style={[styles.proRadioInner, { backgroundColor: themeAccent }]} />}
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.proCloseBtn} onPress={() => setLangModalVisible(false)}>
              <Text style={[styles.proCloseText, { color: themeSubText }]}>{language === 'tr' ? 'Vazgeç' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🌟 MODAL 2: ŞİFRE DEĞİŞTİR */}
      <Modal visible={pwdModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={[styles.modalOverlay, { justifyContent: isTablet ? 'center' : 'flex-end' }]}
        >
          <View style={[
              styles.proBottomSheet, 
              { backgroundColor: themeCard }, 
              cardShadowStyle,
              isTablet && { width: 500, alignSelf: 'center', borderRadius: 36, paddingBottom: 25 }
          ]}>
            {!isTablet && <View style={[styles.sheetHandle, { backgroundColor: themeBorder }]} />}
            
            <View style={styles.proSheetHeader}>
                <Ionicons name="lock-closed" size={26} color={themeAccent} style={{marginRight: 10}} />
                <Text style={[styles.proSheetTitle, { color: themeText }]}>{language === 'tr' ? 'Şifre Değiştir' : 'Change Password'}</Text>
            </View>
            
            <Text style={[styles.proSheetSubtitle, { color: themeSubText }]}>
                {language === 'tr' ? 'Hesabınızın güvenliği için yeni şifrenizin en az 8 karakter olmasına dikkat edin.' : 'For your account security, ensure your new password is at least 8 characters long.'}
            </Text>

            <View style={[styles.pwdInputContainer, { borderColor: themeBorder, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }]}>
                <Ionicons name="key-outline" size={20} color={themeSubText} style={styles.pwdIcon} />
                <TextInput
                  style={[styles.pwdInput, { color: themeText }]}
                  placeholder={language === 'tr' ? 'Mevcut Şifreniz' : 'Current Password'}
                  placeholderTextColor={themeSubText}
                  secureTextEntry
                  value={oldPassword}
                  onChangeText={setOldPassword}
                />
            </View>

            <View style={[styles.pwdInputContainer, { borderColor: themeBorder, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={themeSubText} style={styles.pwdIcon} />
                <TextInput
                  style={[styles.pwdInput, { color: themeText }]}
                  placeholder={language === 'tr' ? 'Yeni Şifreniz' : 'New Password'}
                  placeholderTextColor={themeSubText}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
            </View>

            <View style={styles.pwdActionRow}>
                <TouchableOpacity style={[styles.pwdCancelBtn, { borderColor: themeBorder }]} onPress={() => setPwdModalVisible(false)}>
                    <Text style={[styles.pwdCancelText, { color: themeSubText }]}>{language === 'tr' ? 'Vazgeç' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.pwdSaveBtn, { backgroundColor: themeAccent }]} onPress={handlePasswordChange} disabled={isPwdLoading}>
                    {isPwdLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.pwdSaveText}>{language === 'tr' ? 'Şifreyi Güncelle' : 'Update Password'}</Text>}
                </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 🌟 MODAL 3: Gizlilik Politikası */}
      <Modal visible={privacyModalVisible} transparent animationType="slide">
        <View style={[
            styles.fullModal, 
            { backgroundColor: themeBackground },
            isTablet && { paddingHorizontal: 60, paddingVertical: 40, backgroundColor: 'rgba(0,0,0,0.8)' }
        ]}>
          <SafeAreaView style={[{ flex: 1 }, isTablet && { backgroundColor: themeBackground, borderRadius: 30, overflow: 'hidden' }]}>
            <View style={[styles.header, isTablet && { marginTop: 20 }]}>
              <TouchableOpacity onPress={() => setPrivacyModalVisible(false)} style={styles.backBtn}>
                  <Ionicons name="close" size={isTablet ? 36 : 30} color={themeText} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: themeText, fontSize: isTablet ? 24 : 20 }]}>{language === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}</Text>
              <View style={{ width: 40 }} /> 
            </View>
            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingHorizontal: isTablet ? 40 : 25, paddingVertical: 15, paddingBottom: 50 }}>
              <Text style={{ color: themeText, fontFamily: 'Poppins-Medium', fontSize: isTablet ? 16 : 14, lineHeight: isTablet ? 30 : 26, textAlign: 'justify' }}>
                {language === 'tr' ? privacyTextTR : privacyTextEN}
              </Text>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60, marginBottom: 5 },
  headerTitle: { fontFamily: 'Poppins-Black', fontSize: 20, letterSpacing: -0.5 },
  backBtn: { padding: 5, marginLeft: -5 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },
  
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 28, marginTop: 10, borderWidth: 1 },
  avatarCircle: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 26, fontFamily: 'Poppins-Black' },
  profileInfo: { marginLeft: 16, flex: 1 },
  userName: { fontFamily: 'Poppins-Bold', fontSize: 18, letterSpacing: -0.3 },
  userEmail: { fontFamily: 'Poppins-Medium', fontSize: 13, marginTop: 2 },

  sectionLabel: { fontFamily: 'Poppins-Bold', fontSize: 11, letterSpacing: 1.5, marginTop: 35, marginBottom: 10, marginLeft: 8 },
  sectionCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  label: { flex: 1, marginLeft: 15, fontFamily: 'Poppins-SemiBold', fontSize: 15, letterSpacing: -0.2 },
  rightSide: { flexDirection: 'row', alignItems: 'center' },
  valueText: { fontFamily: 'Poppins-SemiBold', fontSize: 13, marginRight: 8 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40, paddingVertical: 18, borderRadius: 20 },
  logoutText: { color: '#EF4444', fontFamily: 'Poppins-Bold', fontSize: 16, marginLeft: 10, letterSpacing: 0.5 },
  deleteAccountBtn: { marginTop: 25, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  deleteAccountText: { color: '#EF4444', fontFamily: 'Poppins-Bold', fontSize: 13, textDecorationLine: 'underline', opacity: 0.8 },
  footerText: { textAlign: 'center', fontFamily: 'Poppins-Medium', fontSize: 10, marginTop: 35, opacity: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  proBottomSheet: { borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 25, paddingTop: 15, paddingBottom: 45 },
  sheetHandle: { width: 45, height: 6, borderRadius: 3, alignSelf: 'center', marginBottom: 25 },
  proSheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  proSheetTitle: { fontFamily: 'Poppins-Black', fontSize: 22, letterSpacing: -0.5 },
  proSheetSubtitle: { fontFamily: 'Poppins-Medium', fontSize: 13, marginBottom: 25, lineHeight: 20 },
  
  proLangOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 22, borderWidth: 1.5, marginBottom: 14 },
  proLangLeft: { flexDirection: 'row', alignItems: 'center' },
  proLangText: { fontFamily: 'Poppins-Bold', fontSize: 16 },
  proRadioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#94A3B8', justifyContent: 'center', alignItems: 'center' },
  proRadioInner: { width: 12, height: 12, borderRadius: 6 },
  proCloseBtn: { marginTop: 15, paddingVertical: 15, alignItems: 'center' },
  proCloseText: { fontFamily: 'Poppins-Bold', fontSize: 15 },

  pwdInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, height: 58, paddingHorizontal: 15, marginBottom: 15 },
  pwdIcon: { marginRight: 12 },
  pwdInput: { flex: 1, fontFamily: 'Poppins-SemiBold', fontSize: 15 },
  pwdActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, gap: 15 },
  pwdCancelBtn: { flex: 1, height: 58, justifyContent: 'center', alignItems: 'center', borderRadius: 18, borderWidth: 1 },
  pwdSaveBtn: { flex: 2, height: 58, justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  pwdCancelText: { fontFamily: 'Poppins-Bold', fontSize: 15 },
  pwdSaveText: { fontFamily: 'Poppins-Bold', fontSize: 15, color: '#FFFFFF', letterSpacing: 0.5 },

  fullModal: { flex: 1 }
});

export default Settings;