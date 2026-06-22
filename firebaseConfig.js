import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDrgyba0Ea-53cy0o9gm4vn4U9gVYEvy8U",
  authDomain: "ledgerio-2a4e5.firebaseapp.com",
  projectId: "ledgerio-2a4e5",
  storageBucket: "ledgerio-2a4e5.firebasestorage.app",
  messagingSenderId: "586942244069",
  appId: "1:586942244069:web:912828be4e5c1e0b51e00c",
  measurementId: "G-M7VWT1DT0Y"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// 🔑 KRİTİK: Auth'u AsyncStorage persistence ile başlat.
// Bu olmadan React Native'de oturum her uygulama kapanışında sıfırlanır
// (kullanıcı "Misafir" görünür / tekrar login istenir).
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);
