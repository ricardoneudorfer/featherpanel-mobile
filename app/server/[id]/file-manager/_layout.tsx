import { Stack } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";

export default function ManageServerFilesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.dark.bgSecondary },
        headerTintColor: Colors.dark.text,
        headerShadowVisible: false,
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="edit"
        options={{
          title: "Edit File",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Create File",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create-folder"
        options={{
          title: "Create Folder",
          headerShown: false,
        }}
      />
    </Stack>
  );
}