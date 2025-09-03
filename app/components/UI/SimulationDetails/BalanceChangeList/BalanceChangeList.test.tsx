import React from 'react';
import { render } from '@testing-library/react-native';
import { BigNumber } from 'bignumber.js';

import BalanceChangeList from './BalanceChangeList';
import { BalanceChange } from '../types';
import { sortBalanceChanges } from '../sortBalanceChanges';
import BalanceChangeRow from '../BalanceChangeRow/BalanceChangeRow';

jest.mock('../sortBalanceChanges');
jest.mock('../BalanceChangeRow/BalanceChangeRow', () => 'BalanceChangeRow');
jest.mock('../FiatDisplay/FiatDisplay', () => ({
  IndividualFiatDisplay: 'IndividualFiatDisplay',
  TotalFiatDisplay: 'TotalFiatDisplay',
}));

const CHAIN_ID_MOCK = '0x123';

const balanceChangesMock = [
  {
    asset: {
      type: 'ERC20',
      address: '0xabc123',
      chainId: CHAIN_ID_MOCK,
    },
    amount: new BigNumber(100),
    fiatAmount: 100,
    usdAmount: 100,
  },
] as BalanceChange[];
const headingMock = 'You received';

describe('BalanceChangeList', () => {
  const sortBalanceChangesMock = jest.mocked(sortBalanceChanges);

  beforeAll(() => {
    sortBalanceChangesMock.mockImplementation(
      (balanceChanges: BalanceChange[]) => balanceChanges,
    );
  });

  it('renders balance rows if there are balance changes', () => {
    const { getByTestId } = render(
      <BalanceChangeList
        heading={headingMock}
        balanceChanges={balanceChangesMock}
      />,
    );
    const container = getByTestId(
      'simulation-details-balance-change-list-container',
    );

    expect(container.findAllByType(BalanceChangeRow)).toHaveLength(
      balanceChangesMock.length,
    );
  });

  it('renders nothing if there are no balance changes', () => {
    const { queryByTestId } = render(
      <BalanceChangeList heading={headingMock} balanceChanges={[]} />,
    );
    const container = queryByTestId(
      'simulation-details-balance-change-list-container',
    );

    expect(container).toBeNull();
  });

  it('passes the heading only to the first row', () => {
    const multipleBalanceChangesMock = [
      {
        asset: {
          type: 'ERC20',
          address: '0xabc123',
          chainId: CHAIN_ID_MOCK,
        },
        amount: new BigNumber(100),
        fiatAmount: 100,
        usdAmount: 100,
      },
      {
        asset: {
          type: 'ERC721',
          address: '0xabc456',
        },
        amount: new BigNumber(1000),
        fiatAmount: 1000,
        usdAmount: 1000,
      },
    ] as BalanceChange[];

    const { getByTestId } = render(
      <BalanceChangeList
        heading={headingMock}
        balanceChanges={multipleBalanceChangesMock}
      />,
    );
    const container = getByTestId(
      'simulation-details-balance-change-list-container',
    );

    const rows = container.findAllByType(BalanceChangeRow);

    expect(rows).toHaveLength(multipleBalanceChangesMock.length);
    expect(rows[0].props.label).toBe(headingMock);
    expect(rows[1].props.label).toBeUndefined();
  });

  it('does not render TotalFiatDisplay component when there is only one balance change', () => {
    const { queryByTestId } = render(
      <BalanceChangeList
        heading={headingMock}
        balanceChanges={balanceChangesMock}
      />,
    );
    const container = queryByTestId(
      'simulation-details-balance-change-list-total-fiat-display-container',
    );

    expect(container).toBeNull();
  });
});
