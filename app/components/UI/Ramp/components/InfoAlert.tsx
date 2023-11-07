import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, Linking } from 'react-native';
import Modal from 'react-native-modal';
import { QuoteResponse } from '@consensys/on-ramp-sdk';
import IonicIcon from 'react-native-vector-icons/Ionicons';

import Box from './Box';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
import RemoteImage from '../../../Base/RemoteImage';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { Colors } from '../../../../util/theme/models';
import useAnalytics from '../hooks/useAnalytics';

type Logos = QuoteResponse['provider']['logos'];

const LOGO_SIZE = 1;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    box: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderWidth: 0,
    },
    cancel: {
      alignSelf: 'flex-end',
      marginBottom: -15,
      zIndex: 1,
    },
    modal: {
      padding: 8,
    },
    title: {
      alignItems: 'center',
    },
    row: {
      paddingVertical: 8,
    },
  });

interface Props {
  isVisible?: boolean;
  providerName?: string;
  logos?: Logos;
  subtitle?: string;
  body?: string;
  footer?: string;
  dismissButtonText?: string;
  providerWebsite?: string;
  providerPrivacyPolicy?: string;
  providerSupport?: string;
  dismiss?: () => any;
}

const InfoAlert: React.FC<Props> = ({
  isVisible,
  logos,
  providerName,
  subtitle,
  body,
  dismiss,
  providerWebsite,
  providerPrivacyPolicy,
  providerSupport,
}: Props) => {
  const { colors, themeAppearance } = useTheme();

  const styles = createStyles(colors);
  const trackEvent = useAnalytics();

  const handleProviderHomepageLinkPress = useCallback(
    (url: string) => {
      Linking.openURL(url);
      trackEvent('ONRAMP_EXTERNAL_LINK_CLICKED', {
        location: 'Quotes Screen',
        text: 'Provider Homepage',
        url_domain: url,
      });
    },
    [trackEvent],
  );

  const handleProviderPrivacyPolicyLinkPress = useCallback(
    (url: string) => {
      Linking.openURL(url);
      trackEvent('ONRAMP_EXTERNAL_LINK_CLICKED', {
        location: 'Quotes Screen',
        text: 'Provider Privacy Policy',
        url_domain: url,
      });
    },
    [trackEvent],
  );

  const handleProviderSupportLinkPress = useCallback(
    (url: string) => {
      Linking.openURL(url);
      trackEvent('ONRAMP_EXTERNAL_LINK_CLICKED', {
        location: 'Quotes Screen',
        text: 'Provider Support',
        url_domain: url,
      });
    },
    [trackEvent],
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={dismiss}
      swipeDirection="down"
      propagateSwipe
      avoidKeyboard
      style={styles.modal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
    >
      <Box style={styles.box}>
        <TouchableOpacity
          onPress={dismiss}
          style={styles.cancel}
          hitSlop={{ top: 10, left: 20, right: 10, bottom: 10 }}
        >
          <IonicIcon name="ios-close" size={30} color={colors.icon.default} />
        </TouchableOpacity>
        <View style={styles.title}>
          {logos?.[themeAppearance] ? (
            <RemoteImage
              style={{
                width: logos.width * LOGO_SIZE,
                height: logos.height * LOGO_SIZE,
              }}
              source={{ uri: logos[themeAppearance] }}
            />
          ) : (
            <Title centered>{providerName}</Title>
          )}
          {Boolean(subtitle) && (
            <View style={styles.row}>
              <Text small grey centered>
                {subtitle}
              </Text>
            </View>
          )}
          <View style={styles.row}>{Boolean(body) && <Text>{body}</Text>}</View>
          {Boolean(providerWebsite) && (
            <TouchableOpacity
              onPress={() =>
                handleProviderHomepageLinkPress(providerWebsite as string)
              }
            >
              <Text small link underline centered>
                {providerWebsite}
              </Text>
            </TouchableOpacity>
          )}
          {Boolean(providerPrivacyPolicy) && (
            <TouchableOpacity
              onPress={() =>
                handleProviderPrivacyPolicyLinkPress(
                  providerPrivacyPolicy as string,
                )
              }
            >
              <Text small link underline centered>
                {strings('app_information.privacy_policy')}
              </Text>
            </TouchableOpacity>
          )}
          {Boolean(providerSupport) && (
            <TouchableOpacity
              onPress={() =>
                handleProviderSupportLinkPress(providerSupport as string)
              }
            >
              <Text small link underline centered>
                {providerName +
                  ' ' +
                  strings('fiat_on_ramp_aggregator.order_details.support')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Box>
    </Modal>
  );
};
export default InfoAlert;
