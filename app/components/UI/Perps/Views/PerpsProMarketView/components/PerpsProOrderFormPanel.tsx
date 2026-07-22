import { Box } from '@metamask/design-system-react-native';
import type { OrderType } from '@metamask/perps-controller';
import React, { useState } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProOrderForm from './PerpsProOrderForm/PerpsProOrderForm';
import type { PerpsProOrderDirection } from './PerpsProOrderForm/PerpsProOrderForm.types';
const PerpsProOrderFormPanel = () => {
  const [direction, setDirection] = useState<PerpsProOrderDirection>('long');
  const [orderType, setOrderType] = useState<OrderType>('market');
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
        onLeveragePress={() => undefined}
        orderType={orderType}
        onOrderTypeChange={setOrderType}
        limitPrice={limitPrice}
        onLimitPriceChange={setLimitPrice}
        onUseMidPricePress={() => undefined}
        size={size}
        onSizeChange={setSize}
        onSizeUnitPress={() => undefined}
        balancePercentage={balancePercentage}
        onBalancePercentageChange={setBalancePercentage}
        availableBalance={strings(
          'perps.pro_order_form.available_balance_unavailable',
        )}
        onAddFundsPress={() => undefined}
        reduceOnly={reduceOnly}
        onReduceOnlyChange={setReduceOnly}
        isTPSLConfigured={false}
        onTPSLPress={() => undefined}
        notices={[]}
        summary={{
          margin: '--',
          liquidationPrice: '--',
          slippage: '--',
          onSlippagePress: () => undefined,
          onFeesInfoPress: () => undefined,
        }}
        placeOrderLabel={strings('perps.pro_order_form.place_order')}
        placeOrderIntent={direction}
        onPlaceOrderPress={() => undefined}
      />
    </Box>
  );
};

export default PerpsProOrderFormPanel;
