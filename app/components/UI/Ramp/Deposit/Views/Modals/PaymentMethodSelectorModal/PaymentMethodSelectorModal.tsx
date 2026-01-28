import React, { useCallback, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconColor,
} from '../../../../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCenter from '../../../../../../../component-library/components-temp/HeaderCenter';
import ListItemSelect from '../../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../../component-library/components/List/ListItemColumn';
import { useStyles } from '../../../../../../hooks/useStyles';
import { useDepositSDK } from '../../../sdk';
import useAnalytics from '../../../../hooks/useAnalytics';
import { useTheme } from '../../../../../../../util/theme';
import { strings } from '../../../../../../../../locales/i18n';
import styleSheet from './PaymentMethodSelectorModal.styles';
import { DepositPaymentMethod } from '@consensys/native-ramps-sdk';
import Routes from '../../../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';

interface PaymentMethodSelectorModalParams {
  paymentMethods: DepositPaymentMethod[];
}

export const createPaymentMethodSelectorModalNavigationDetails =
  createNavigationDetails<PaymentMethodSelectorModalParams>(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.PAYMENT_METHOD_SELECTOR,
  );

function PaymentMethodSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList>(null);
  const { height: screenHeight } = useWindowDimensions();
  const { themeAppearance } = useTheme();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const { paymentMethods } = useParams<PaymentMethodSelectorModalParams>();
  const trackEvent = useAnalytics();
  const {
    setSelectedPaymentMethod,
    selectedRegion,
    isAuthenticated,
    selectedPaymentMethod,
  } = useDepositSDK();

  const handleSelectPaymentMethodIdCallback = useCallback(
    (paymentMethodId: string) => {
      const foundPaymentMethod = paymentMethods.find(
        (_paymentMethod) => _paymentMethod.id === paymentMethodId,
      );
      if (foundPaymentMethod) {
        trackEvent('RAMPS_PAYMENT_METHOD_SELECTED', {
          ramp_type: 'DEPOSIT',
          region: selectedRegion?.isoCode || '',
          payment_method_id: foundPaymentMethod.id,
          is_authenticated: isAuthenticated,
        });
        setSelectedPaymentMethod(foundPaymentMethod);
      }
      sheetRef.current?.onCloseBottomSheet();
    },
    [
      paymentMethods,
      trackEvent,
      selectedRegion?.isoCode,
      isAuthenticated,
      setSelectedPaymentMethod,
    ],
  );

  const renderPaymentMethod = useCallback(
    ({ item: paymentMethod }: { item: DepositPaymentMethod }) => (
      <ListItemSelect
        isSelected={selectedPaymentMethod?.id === paymentMethod.id}
        onPress={() => handleSelectPaymentMethodIdCallback(paymentMethod.id)}
        accessibilityRole="button"
        accessible
      >
        <ListItemColumn widthType={WidthType.Auto}>
          <View style={styles.iconContainer}>
            <Icon
              name={paymentMethod.icon as IconName}
              color={
                typeof paymentMethod.iconColor === 'object'
                  ? paymentMethod.iconColor[themeAppearance]
                  : (paymentMethod.iconColor ?? IconColor.Primary)
              }
            />
          </View>
        </ListItemColumn>
        <ListItemColumn widthType={WidthType.Fill}>
          <Text variant={TextVariant.BodyLGMedium}>{paymentMethod.name}</Text>
        </ListItemColumn>
        <ListItemColumn widthType={WidthType.Auto}>
          <Text>
            {strings(`deposit.payment_duration.${paymentMethod.duration}`)}
          </Text>
        </ListItemColumn>
      </ListItemSelect>
    ),
    [
      handleSelectPaymentMethodIdCallback,
      selectedPaymentMethod?.id,
      styles.iconContainer,
      themeAppearance,
    ],
  );

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <HeaderCenter
        title={strings('deposit.payment_modal.select_a_payment_method')}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      />

      <FlatList
        style={styles.list}
        ref={listRef}
        data={paymentMethods}
        renderItem={renderPaymentMethod}
        extraData={selectedPaymentMethod?.id}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      ></FlatList>
    </BottomSheet>
  );
}

export default PaymentMethodSelectorModal;
