import { Box } from '@metamask/design-system-react-native';
import type { OrderType } from '@metamask/perps-controller';
import React, { useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProOrderForm from './PerpsProOrderForm/PerpsProOrderForm';
import type { PerpsProOrderDirection } from './PerpsProOrderForm/PerpsProOrderForm.types';

export interface PerpsProOrderFormPanelProps {
  orderType: OrderType;
  onOrderTypeButtonPress: () => void;
}

const PerpsProOrderFormPanel = ({
  orderType,
  onOrderTypeButtonPress,
}: PerpsProOrderFormPanelProps) => {
  const [direction, setDirection] = useState<PerpsProOrderDirection>('long');
  const [limitPrice, setLimitPrice] = useState('');
  const [size, setSize] = useState('');
  const [balancePercentage, setBalancePercentage] = useState(0);
  const [reduceOnly, setReduceOnly] = useState(false);

  return (
    <Box
      testID={PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL}
      twClassName="flex-1 py-4"
    >
      <PerpsProOrderForm
        direction={direction}
        onDirectionChange={setDirection}
        marginModeLabel={strings('perps.pro_order_form.isolated')}
        leverageLabel="3x"
        orderType={orderType}
        onOrderTypeButtonPress={onOrderTypeButtonPress}
        limitPrice={limitPrice}
        onLimitPriceChange={setLimitPrice}
        size={size}
        onSizeChange={setSize}
        balancePercentage={balancePercentage}
        onBalancePercentageChange={setBalancePercentage}
        availableBalance={strings(
          'perps.pro_order_form.available_balance_unavailable',
        )}
        reduceOnly={reduceOnly}
        onReduceOnlyChange={setReduceOnly}
        isTPSLConfigured={false}
        notices={[]}
        summary={{
          margin: '--',
          liquidationPrice: '--',
          slippage: '--',
        }}
        placeOrderLabel={strings('perps.pro_order_form.place_order')}
        placeOrderIntent={direction}
        isPlaceOrderDisabled
        onPlaceOrderPress={() => undefined}
      />
    </Box>
  );
};

export default PerpsProOrderFormPanel;
