import React from 'react';
import { 
  useFonts, 
  Poppins_400Regular, 
  Poppins_500Medium, 
  Poppins_600SemiBold, 
  Poppins_700Bold, 
  Poppins_900Black 
} from '@expo-google-fonts/poppins';
import Navigator from './Navigator'; 
import { ThemeProvider } from './ThemeContext';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    'Poppins-Black': Poppins_900Black,
  });

  if (!fontsLoaded) {
    return null; 
  }

  return (
    <ThemeProvider>
      <Navigator />
    </ThemeProvider>
  );
}