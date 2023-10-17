import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { RootState } from '../../../../../../reducers';
import {
  getOrderById,
  getProviderName,
} from '../../../../../../reducers/fiatOrders';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { getFiatOnRampAggNavbar } from '../../../../Navbar';
import ScreenLayout from '../../components/ScreenLayout';

import styleSheet from './SendTransaction.styles';
import { useStyles } from '../../../../../../component-library/hooks';

import Row from '../../components/Row';
import ButtonConfirm from '../../components/ButtonConfirm';
import { Order } from '@consensys/on-ramp-sdk';

interface SendTransactionParams {
  orderId?: string;
}

function SendTransaction() {
  const navigation = useNavigation();
  const params = useParams<SendTransactionParams>();

  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});
  const order = useSelector((state: RootState) =>
    getOrderById(state, params.orderId),
  );

  const orderData = order?.data as Order;

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings(
            'fiat_on_ramp_aggregator.send_transaction.sell_crypto',
          ),
        },
        colors,
      ),
    );
  }, [colors, navigation]);

  if (!order) {
    return null;
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content></ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <Row>
            <Text style={styles.centered}>
              <Text variant={TextVariant.BodyMDBold}>Confirm</Text> sends your{' '}
              {order?.cryptocurrency} to{' '}
              {getProviderName(order.provider, order?.data)}, who then sends
              your cash to {orderData.paymentMethod.name}.
            </Text>
          </Row>

          <Row>
            <ButtonConfirm onLongPress={() => {}} />
          </Row>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
}

export default SendTransaction;
