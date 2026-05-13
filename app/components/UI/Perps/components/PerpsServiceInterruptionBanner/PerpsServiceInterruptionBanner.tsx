import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
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

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
  },
  banner: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  titleRow: {
    gap: 8,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  underline: {
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

  if (!isEnabled) {
    return null;
  }

  return (
    <Box style={styles.container} testID={testID}>
      <Box
        style={styles.banner}
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
      >
        {/* Title row: icon + heading */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          style={styles.titleRow}
        >
          <Box
            style={styles.iconContainer}
            backgroundColor={BoxBackgroundColor.WarningMuted}
          >
            <Icon
              name={IconName.FlashSlash}
              size={IconSize.Md}
              color={IconColor.WarningDefault}
            />
          </Box>
          <Text
            variant={TextVariant.HeadingSm}
            color={TextColor.WarningDefault}
          >
            {strings('perps.service_interruption.title')}
          </Text>
        </Box>

        {/* Description aligned to left */}
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('perps.service_interruption.description')}{' '}
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            style={styles.underline}
            onPress={handleSupportPress}
            testID={`${testID}-support-link`}
          >
            {strings('perps.service_interruption.contact_support')}
          </Text>
        </Text>
      </Box>
    </Box>
  );
};

export default PerpsServiceInterruptionBanner;
