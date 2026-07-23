import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { ScrollView } from 'react-native-gesture-handler';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getOrderById } from '../../../../../../reducers/fiatOrders';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import { RootState } from '../../../../../../reducers';
import DepositOrderContent from '../../../components/DepositOrderContent/DepositOrderContent';

interface DepositOrderDetailsParams {
  orderId: string;
}

export const createDepositOrderDetailsNavDetails =
  createNavigationDetails<DepositOrderDetailsParams>(
    Routes.DEPOSIT.ORDER_DETAILS,
  );

/** Read-only view for persisted legacy DEPOSIT orders (no live polling). */
const DepositOrderDetails = () => {
  const params = useParams<DepositOrderDetailsParams>();
  const order = useSelector((state: RootState) =>
    getOrderById(state, params.orderId),
  );
  const navigation = useNavigation<AppNavigationProp>();
  const title = strings('deposit.order_details.title');

  const handleHeaderBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (!order) {
    return (
      <ScreenLayout>
        <HeaderStandard
          title={title}
          onBack={handleHeaderBack}
          backButtonProps={{ testID: 'deposit-order-details-back-button' }}
          includesTopInset
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <HeaderStandard
        title={title}
        onBack={handleHeaderBack}
        backButtonProps={{ testID: 'deposit-order-details-back-button' }}
        includesTopInset
      />
      <ScrollView>
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <DepositOrderContent order={order} />
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScrollView>
    </ScreenLayout>
  );
};

export default DepositOrderDetails;
