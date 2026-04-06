import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';

export default function Index() {
  const { instanceUrl, authToken, user, isLoading, savedInstances } = useApp();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.dark.bg }}>
        <ActivityIndicator size="large" color={Colors.dark.primary} />
      </View>
    );
  }

  if (!instanceUrl && savedInstances.length === 0) {
    return <Redirect href="/instance-setup" />;
  }

  if (!instanceUrl && savedInstances.length > 0) {
    return <Redirect href="/saved-instances" />;
  }

  if (!authToken || !user) {
    return <Redirect href="/auth" />;
  }

  return <Redirect href="/(tabs)/servers" />;
}