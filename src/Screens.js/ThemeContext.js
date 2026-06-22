import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState('tr'); 
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('userTheme');
        if (savedTheme !== null) {
          setIsDarkMode(JSON.parse(savedTheme));
        }

        const savedLang = await AsyncStorage.getItem('appLanguage');
        if (savedLang !== null) {
          setLanguage(savedLang);
        }
      } catch (error) {
        console.log("Ayarlar yüklenirken hata:", error);
      }
    };
    loadSettings();
  }, []);

  const toggleTheme = async () => {
    try {
      const newValue = !isDarkMode;
      setIsDarkMode(newValue);
      await AsyncStorage.setItem('userTheme', JSON.stringify(newValue));
    } catch (error) {
      console.log("Tema kaydedilirken hata:", error);
    }
  };

  const changeLanguage = async (newLang) => {
    try {
      setLanguage(newLang);
      await AsyncStorage.setItem('appLanguage', newLang);
    } catch (error) {
      console.log("Dil kaydedilirken hata:", error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, language, changeLanguage }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);