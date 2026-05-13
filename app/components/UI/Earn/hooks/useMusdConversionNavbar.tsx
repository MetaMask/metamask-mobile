import React, { useCallback, useMemo, useState } from 'react';
import { Linking, View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { MUSD_CONVERSION_APY } from '../constants/musd';
import { MUSD_EVENTS_CONSTANTS } from '../constants/events';
import { strings } from '../../../../../locales/i18n';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { TooltipModal } from '../../../Views/confirmations/components/UI/Tooltip/Tooltip';
import AppConstants from '../../../../core/AppConstants';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import useNavbar from '../../../Views/confirmations/hooks/ui/useNavbar';

const { EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

const styles = StyleSheet.create({
  headerTitle: {
    flexDirection: 'row',
    gap: 8,
  },
  headerLeft: {
    marginHorizontal: 16,
  },
  headerRight: {
    marginRight: 16,
  },
  termsLink: {
    textDecorationLine: 'underline',
  },
});

/**
 * Hook that sets up the mUSD conversion navbar with custom styling.
 * Uses the centralized rejection logic from useNavbar.
 *
 */
export function useMusdConversionNavbar() {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const renderHeaderTitle = useCallback(
    () => (
      <View style={styles.headerTitle}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('earn.musd_conversion.convert_and_get_percentage_bonus', {
            percentage: MUSD_CONVERSION_APY,
          })}
        </Text>
      </View>
    ),
    [],
  );

  const renderHeaderLeft = useCallback(
    (onBackPress: () => void) => (
      <View style={styles.headerLeft}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          iconProps={{ color: IconColor.IconDefault }}
          onPress={onBackPress}
        />
      </View>
    ),
    [],
  );

  const handleOpenTooltip = useCallback(() => setTooltipOpen(true), []);

  const renderHeaderRight = useCallback(
    () => (
      <View style={styles.headerRight}>
        <ButtonIcon
          iconName={IconName.Info}
          size={ButtonIconSize.Md}
          iconProps={{ color: IconColor.IconDefault }}
          onPress={handleOpenTooltip}
        />
      </View>
    ),
    [handleOpenTooltip],
  );

  const overrides = useMemo(
    () => ({
      headerTitle: renderHeaderTitle,
      headerLeft: renderHeaderLeft,
      headerRight: renderHeaderRight,
    }),
    [renderHeaderTitle, renderHeaderLeft, renderHeaderRight],
  );

  useNavbar(
    strings('earn.musd_conversion.convert_and_get_percentage_bonus', {
      percentage: MUSD_CONVERSION_APY,
    }),
    true,
    overrides,
  );

  const handleTermsPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_BONUS_TERMS_OF_USE_PRESSED)
        .addProperties({
          location: EVENT_LOCATIONS.CUSTOM_AMOUNT_NAVBAR,
          url: AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
        })
        .build(),
    );
    Linking.openURL(AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE);
  }, [createEventBuilder, trackEvent]);

  const tooltipContent = (
    <Text variant={TextVariant.BodyMD}>
      {strings('earn.musd_conversion.convert_tooltip_description', {
        percentage: MUSD_CONVERSION_APY,
      })}{' '}
      <Text
        variant={TextVariant.BodyMD}
        style={styles.termsLink}
        onPress={handleTermsPress}
        testID="musd-conversion-navbar-tooltip-terms-link"
      >
        {strings('earn.musd_conversion.education.terms_apply')}
      </Text>
    </Text>
  );

  const TooltipNode = (
    <TooltipModal
      open={tooltipOpen}
      setOpen={setTooltipOpen}
      content={tooltipContent}
      title={strings('earn.musd_conversion.convert_and_get_percentage_bonus', {
        percentage: MUSD_CONVERSION_APY,
      })}
      tooltipTestId="musd-conversion-navbar-tooltip"
    />
  );

  return { TooltipNode };
}
