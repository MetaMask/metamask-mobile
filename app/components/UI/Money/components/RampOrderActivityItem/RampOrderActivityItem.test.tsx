import React from 'react';
import { render } from '@testing-library/react-native';
import { type RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';
import RampOrderActivityItem from './RampOrderActivityItem';

jest.mock('../MoneyActivityItem/ActivityRowView', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      id,
      display,
      showNetworkBadge,
    }: {
      id: string;
      display: { label: string };
      showNetworkBadge: boolean;
    }) => (
      <Text testID="activity-row">
        {id}:{display.label}:{String(showNetworkBadge)}
      </Text>
    ),
  };
});

describe('RampOrderActivityItem', () => {
  it('renders a ramp order through the shared activity row view', () => {
    const order = {
      providerOrderId: 'order-1',
      status: RampsOrderStatus.Completed,
      cryptoAmount: '4.96',
      cryptoCurrency: { symbol: 'MUSD' },
      fiatAmount: 6.14,
      fiatCurrency: { symbol: 'USD' },
    } as RampsOrder;

    const { getByTestId } = render(<RampOrderActivityItem order={order} />);

    expect(getByTestId('activity-row')).toHaveTextContent(
      'order-1:Deposited:false',
    );
  });
});
