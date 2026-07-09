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
import { MoneyDeeplinkModalTestIds } from './MoneyDeeplinkModal.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';
import useMountEffect from '../../hooks/useMountEffect';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { AppStackNavigationProp } from '../../../../../core/NavigationService/types';

export interface MoneyDeeplinkModalParams {
  title?: string;
  description?: string;
}

const MoneyDeeplinkModal = () => {
  const navigation = useNavigation<AppStackNavigationProp>();

  const route =
    useRoute<RouteProp<{ params: MoneyDeeplinkModalParams }, 'params'>>();

  const title = route.params?.title;
  const description = route.params?.description;

  const surfaceClass = useElevatedSurface();

  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const { trackBottomSheetViewed } = useMoneyAnalytics({
    bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_DEEPLINK_MODAL,
  });

  useMountEffect(trackBottomSheetViewed);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.WALLET.HOME);
    });
  }, [navigation]);

  const primaryButtonProps = useMemo(
    () => ({
      children: strings('money.deeplink_modal.button'),
      onPress: handleClose,
      testID: MoneyDeeplinkModalTestIds.PRIMARY_BUTTON,
      size: ButtonSize.Lg,
    }),
    [handleClose],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      testID={MoneyDeeplinkModalTestIds.SHEET}
      twClassName={surfaceClass}
      onClose={handleClose}
    >
      <BottomSheetHeader
        onClose={handleClose}
        testID={MoneyDeeplinkModalTestIds.TITLE}
        closeButtonProps={{
          testID: MoneyDeeplinkModalTestIds.CLOSE_BUTTON,
        }}
      >
        {title}
      </BottomSheetHeader>
      <Box paddingHorizontal={4}>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={MoneyDeeplinkModalTestIds.DESCRIPTION}
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

export default MoneyDeeplinkModal;
