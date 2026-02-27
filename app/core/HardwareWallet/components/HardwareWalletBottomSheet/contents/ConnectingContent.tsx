import React from 'react';
import { View, StyleSheet } from 'react-native';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';

import { strings } from '../../../../../../locales/i18n';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import {
  getHardwareWalletTypeName,
  getConnectionTipsForWalletType,
} from '../../../helpers';
import { ContentLayout } from './ContentLayout';

export const CONNECTING_CONTENT_TEST_ID = 'connecting-content';
export const CONNECTING_CONTENT_SPINNER_TEST_ID = 'connecting-content-spinner';

const styles = StyleSheet.create({
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
});

export interface ConnectingContentProps {
  /** The device type for context in messages */
  deviceType: HardwareWalletType;
}

export const ConnectingContent: React.FC<ConnectingContentProps> = ({
  deviceType,
}) => {
  const deviceName = getHardwareWalletTypeName(deviceType);
  const connectionTips = getConnectionTipsForWalletType(deviceType);

  return (
    <ContentLayout
      testID={CONNECTING_CONTENT_TEST_ID}
      title={strings('hardware_wallet.connecting.title', {
        device: deviceName,
      })}
      body={
        connectionTips.length > 0 ? (
          <View>
            <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
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
        ) : undefined
      }
      footer={
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label=""
          onPress={
            // eslint-disable-next-line no-empty-function
            () => {}
          }
          loading
          testID={CONNECTING_CONTENT_SPINNER_TEST_ID}
        />
      }
    />
  );
};
