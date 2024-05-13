/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import ListService from './components/ListService';
import RecentTransaction from './components/RecentTransaction';
import { formatAddress } from '../../../../../util/address';
import { useTheme } from '../../../../../util/theme';
import { AccountInformation } from '@metamask/assets-controllers';
import { renderFromWei, toHexadecimal } from '../../../../../util/number';
import { ProviderConfig } from '@metamask/network-controller';

import HorizontalCarousel from './components/HorizontalCarousel';

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

const Custom03 = ({
  selectedAddress,
  providerConfig,
  accountsByChainId,
  renderLoader,
}: {
  selectedAddress: string;
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
              <Text variant={TextVariant.BodyMD}>
                {formatAddress(selectedAddress, 'short')}
              </Text>
              <Text variant={TextVariant.HeadingLG}>${balance}.00</Text>
            </View>
          </View>
          <ListService type={'circled'} />
          <HorizontalCarousel />
          <RecentTransaction />
        </ScrollView>
      ) : (
        renderLoader()
      )}
    </SafeAreaView>
  );
};

export default Custom03;
