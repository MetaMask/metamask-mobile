import React, { useCallback, useRef } from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  ButtonSize,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import musdCoinImage from '../../../../../images/mm_usd.png';
import styleSheet from './MoneyLinkCardSheet.styles';
import { MoneyLinkCardSheetTestIds } from './MoneyLinkCardSheet.testIds';

/**
 * "Spend and earn" confirmation bottom sheet shown before the Money Account ↔
 * Card linkage runs. The sheet is opened by
 * `useMoneyAccountCardLinkage.openLinkCardSheet`; pressing the primary CTA
 * dismisses the sheet immediately and dispatches
 * `confirmLinkInBackground`, which owns the pending / success / error /
 * cancel toast UX (Predict-style spinner). Dismissing via the header X (or
 * gesture / overlay tap) does nothing on-chain.
 */
const MoneyLinkCardSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { confirmLinkInBackground } = useMoneyAccountCardLinkage();
  const { apyPercent } = useMoneyAccountBalance();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirm = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      confirmLinkInBackground().catch(() => undefined);
    });
  }, [confirmLinkInBackground]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={MoneyLinkCardSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: MoneyLinkCardSheetTestIds.CLOSE_BUTTON }}
      />
      <Box twClassName="px-4 pb-2 gap-2 items-center">
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="h-[120px] w-[120px]"
          testID={MoneyLinkCardSheetTestIds.ILLUSTRATION}
        >
          <Image
            source={musdCoinImage}
            style={styles.illustration}
            resizeMode="contain"
          />
        </Box>
        <Box twClassName="gap-2 items-center">
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-center"
            testID={MoneyLinkCardSheetTestIds.TITLE}
          >
            {strings('money.metamask_card.link_card_sheet_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-center"
            testID={MoneyLinkCardSheetTestIds.DESCRIPTION}
          >
            {strings('money.metamask_card.link_card_sheet_description', {
              apy: apyPercent ?? 0,
            })}
          </Text>
        </Box>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          size: ButtonSize.Lg,
          children: strings('money.metamask_card.link_card_sheet_cta'),
          onPress: handleConfirm,
          testID: MoneyLinkCardSheetTestIds.CTA_BUTTON,
        }}
        twClassName="px-4 pt-4 pb-6"
      />
    </BottomSheet>
  );
};

export default MoneyLinkCardSheet;
