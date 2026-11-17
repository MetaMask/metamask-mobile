import React, { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
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
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useParams } from '../../../../../util/navigation/navUtils';
import useMoneyVaultApy from '../../hooks/useMoneyVaultApy';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import useMountEffect from '../../hooks/useMountEffect';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';
import { isPositiveNumberOrZero } from '../../utils/number';
import { MoneyMusdInfoSheetTestIds } from './MoneyMusdInfoSheet.testIds';

interface MoneyMusdInfoSheetParams {
  receiveAmountFiat: string;
  apy?: number;
}

const CheckBulletRow = ({
  title,
  body,
  testID,
}: {
  title: React.ReactNode;
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

const MoneyMusdInfoSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const { receiveAmountFiat, apy } = useParams<MoneyMusdInfoSheetParams>();
  const { apyPercent: liveApyPercent } = useMoneyVaultApy({
    enabled: apy === undefined,
  });
  const resolvedApy = apy ?? liveApyPercent;
  const hasApy = isPositiveNumberOrZero(resolvedApy);

  const { trackBottomSheetViewed } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_MUSD_INFO_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyMusdInfoSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
      twClassName="bg-section rounded-t-3xl"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        testID={MoneyMusdInfoSheetTestIds.SCROLL_VIEW}
      >
        <Box twClassName="px-4 pt-4 pb-4 gap-6">
          <Box twClassName="gap-2">
            <Text
              variant={TextVariant.HeadingLg}
              color={TextColor.TextDefault}
              accessibilityRole="header"
              testID={MoneyMusdInfoSheetTestIds.TITLE}
            >
              {strings('money.musd_info_sheet.title', {
                amount: receiveAmountFiat,
              })}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={MoneyMusdInfoSheetTestIds.LEAD}
            >
              {strings('money.musd_info_sheet.lead')}
            </Text>
          </Box>
          <Box twClassName="gap-5">
            <CheckBulletRow
              title={strings('money.musd_info_sheet.bullet_worth_title')}
              body={strings('money.musd_info_sheet.bullet_worth_body')}
              testID={MoneyMusdInfoSheetTestIds.BULLET_WORTH}
            />
            <CheckBulletRow
              title={strings('money.musd_info_sheet.bullet_backed_title')}
              body={strings('money.musd_info_sheet.bullet_backed_body')}
              testID={MoneyMusdInfoSheetTestIds.BULLET_BACKED}
            />
            {hasApy ? (
              <CheckBulletRow
                title={
                  <>
                    {strings('money.musd_info_sheet.bullet_earns_title_prefix')}
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.SuccessDefault}
                    >
                      {strings('money.apy_label', { percentage: resolvedApy })}
                    </Text>
                  </>
                }
                body={strings('money.musd_info_sheet.bullet_earns_body')}
                testID={MoneyMusdInfoSheetTestIds.BULLET_EARNS}
              />
            ) : null}
            <CheckBulletRow
              title={strings('money.musd_info_sheet.bullet_no_lockups_title')}
              body={strings('money.musd_info_sheet.bullet_no_lockups_body')}
              testID={MoneyMusdInfoSheetTestIds.BULLET_NO_LOCKUPS}
            />
          </Box>
        </Box>
      </ScrollView>
    </BottomSheet>
  );
};

export default MoneyMusdInfoSheet;
