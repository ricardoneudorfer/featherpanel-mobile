import { Stack, Link } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export default function ServerDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.dark.bgSecondary },
        headerTintColor: Colors.dark.text,
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Overview",
          headerBackVisible: false,
          headerLeft: () => (
            <Link href="../(tabs)/servers" asChild>
              <TouchableOpacity style={{ marginLeft: 2 }}>
                <Ionicons name="chevron-back" size={28} color="white" />
              </TouchableOpacity>
            </Link>
          ),
        }}
      />
      <Stack.Screen
        name="console"
        options={{
          title: "Console",
        }}
      />
      <Stack.Screen
        name="files"
        options={{
          title: "Files",
        }}
      />
      <Stack.Screen
        name="file-manager"
        options={{
          title: "File Manager",
        }}
      />
      <Stack.Screen
        name="databases"
        options={{
          title: "Databases",
        }}
      />
      <Stack.Screen
        name="backups"
        options={{
          title: "Backups",
        }}
      />
      <Stack.Screen
        name="allocations"
        options={{
          title: "Network",
        }}
      />
      <Stack.Screen
        name="subusers"
        options={{
          title: "Subusers",
        }}
      />
    </Stack>
  );
}