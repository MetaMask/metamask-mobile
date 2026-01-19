/* eslint @typescript-eslint/no-var-requires: "off" */
/* eslint @typescript-eslint/no-require-imports: "off" */

import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import {
  KEYSTONE_LEARN_MORE,
  KEYSTONE_SUPPORT,
  KEYSTONE_SUPPORT_VIDEO,
  NGRAVE_BUY,
  NGRAVE_LEARN_MORE,
} from '../../../../constants/urls';
import { useTheme } from '../../../../util/theme';
import { createStyles } from './styles';
import StyledButton from '../../../UI/StyledButton';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { QR_CONTINUE_BUTTON } from '../../../../../wdio/screen-objects/testIDs/Components/ConnectQRHardware.testIds';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import {
  HARDWARE_WALLET_BUTTON_TYPE,
  HARDWARE_WALLET_DEVICE_TYPE,
} from '../../../../core/Analytics/MetaMetrics.events';

interface IConnectQRInstructionProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  onConnect: () => void;
  renderAlert: () => React.JSX.Element;
}

// eslint-disable-next-line import/no-commonjs

const ConnectQRInstruction = (props: IConnectQRInstructionProps) => {
  const { onConnect, renderAlert, navigation } = props;
  const { trackEvent, createEventBuilder } = useMetrics();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme, insets);

  interface NavigateOptions {
    url: string;
    title: string;
    trackingProperties?: {
      device_type?: string;
      button_type?: string;
    };
  }

  const navigateToWebview = (options: NavigateOptions) => {
    const { url, title, trackingProperties } = options;

    if (trackingProperties) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_MARKETING)
          .addProperties(trackingProperties)
          .build(),
      );
    }

    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url,
        title: strings(title),
      },
    });
  };
  return (
    <View style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={styles.container}
        style={styles.scrollWrapper}
      >
        <Text style={styles.title}>{strings('connect_qr_hardware.title')}</Text>
        {renderAlert()}
        <View style={styles.textContainer}>
          <Text style={styles.text}>
            {strings('connect_qr_hardware.description1')}
          </Text>
          <Text
            style={[styles.text, styles.link]}
            onPress={() =>
              navigateToWebview({
                url: KEYSTONE_SUPPORT_VIDEO,
                title: 'connect_qr_hardware.description2',
                trackingProperties: {
                  device_type: HARDWARE_WALLET_DEVICE_TYPE.Keystone,
                  button_type: HARDWARE_WALLET_BUTTON_TYPE.TUTORIAL,
                },
              })
            }
          >
            {strings('connect_qr_hardware.description2')}
          </Text>
          <Text style={styles.text}>
            {strings('connect_qr_hardware.description3')}
          </Text>
          <Text style={styles.keystone}>
            {strings('connect_qr_hardware.keystone')}
          </Text>
          <View style={styles.buttonGroup}>
            <Text
              style={[styles.text, styles.link, styles.linkMarginRight]}
              onPress={() =>
                navigateToWebview({
                  url: KEYSTONE_LEARN_MORE,
                  title: 'connect_qr_hardware.keystone',
                  trackingProperties: {
                    device_type: HARDWARE_WALLET_DEVICE_TYPE.Keystone,
                    button_type: HARDWARE_WALLET_BUTTON_TYPE.LEARN_MORE,
                  },
                })
              }
            >
              {strings('connect_qr_hardware.learnMore')}
            </Text>
            <Text
              style={[styles.text, styles.link]}
              onPress={() =>
                navigateToWebview({
                  url: KEYSTONE_SUPPORT,
                  title: 'connect_qr_hardware.description4',
                  trackingProperties: {
                    device_type: HARDWARE_WALLET_DEVICE_TYPE.Keystone,
                    button_type: HARDWARE_WALLET_BUTTON_TYPE.TUTORIAL,
                  },
                })
              }
            >
              {strings('connect_qr_hardware.tutorial')}
            </Text>
          </View>
          <Text style={styles.keystone}>
            {strings('connect_qr_hardware.ngravezero')}
          </Text>
          <View style={styles.buttonGroup}>
            <Text
              style={[styles.text, styles.link, styles.linkMarginRight]}
              onPress={() =>
                navigateToWebview({
                  url: NGRAVE_LEARN_MORE,
                  title: 'connect_qr_hardware.ngravezero',
                  trackingProperties: {
                    device_type: HARDWARE_WALLET_DEVICE_TYPE.NgraveZero,
                    button_type: HARDWARE_WALLET_BUTTON_TYPE.LEARN_MORE,
                  },
                })
              }
            >
              {strings('connect_qr_hardware.learnMore')}
            </Text>
            <Text
              style={[styles.text, styles.link]}
              onPress={() =>
                navigateToWebview({
                  url: NGRAVE_BUY,
                  title: 'connect_qr_hardware.ngravezero',
                  trackingProperties: {
                    device_type: HARDWARE_WALLET_DEVICE_TYPE.NgraveZero,
                    button_type: HARDWARE_WALLET_BUTTON_TYPE.BUY_NOW,
                  },
                })
              }
            >
              {strings('connect_qr_hardware.buyNow')}
            </Text>
          </View>
        </View>
      </ScrollView>
      <View style={styles.bottom}>
        <StyledButton
          type={'confirm'}
          onPress={onConnect}
          style={styles.button}
          {...generateTestId(Platform, QR_CONTINUE_BUTTON)}
        >
          {strings('connect_qr_hardware.button_continue')}
        </StyledButton>
      </View>
    </View>
  );
};

export default ConnectQRInstruction;
