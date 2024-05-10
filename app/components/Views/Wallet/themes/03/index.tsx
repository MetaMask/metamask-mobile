/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from './components/Card';
import ListService from './components/ListService';
import RecentTransaction from './components/RecentTransaction';
import { formatAddress } from '../../../../../util/address';
import { useTheme } from '../../../../../util/theme';
import { AccountInformation } from '@metamask/assets-controllers';
import { renderFromWei, toHexadecimal } from '../../../../../util/number';
import { ProviderConfig } from '@metamask/network-controller';
import WidgetList from './components/SortableList/WidgetList';

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

const Custom02 = ({
  selectedAddress,
  ensForSelectedAccount,
  providerConfig,
  accountsByChainId,
  renderLoader,
}: {
  selectedAddress: string;
  ensForSelectedAccount: string | undefined;
  providerConfig: ProviderConfig;
  accountsByChainId: Record<
    string,
    {
      [address: string]: AccountInformation;
    }
  >;
  renderContent: () => JSX.Element;
  renderLoader: () => JSX.Element;
  renderOnboardingWizard: () => JSX.Element;
}) => {
  const { colors } = useTheme();
  const styles = styleSheet(colors);
  const balance = renderFromWei(
    accountsByChainId[toHexadecimal(providerConfig.chainId)][selectedAddress]
      .balance,
  );
  return (
    <SafeAreaView style={styles.safeArea}>
      {selectedAddress ? (
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text>Hello</Text>
              <Text style={styles.userName}>
                {formatAddress(selectedAddress, 'short')}
              </Text>
            </View>
          </View>
          <View style={styles.card}>
            <Card balance={balance} />
          </View>
          <ListService />
          <RecentTransaction />

          <WidgetList />
        </ScrollView>
      ) : (
        renderLoader()
      )}
    </SafeAreaView>
  );
};

export default Custom02;
