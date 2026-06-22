import React, { useEffect, useRef } from 'react'; 
import { Animated, View } from 'react-native'; 
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AntDesign, Ionicons, FontAwesome6, MaterialIcons } from '@expo/vector-icons'; 

import Vault from './Vault';
import History from './History';
import Home from './Home';
import Add from './Add';
import Reccuring from './Recurring';
import Splash from './Splash'; 
import Login from './Login';
import Register from './Register';
import AIChat from './AIChat'; 
import { useTheme } from './ThemeContext';
import Settings from './Settings'; 
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MainTabs = () => {
  const { isDarkMode } = useTheme(); 
  const tabColors = {
    background: isDarkMode ? '#0F172A' : '#E5EBEE',
    active: isDarkMode ? '#09F8F0' : '#01114E',
    inactive: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : '#A0A0A0',
  };

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tabColors.background,
          borderTopWidth: 0,
          borderRadius: 36,
          height: '11%', 
          paddingTop: 10,
          paddingBottom: 7,
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 5,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDarkMode ? 0.3 : 0.1, 
          shadowRadius: 10,
          fontFamily: 'Poppins-Medium',
          fontSize: 11,
        },
        tabBarActiveTintColor: tabColors.active,
        tabBarInactiveTintColor: tabColors.inactive,
        tabBarShowLabel: false,
        tabBarIcon: ({ color, size, focused }) => {
          let icon;
          if (route.name === 'Vault') icon = <FontAwesome6 name="vault" size={20} color={color} />;
          else if (route.name === 'History') icon = <Ionicons name="receipt" size={21} color={color} />;
          else if (route.name === 'Home') icon = <Ionicons name="home" size={25} color={color} />;
          else if (route.name === 'Add') icon = <Ionicons name="add-circle" size={26} color={color} />; 
          else if (route.name === 'Reccuring') icon = <FontAwesome6 name="arrows-rotate" size={20} color={color} />;

          return <AnimatedIcon focused={focused}>{icon}</AnimatedIcon>;
        },
      })}
    >
      <Tab.Screen name="Add" component={Add} />
      <Tab.Screen name="History" component={History} />
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Reccuring" component={Reccuring} />
      <Tab.Screen name="Vault" component={Vault} />
    </Tab.Navigator>
  );
};

const Navigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
          initialRouteName="Splash" 
          screenOptions={{ headerShown: false, animation: 'fade' }}
      >
          <Stack.Screen name="Splash" component={Splash} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="Main" component={MainTabs} />
          
          <Stack.Screen 
            name="AIChat" 
            component={AIChat} 
            options={{ animation: 'slide_from_bottom' }} 
          />
          <Stack.Screen 
            name="Settings" 
            component={Settings} 
            options={{ animation: 'slide_from_right' }} 
          />
          
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const AnimatedIcon = ({ children, focused }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(scaleValue, {
      toValue: focused ? 1.2 : 1, 
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      {children}
    </Animated.View>
  );
};

export default Navigator;