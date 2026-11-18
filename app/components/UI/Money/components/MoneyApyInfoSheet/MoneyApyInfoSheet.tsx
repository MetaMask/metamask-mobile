import React, { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  BottomSheet,
  Box,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import useMoneyVaultApy from '../../hooks/useMoneyVaultApy';
import { isPositiveNumberOrZero } from '../../utils/number';
import { MoneyApyInfoSheetTestIds } from './MoneyApyInfoSheet.testIds';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';
import { MoneyVaultStatus } from '../../utils/moneyVaultState';

type MoneyApyInfoSheetVariant = 'default' | 'deposit';

interface MoneyApyInfoSheetParams {
  apy?: number;
  variant?: MoneyApyInfoSheetVariant;
  /** Vault status that drives premium and migration copy. */
  vaultStatus?: MoneyVaultStatus;
}

const ApySection = ({ title, body }: { title: string; body: string }) => (
  <Box twClassName="gap-1">
    <Text
      variant={TextVariant.HeadingSm}
      color={TextColor.TextDefault}
      accessibilityRole="header"
    >
      {title}
    </Text>
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {body}
    </Text>
  </Box>
);

const MoneyApyInfoSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const params = useParams<MoneyApyInfoSheetParams>();
  const apy = params?.apy;
  const vaultStatus = params?.vaultStatus ?? MoneyVaultStatus.Base;
  const { apyPercent: liveApyPercent } = useMoneyVaultApy({
    enabled: apy === undefined,
  });
  const resolvedApy = apy ?? liveApyPercent;
  const hasApy = isPositiveNumberOrZero(resolvedApy);

  const { trackBottomSheetViewed } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_APY_INFO_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const isPremiumCopy = vaultStatus === MoneyVaultStatus.Premium;
  const downgradingCopyKey =
    vaultStatus === MoneyVaultStatus.Downgrading
      ? 'money.apy_tooltip.migration_downgrading'
      : undefined;
  const migrationCopyKey =
    vaultStatus === MoneyVaultStatus.Upgrading
      ? 'money.apy_tooltip.migration_upgrading'
      : downgradingCopyKey;

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyApyInfoSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
      twClassName="bg-section rounded-t-3xl"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        testID={MoneyApyInfoSheetTestIds.SCROLL_VIEW}
      >
        <Box twClassName="px-4 pt-4 pb-4 gap-5">
          <Box twClassName="gap-1">
            {hasApy ? (
              <Text
                variant={TextVariant.HeadingLg}
                color={TextColor.SuccessDefault}
                accessibilityRole="header"
                testID={MoneyApyInfoSheetTestIds.APY_TITLE}
              >
                {strings('money.apy_label', { percentage: resolvedApy })}
              </Text>
            ) : null}
            <Text
              variant={TextVariant.HeadingSm}
              color={TextColor.TextDefault}
              accessibilityRole="header"
            >
              {strings('money.apy_tooltip.subtitle')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('money.apy_tooltip.lead')}
            </Text>
            {isPremiumCopy && hasApy ? (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('money.apy_tooltip.paragraph_1_premium', {
                  percentage: resolvedApy,
                })}
              </Text>
            ) : null}
            {migrationCopyKey ? (
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings(migrationCopyKey)}
              </Text>
            ) : null}
          </Box>
          <ApySection
            title={strings('money.apy_tooltip.how_it_works_title')}
            body={strings('money.apy_tooltip.how_it_works_body')}
          />
          <ApySection
            title={strings('money.apy_tooltip.why_it_changes_title')}
            body={strings('money.apy_tooltip.why_it_changes_body')}
          />
          <ApySection
            title={strings('money.apy_tooltip.where_it_comes_from_title')}
            body={strings('money.apy_tooltip.where_it_comes_from_body')}
          />
        </Box>
      </ScrollView>
    </BottomSheet>
  );
};

export default MoneyApyInfoSheet;
