import React, { useCallback, useMemo, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  ButtonsAlignment,
  ButtonSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';
import { MoneyGeoBlockSheetTestIds } from './MoneyGeoBlockSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';
import useMountEffect from '../../hooks/useMountEffect';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

const MoneyGeoBlockSheet = () => {
  const navigation = useNavigation();

  const surfaceClass = useElevatedSurface();

  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const { trackBottomSheetViewed } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_GEO_BLOCK_SHEET,
  });

  useMountEffect(trackBottomSheetViewed);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.WALLET.HOME);
    });
  }, [navigation]);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('money.geo_block.button'),
      onPress: handleClose,
      testID: MoneyGeoBlockSheetTestIds.CONTINUE_BUTTON,
      size: ButtonSize.Lg,
    }),
    [handleClose],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      testID={MoneyGeoBlockSheetTestIds.SHEET}
      twClassName={surfaceClass}
      onClose={handleClose}
    >
      <BottomSheetHeader
        onClose={handleClose}
        testID={MoneyGeoBlockSheetTestIds.TITLE}
        closeButtonProps={{
          testID: MoneyGeoBlockSheetTestIds.CLOSE_BUTTON,
        }}
      >
        {strings('money.geo_block.title')}
      </BottomSheetHeader>
      <Box paddingHorizontal={4}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={MoneyGeoBlockSheetTestIds.BODY}
          twClassName="text-center"
        >
          {strings('money.geo_block.description')}
        </Text>
      </Box>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        primaryButtonProps={primaryButtonProps}
        twClassName="pt-6"
      />
    </BottomSheet>
  );
};

export default MoneyGeoBlockSheet;
