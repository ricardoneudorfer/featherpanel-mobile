import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "@/contexts/AppContext";
import { StatusBar } from "react-native";
import Colors from '@/constants/colors';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ 
      headerBackTitle: "Back",
      headerStyle: { 
        backgroundColor: Colors.dark.bgSecondary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.dark.border
      },
      headerTintColor: Colors.dark.primary,
      headerTitleStyle: { 
        color: Colors.dark.text, 
        fontWeight: '600',
        fontFamily: 'monospace'
      },
    }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="instance-setup" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="server/[id]" options={{ headerTitle: "Server Management", headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerTitle: "Profile" }} />
      <Stack.Screen name="about" options={{ headerShown: false }} />
      <Stack.Screen name="activity-log" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar barStyle="dark" />
          <RootLayoutNav />
        </GestureHandlerRootView>
      </AppProvider>
    </QueryClientProvider>
  );
}