import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { MUSD_CONVERSION_APY } from '../constants/musd';
import { strings } from '../../../../../locales/i18n';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import useNavbar from '../../../Views/confirmations/hooks/ui/useNavbar';
import { TooltipModal } from '../../../Views/confirmations/components/UI/Tooltip/Tooltip';
import AppConstants from '../../../../core/AppConstants';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../constants/events';

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
  termsText: {
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

  const handleTermsOfUsePressed = useCallback(() => {
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

  const onInfoPress = useCallback(() => setTooltipOpen(true), []);

  const renderHeaderRight = useCallback(
    () => (
      <View style={styles.headerRight}>
        <ButtonIcon
          iconName={IconName.Info}
          size={ButtonIconSize.Md}
          iconProps={{ color: IconColor.IconDefault }}
          onPress={onInfoPress}
        />
      </View>
    ),
    [onInfoPress],
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

  const TooltipNode = (
    <TooltipModal
      open={tooltipOpen}
      setOpen={setTooltipOpen}
      content={
        <Text variant={TextVariant.BodyMD}>
          {strings('earn.musd_conversion.convert_tooltip_description', {
            percentage: MUSD_CONVERSION_APY,
          })}{' '}
          <Text
            variant={TextVariant.BodyMD}
            style={styles.termsText}
            onPress={handleTermsOfUsePressed}
            testID="musd-conversion-navbar-tooltip-terms-link"
          >
            {strings('earn.musd_conversion.education.terms_apply')}
          </Text>
        </Text>
      }
      title={strings('earn.musd_conversion.convert_and_get_percentage_bonus', {
        percentage: MUSD_CONVERSION_APY,
      })}
      tooltipTestId="musd-conversion-navbar-tooltip"
    />
  );

  return { TooltipNode };
}
