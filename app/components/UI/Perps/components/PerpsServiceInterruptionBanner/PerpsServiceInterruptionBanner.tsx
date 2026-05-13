import React, { useCallback } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  Icon,
  IconName,
  IconSize,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxBackgroundColor,
  IconColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectPerpsServiceInterruptionBannerEnabledFlag } from '../../selectors/featureFlags';
import { SUPPORT_CONFIG } from '../../constants/perpsConfig';
import type { PerpsServiceInterruptionBannerProps } from './PerpsServiceInterruptionBanner.types';

const HYPERLIQUID_URL = 'https://app.hyperliquid.xyz/';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  banner: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  contentRow: {
    flex: 1,
    gap: 8,
  },
  textContainer: {
    flex: 1,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
});

const PerpsServiceInterruptionBanner: React.FC<
  PerpsServiceInterruptionBannerProps
> = ({ testID = 'perps-service-interruption-banner' }) => {
  const isEnabled = useSelector(
    selectPerpsServiceInterruptionBannerEnabledFlag,
  );
  const navigation = useNavigation();

  const handleSupportPress = useCallback(() => {
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: SUPPORT_CONFIG.Url,
        title: strings(SUPPORT_CONFIG.TitleKey),
      },
    });
  }, [navigation]);

  const handleHyperliquidPress = useCallback(() => {
    Linking.openURL(HYPERLIQUID_URL);
  }, []);

  if (!isEnabled) {
    return null;
  }

  return (
    <Box style={styles.container} testID={testID}>
      <Box
        style={styles.banner}
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          style={styles.contentRow}
        >
          <Icon
            name={IconName.Danger}
            size={IconSize.Lg}
            color={IconColor.WarningDefault}
          />
          <Box style={styles.textContainer}>
            <Text variant={TextVariant.BodyMd}>
              {strings('perps.service_interruption.title')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('perps.service_interruption.description')}{' '}
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.InfoDefault}
                style={styles.linkText}
                onPress={handleSupportPress}
                testID={`${testID}-support-link`}
              >
                {strings('perps.service_interruption.contact_support')}
              </Text>
              {'. '}
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.InfoDefault}
                style={styles.linkText}
                onPress={handleHyperliquidPress}
                testID={`${testID}-hyperliquid-link`}
              >
                {strings('perps.service_interruption.manage_positions')}
              </Text>
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PerpsServiceInterruptionBanner;
