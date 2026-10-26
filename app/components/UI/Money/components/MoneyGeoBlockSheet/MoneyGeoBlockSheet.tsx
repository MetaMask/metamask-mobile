import React, { useCallback, useMemo, useRef } from 'react';
import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
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
import { useSelector } from 'react-redux';
import { MoneyGeoBlockSheetTestIds } from './MoneyGeoBlockSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';
import useMountEffect from '../../hooks/useMountEffect';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../../selectors/geolocationController';

const MoneyGeoBlockSheet = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const geolocationLocation = useSelector(selectGeolocationLocation);
  const geolocationStatus = useSelector(selectGeolocationStatus);

  const isGeolocationLookupError =
    geolocationStatus === 'error' &&
    (!geolocationLocation || geolocationLocation === UNKNOWN_LOCATION);

  const title = isGeolocationLookupError
    ? strings('fiat_on_ramp_aggregator.eligibility_failed_modal.title')
    : strings('money.geo_block.title');

  const description = isGeolocationLookupError
    ? strings('fiat_on_ramp_aggregator.eligibility_failed_modal.description')
    : strings('money.geo_block.description');

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
      onClose={handleClose}
    >
      <BottomSheetHeader
        onClose={handleClose}
        testID={MoneyGeoBlockSheetTestIds.TITLE}
        closeButtonProps={{
          testID: MoneyGeoBlockSheetTestIds.CLOSE_BUTTON,
        }}
      >
        {title}
      </BottomSheetHeader>
      <Box paddingHorizontal={4}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={MoneyGeoBlockSheetTestIds.BODY}
          twClassName="text-center"
        >
          {description}
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
