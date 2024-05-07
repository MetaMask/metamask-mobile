/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { Image, StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from './components/Card';
import ListService from './components/ListService';
import RecentTransaction from './components/RecentTransaction';
import { useTheme } from '../../../../../util/theme';

const styleSheet = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
      padding: 24,
    },
    userName: {
      fontWeight: 'bold',
      fontSize: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    card: {
      paddingVertical: 14,
    },
    safeArea: { flex: 1 },
  });

const Custom02 = () => {
  const { colors } = useTheme();
  const styles = styleSheet(colors);
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text>Hello</Text>
            <Text style={styles.userName}>Jonathan Ferreira</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Card />
        </View>
        <ListService />
        <RecentTransaction />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Custom02;
