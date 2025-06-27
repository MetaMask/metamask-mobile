import React, { useCallback, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import Text, {
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import ListItemSelect from '../../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../../component-library/components/List/ListItemColumn';

import usePaymentMethods from '../../../hooks/usePaymentMethods';
import styleSheet from './PaymentMethodSelectorModal.styles';
import { useStyles } from '../../../../../../hooks/useStyles';

import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';
import { DepositPaymentMethod } from '../../../constants';
import Icon, {
  IconColor,
} from '../../../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../../../util/theme';

interface PaymentMethodSelectorModalNavigationDetails {
  selectedPaymentMethodId?: string;
  handleSelectPaymentMethodId?: (paymentMethodId: string) => void;
}

export const createPaymentMethodSelectorModalNavigationDetails =
  createNavigationDetails(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.PAYMENT_METHOD_SELECTOR,
  );

function PaymentMethodSelectorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const listRef = useRef<FlatList>(null);

  const { selectedPaymentMethodId, handleSelectPaymentMethodId } =
    useParams<PaymentMethodSelectorModalNavigationDetails>();
  const { height: screenHeight } = useWindowDimensions();
  const { themeAppearance } = useTheme();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const paymentMethods = usePaymentMethods();

  const handleSelectPaymentMethodIdCallback = useCallback(
    (paymentMethodId: string) => {
      if (handleSelectPaymentMethodId) {
        handleSelectPaymentMethodId(paymentMethodId);
      }
      sheetRef.current?.onCloseBottomSheet();
    },
    [handleSelectPaymentMethodId],
  );

  const renderPaymentMethod = useCallback(
    ({ item: paymentMethod }: { item: DepositPaymentMethod }) => (
      <ListItemSelect
        isSelected={selectedPaymentMethodId === paymentMethod.id}
        onPress={() => handleSelectPaymentMethodIdCallback(paymentMethod.id)}
        accessibilityRole="button"
        accessible
      >
        <ListItemColumn widthType={WidthType.Auto}>
          <View style={styles.iconContainer}>
            <Icon
              name={paymentMethod.icon}
              color={
                typeof paymentMethod.iconColor === 'object'
                  ? paymentMethod.iconColor[themeAppearance]
                  : paymentMethod.iconColor ?? IconColor.Primary
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
      selectedPaymentMethodId,
      styles.iconContainer,
      themeAppearance,
    ],
  );

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('deposit.payment_modal.select_a_payment_method')}
        </Text>
      </BottomSheetHeader>

      <FlatList
        style={styles.list}
        ref={listRef}
        data={paymentMethods}
        renderItem={renderPaymentMethod}
        extraData={selectedPaymentMethodId}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      ></FlatList>
    </BottomSheet>
  );
}

export default PaymentMethodSelectorModal;
