import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../renderWithProvider';
import type { RootState } from '../../../../reducers';
import { renderComponentViewScreen } from '../render';
import Routes from '../../../../constants/navigation/Routes';
import DepositOrderDetails from '../../../../components/UI/Ramp/Deposit/Views/DepositOrderDetails/DepositOrderDetails';
import {
  initialStateDepositOrderDetails,
  type InitialStateDepositOptions,
} from '../presets/deposit';

interface RenderDepositOrderDetailsOptions
  extends Omit<InitialStateDepositOptions, 'order'> {
  overrides?: DeepPartial<RootState>;
  orderId?: string;
  orderOverrides?: InitialStateDepositOptions['order'];
}

export function renderDepositOrderDetailsView(
  options: RenderDepositOrderDetailsOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, deterministicFiat, orderOverrides, orderId } = options;

  const builder = initialStateDepositOrderDetails({
    deterministicFiat,
    order: orderOverrides,
  });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    DepositOrderDetails as unknown as React.ComponentType,
    { name: Routes.DEPOSIT.ORDER_DETAILS },
    { state },
    { orderId: orderId ?? 'test-order-id-123456' },
  );
}
