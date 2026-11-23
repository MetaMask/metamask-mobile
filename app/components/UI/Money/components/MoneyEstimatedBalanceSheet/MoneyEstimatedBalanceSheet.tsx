import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  BottomSheet,
  Box,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import useMoneyVaultApy from '../../hooks/useMoneyVaultApy';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';
import { isPositiveNumberOrZero } from '../../utils/number';
import { MoneyEstimatedBalanceSheetTestIds } from './MoneyEstimatedBalanceSheet.testIds';

interface MoneyEstimatedBalanceSheetParams {
  depositAmountFiat: string;
  projectedAmountFiat: string;
  apy?: number;
}

const CheckBulletRow = ({
  title,
  body,
  testID,
}: {
  title: string;
  body: string;
  testID: string;
}) => (
  <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-4" testID={testID}>
    <Icon
      name={IconName.Check}
      size={IconSize.Md}
      color={IconColor.SuccessDefault}
    />
    <Box twClassName="flex-1 gap-1">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {title}
      </Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {body}
      </Text>
    </Box>
  </Box>
);

const MoneyEstimatedBalanceSheet = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { depositAmountFiat, projectedAmountFiat, apy } =
    useParams<MoneyEstimatedBalanceSheetParams>();
  const { apyPercent: liveApyPercent } = useMoneyVaultApy({
    enabled: apy === undefined,
  });
  const resolvedApy = apy ?? liveApyPercent;
  const hasApy = isPositiveNumberOrZero(resolvedApy);

  const { trackBottomSheetViewed } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_ESTIMATED_BALANCE_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <BottomSheet
      goBack={handleGoBack}
      testID={MoneyEstimatedBalanceSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        testID={MoneyEstimatedBalanceSheetTestIds.SCROLL_VIEW}
      >
        <Box twClassName="px-4 pt-4 pb-4 gap-6">
          <Box twClassName="gap-2">
            <Text
              variant={TextVariant.HeadingLg}
              color={TextColor.TextDefault}
              accessibilityRole="header"
              testID={MoneyEstimatedBalanceSheetTestIds.TITLE}
            >
              {strings('money.estimated_balance_sheet.title', {
                depositAmount: depositAmountFiat,
                projectedAmount: projectedAmountFiat,
              })}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={MoneyEstimatedBalanceSheetTestIds.SUBTITLE}
            >
              {hasApy
                ? strings('money.estimated_balance_sheet.subtitle', {
                    percentage: resolvedApy,
                  })
                : strings('money.estimated_balance_sheet.subtitle_no_apy')}
            </Text>
          </Box>
          <Box twClassName="gap-5">
            <CheckBulletRow
              title={strings(
                'money.estimated_balance_sheet.bullet_compound_title',
              )}
              body={strings(
                'money.estimated_balance_sheet.bullet_compound_body',
              )}
              testID={MoneyEstimatedBalanceSheetTestIds.BULLET_COMPOUND}
            />
            <CheckBulletRow
              title={strings(
                'money.estimated_balance_sheet.bullet_no_lockups_title',
              )}
              body={strings(
                'money.estimated_balance_sheet.bullet_no_lockups_body',
              )}
              testID={MoneyEstimatedBalanceSheetTestIds.BULLET_NO_LOCKUPS}
            />
          </Box>
          {hasApy ? (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              testID={MoneyEstimatedBalanceSheetTestIds.DISCLAIMER}
            >
              {strings('money.estimated_balance_sheet.disclaimer', {
                percentage: resolvedApy,
              })}
            </Text>
          ) : null}
        </Box>
      </ScrollView>
    </BottomSheet>
  );
};

export default MoneyEstimatedBalanceSheet;
