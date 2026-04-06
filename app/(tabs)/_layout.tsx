import { Tabs, Link, router } from "expo-router";
import { Server, UserCircle, Cloud, Globe } from "lucide-react-native";
import React from "react";
import { View, TouchableOpacity } from "react-native";
import Colors from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={props => ({
        tabBarActiveTintColor: Colors.dark.primary,
        tabBarInactiveTintColor: Colors.dark.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.dark.bgSecondary,
          borderTopColor: Colors.dark.border,
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: Colors.dark.bgSecondary,
        },
        headerTintColor: Colors.dark.text,
        headerShadowVisible: false,
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => router.push('/profile')} 
            style={{ marginRight: 15 }}
          >
            <UserCircle size={24} color={Colors.dark.primary} />
          </TouchableOpacity>
        ),
      })}
    >
      <Tabs.Screen
        name="servers"
        options={{
          title: "Game Servers",
          tabBarIcon: ({ color }) => <Server size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vps"
        options={{
          title: "VPS Management",
          tabBarIcon: ({ color }) => <Cloud size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="webhost"
        options={{
          title: "Web Hosting",
          tabBarIcon: ({ color }) => <Globe size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}