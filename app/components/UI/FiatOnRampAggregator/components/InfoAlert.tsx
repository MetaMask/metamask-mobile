import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, Linking } from 'react-native';
import Modal from 'react-native-modal';
import { QuoteResponse } from '@consensys/on-ramp-sdk';
import IonicIcon from 'react-native-vector-icons/Ionicons';

import Box from '../components/Box';
import CustomText from '../../../Base/Text';
import CustomTitle from '../../../Base/Title';
import RemoteImage from '../../../Base/RemoteImage';
import { useAssetFromTheme, useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { Colors } from '../../../../util/theme/models';

type Logos = QuoteResponse['provider']['logos'];

const Text = CustomText as any;
const Title = CustomTitle as any;

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
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const logoKey: 'light' | 'dark' = useAssetFromTheme('light', 'dark');

  const handleLinkPress = useCallback(async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  }, []);

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
          {logos?.[logoKey] ? (
            <RemoteImage
              style={{
                width: logos.width * LOGO_SIZE,
                height: logos.height * LOGO_SIZE,
              }}
              source={{ uri: logos[logoKey] }}
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
              onPress={() => handleLinkPress(providerWebsite as string)}
            >
              <Text small link underline centered>
                {providerWebsite}
              </Text>
            </TouchableOpacity>
          )}
          {Boolean(providerPrivacyPolicy) && (
            <TouchableOpacity
              onPress={() => handleLinkPress(providerPrivacyPolicy as string)}
            >
              <Text small link underline centered>
                {strings('app_information.privacy_policy')}
              </Text>
            </TouchableOpacity>
          )}
          {Boolean(providerSupport) && (
            <TouchableOpacity
              onPress={() => handleLinkPress(providerSupport as string)}
            >
              <Text small link underline centered>
                {providerName +
                  ' ' +
                  strings('fiat_on_ramp_aggregator.transaction.support')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Box>
    </Modal>
  );
};
export default InfoAlert;
