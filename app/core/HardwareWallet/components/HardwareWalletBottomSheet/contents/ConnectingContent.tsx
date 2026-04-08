import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';

import { strings } from '../../../../../../locales/i18n';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import {
  getHardwareWalletTypeName,
  getConnectionTipsForWalletType,
} from '../../../helpers';
import { ContentLayout } from './ContentLayout';
import { useTheme } from '../../../../../util/theme';

export const CONNECTING_CONTENT_TEST_ID = 'connecting-content';
export const CONNECTING_CONTENT_SPINNER_TEST_ID = 'connecting-content-spinner';

const styles = StyleSheet.create({
  tipsHeader: {
    marginBottom: 8,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  tipBullet: {
    marginRight: 8,
  },
  tipText: {
    flex: 1,
  },
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
  const connectionTips = getConnectionTipsForWalletType(deviceType);

  return (
    <ContentLayout
      testID={CONNECTING_CONTENT_TEST_ID}
      title={strings('hardware_wallet.connecting.title', {
        device: deviceName,
      })}
      body={
        <View>
          {connectionTips.length > 0 && (
            <View>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Default}
                style={styles.tipsHeader}
              >
                {strings('hardware_wallet.connecting.tips_header')}
              </Text>

              {connectionTips.map((tipKey) => (
                <View key={tipKey} style={styles.tipItem}>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Default}
                    style={styles.tipBullet}
                  >
                    •
                  </Text>
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Default}
                    style={styles.tipText}
                  >
                    {strings(tipKey, { device: deviceName })}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.spinnerContainer}>
            <ActivityIndicator
              testID={CONNECTING_CONTENT_SPINNER_TEST_ID}
              size="large"
              color={colors.primary.default}
            />
          </View>
        </View>
      }
    />
  );
};
