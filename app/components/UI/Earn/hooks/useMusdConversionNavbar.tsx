import React, { useCallback, useMemo } from 'react';
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
import useTooltipModal from '../../../hooks/useTooltipModal';
import AppConstants from '../../../../core/AppConstants';

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
  const { openTooltipModal } = useTooltipModal();

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
          size={ButtonIconSize.Lg}
          iconProps={{ color: IconColor.IconDefault }}
          onPress={onBackPress}
        />
      </View>
    ),
    [],
  );

  const handleTermsOfUsePressed = () => {
    Linking.openURL(AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE);
  };

  const onInfoPress = useCallback(() => {
    openTooltipModal(
      strings('earn.musd_conversion.convert_and_get_percentage_bonus', {
        percentage: MUSD_CONVERSION_APY,
      }),
      <Text variant={TextVariant.BodyMD}>
        {strings('earn.musd_conversion.education.description', {
          percentage: MUSD_CONVERSION_APY,
        })}{' '}
        <Text variant={TextVariant.BodyMD}>
          <Text onPress={handleTermsOfUsePressed} style={styles.termsText}>
            {strings('earn.musd_conversion.education.terms_apply')}
          </Text>
        </Text>
      </Text>,
      strings('earn.musd_conversion.powered_by_relay'),
      strings('earn.musd_conversion.ok'),
    );
  }, [openTooltipModal]);

  const renderHeaderRight = useCallback(
    () => (
      <View style={styles.headerRight}>
        <ButtonIcon
          iconName={IconName.Info}
          size={ButtonIconSize.Lg}
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
}
