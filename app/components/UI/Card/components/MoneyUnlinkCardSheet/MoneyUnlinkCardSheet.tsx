import React, { useCallback, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAccountCardLinkage } from '../../hooks/useMoneyAccountCardLinkage';
import { CardEntryPoint } from '../../util/metrics';
import { MoneyUnlinkCardSheetTestIds } from './MoneyUnlinkCardSheet.testIds';

export interface MoneyUnlinkCardSheetRouteParams {
  fundingSource?: string;
  entrypoint?: CardEntryPoint | string;
}

const MoneyUnlinkCardSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { confirmLinkInBackground } = useMoneyAccountCardLinkage();
  const routeParams = route.params as
    | MoneyUnlinkCardSheetRouteParams
    | undefined;
  const fundingSource = routeParams?.fundingSource;
  const entrypoint =
    routeParams?.entrypoint ?? CardEntryPoint.CARD_HOME_UNLINK_MONEY_ACCOUNT;

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleUnlink = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      confirmLinkInBackground({
        delegationAmountHuman: '0',
        entrypoint,
      }).catch(() => undefined);
    });
  }, [confirmLinkInBackground, entrypoint]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyUnlinkCardSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: MoneyUnlinkCardSheetTestIds.CLOSE_BUTTON,
        }}
      >
        <Text
          variant={TextVariant.HeadingSm}
          testID={MoneyUnlinkCardSheetTestIds.TITLE}
        >
          {strings(
            fundingSource
              ? 'money.metamask_card.unlink_card_sheet_title_with_funding_source'
              : 'money.metamask_card.unlink_card_sheet_title_no_funding_source',
          )}
        </Text>
      </BottomSheetHeader>
      <Box twClassName="px-4">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          twClassName="text-alternative pb-4"
          testID={MoneyUnlinkCardSheetTestIds.DESCRIPTION}
        >
          {strings(
            fundingSource
              ? 'money.metamask_card.unlink_card_sheet_description_with_funding_source'
              : 'money.metamask_card.unlink_card_sheet_description_no_funding_source',
            { fundingSource },
          )}
        </Text>
        <Box twClassName="gap-4 pt-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleClose}
            isFullWidth
            testID={MoneyUnlinkCardSheetTestIds.KEEP_LINKED_BUTTON}
          >
            {strings('money.metamask_card.unlink_card_sheet_keep_linked')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleUnlink}
            isFullWidth
            testID={MoneyUnlinkCardSheetTestIds.UNLINK_ACCOUNT_BUTTON}
          >
            {strings('money.metamask_card.unlink_card_sheet_unlink_account')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default MoneyUnlinkCardSheet;
