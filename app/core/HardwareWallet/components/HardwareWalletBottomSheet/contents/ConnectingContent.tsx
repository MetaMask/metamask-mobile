import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { getHardwareWalletTypeName } from '../../../helpers';
import { ContentLayout } from './ContentLayout';
import { useTheme } from '../../../../../util/theme';

export const CONNECTING_CONTENT_TEST_ID = 'connecting-content';
export const CONNECTING_CONTENT_SPINNER_TEST_ID = 'connecting-content-spinner';

const styles = StyleSheet.create({
  spinnerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});

export interface ConnectingContentProps {
  /** The device type for context in messages */
  deviceType: HardwareWalletType;
}

export const ConnectingContent: React.FC<ConnectingContentProps> = ({
  deviceType,
}) => {
  const { colors } = useTheme();
  const deviceName = getHardwareWalletTypeName(deviceType);

  return (
    <ContentLayout
      testID={CONNECTING_CONTENT_TEST_ID}
      title={strings('hardware_wallet.connecting.title', {
        device: deviceName,
      })}
      body={
        <View style={styles.spinnerContainer}>
          <ActivityIndicator
            testID={CONNECTING_CONTENT_SPINNER_TEST_ID}
            size="large"
            color={colors.primary.default}
          />
        </View>
      }
    />
  );
};
