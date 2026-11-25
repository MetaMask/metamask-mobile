import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import {
  BottomSheet,
  BottomSheetFooter,
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
import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../../selectors/geolocationController';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { selectIsMoneyAccountGeoEligible } from '../../selectors/eligibility';
import Engine from '../../../../../core/Engine';

const MoneyGeoBlockSheet = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const geolocationLocation = useSelector(selectGeolocationLocation);
  const geolocationStatus = useSelector(selectGeolocationStatus);
  const isGeoEligible = useSelector(selectIsMoneyAccountGeoEligible);
  const [hasRequestedRetry, setHasRequestedRetry] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Keep the lookup-error UI while a retry is in flight: the controller status
  // moves to 'loading' during the refresh, which would otherwise flash the
  // regional-restriction copy before the result is known.
  const isGeolocationLookupError =
    isRetrying ||
    (geolocationStatus === 'error' &&
      (!geolocationLocation || geolocationLocation === UNKNOWN_LOCATION));

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
      const parentNavigation = navigation.getParent();
      if (!parentNavigation) {
        throw new Error(
          '[MoneyGeoBlockSheet] Cannot close without a parent navigator',
        );
      }
      /**
       * When an open Money sheet (such as Add money or Transfer) sends the user
       * here, its route remains underneath this sheet. Close the whole Money
       * modal flow so the user returns to where they started.
       */
      parentNavigation.goBack();
    });
  }, [navigation]);

  /**
   * The lookup error state is shown when geolocation could not be resolved
   * (e.g. the app started offline). Retrying lets the user recover without
   * restarting the app; a resolved location still goes through the normal
   * geo-eligibility check, so blocked regions stay blocked.
   */
  const handleRetry = useCallback(async () => {
    setHasRequestedRetry(true);
    setIsRetrying(true);
    try {
      await Engine.context.GeolocationController.refreshGeolocation();
    } catch {
      // Errors are surfaced via controller state; the sheet stays open.
    } finally {
      setIsRetrying(false);
    }
  }, []);

  // Once a retry resolves an eligible location, let the user continue.
  useEffect(() => {
    if (hasRequestedRetry && !isRetrying && isGeoEligible) {
      handleClose();
    }
  }, [hasRequestedRetry, isRetrying, isGeoEligible, handleClose]);

  const primaryButtonProps = useMemo(
    () =>
      isGeolocationLookupError
        ? {
            children: strings('money.geo_block.retry_button'),
            onPress: handleRetry,
            isLoading: isRetrying,
            isDisabled: isRetrying,
            testID: MoneyGeoBlockSheetTestIds.RETRY_BUTTON,
            size: ButtonSize.Lg,
          }
        : {
            children: strings('money.geo_block.button'),
            onPress: handleClose,
            testID: MoneyGeoBlockSheetTestIds.CONTINUE_BUTTON,
            size: ButtonSize.Lg,
          },
    [isGeolocationLookupError, handleRetry, handleClose, isRetrying],
  );

  const secondaryButtonProps = useMemo(
    () =>
      isGeolocationLookupError
        ? {
            children: strings('money.geo_block.button'),
            onPress: handleClose,
            isDisabled: isRetrying,
            testID: MoneyGeoBlockSheetTestIds.CONTINUE_BUTTON,
            size: ButtonSize.Lg,
          }
        : undefined,
    [isGeolocationLookupError, handleClose, isRetrying],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      testID={MoneyGeoBlockSheetTestIds.SHEET}
      onClose={handleClose}
    >
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={handleClose}
        testID={MoneyGeoBlockSheetTestIds.TITLE}
        closeButtonProps={{
          testID: MoneyGeoBlockSheetTestIds.CLOSE_BUTTON,
        }}
      >
        {title}
      </BottomSheetHeaderGlass>
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
        secondaryButtonProps={secondaryButtonProps}
        twClassName="pt-6"
      />
    </BottomSheet>
  );
};

export default MoneyGeoBlockSheet;
