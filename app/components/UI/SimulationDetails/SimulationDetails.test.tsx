import React from 'react';
import { render } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import {
  SimulationData,
  SimulationErrorCode,
  SimulationTokenStandard,
} from '@metamask/transaction-controller';

import AnimatedSpinner from '../AnimatedSpinner';
import SimulationDetails from './SimulationDetails';
import useBalanceChanges from './useBalanceChanges';
import { AssetType } from './types';

const FIRST_PARTY_CONTRACT_ADDRESS_1_MOCK =
  '0x0439e60F02a8900a951603950d8D4527f400C3f1';
const FIRST_PARTY_CONTRACT_ADDRESS_2_MOCK =
  '0x881D40237659C251811CEC9c364ef91dC08D300C';
const DUMMY_BALANCE_CHANGE = {
  previousBalance: '0xIGNORED' as Hex,
  newBalance: '0xIGNORED' as Hex,
};
const mockTransactionId = '0x1234567890';
const simulationDataMock = {
  nativeBalanceChange: {
    ...DUMMY_BALANCE_CHANGE,
    difference: '0x12345678912322222',
    isDecrease: true,
  },
  tokenBalanceChanges: [
    {
      ...DUMMY_BALANCE_CHANGE,
      address: FIRST_PARTY_CONTRACT_ADDRESS_1_MOCK,
      difference: '0x123456',
      isDecrease: false,
      standard: SimulationTokenStandard.erc20,
    },
    {
      ...DUMMY_BALANCE_CHANGE,
      address: FIRST_PARTY_CONTRACT_ADDRESS_2_MOCK,
      difference: '0x123456901',
      isDecrease: false,
      standard: SimulationTokenStandard.erc20,
    },
  ],
} as SimulationData;

jest.mock('../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {},
    theme: {
      colors: {
        icon: {},
      },
    },
  }),
}));

jest.mock('../AnimatedSpinner');
jest.mock('./BalanceChangeList/BalanceChangeList', () => 'BalanceChangeList');
jest.mock('./useBalanceChanges');

describe('SimulationDetails', () => {
  const useBalanceChangesMock = jest.mocked(useBalanceChanges);
  const animatedSpinnerMock = jest.mocked(AnimatedSpinner);

  beforeAll(() => {
    useBalanceChangesMock.mockReturnValue({
      pending: false,
      value: [],
    });
  });

  it('renders spinner while loading', () => {
    useBalanceChangesMock.mockReturnValueOnce({
      pending: true,
      value: [],
    });

    render(
      <SimulationDetails
        simulationData={simulationDataMock}
        transactionId={mockTransactionId}
      />,
    );

    expect(animatedSpinnerMock).toHaveBeenCalled();
  });

  describe("doesn't render", () => {
    it('chain is not supported', () => {
      expect(
        render(
          <SimulationDetails
            simulationData={{
              ...simulationDataMock,
              error: { code: SimulationErrorCode.ChainNotSupported },
            }}
            transactionId={mockTransactionId}
          />,
        ).toJSON(),
      ).toBeNull();
    });

    it('simulation is disabled', () => {
      expect(
        render(
          <SimulationDetails
            simulationData={{
              ...simulationDataMock,
              error: { code: SimulationErrorCode.Disabled },
            }}
            transactionId={mockTransactionId}
          />,
        ).toJSON(),
      ).toBeNull();
    });
  });

  describe('renders error', () => {
    it('if transaction will be reverted', () => {
      const { getByText } = render(
        <SimulationDetails
          simulationData={{
            ...simulationDataMock,
            error: { code: SimulationErrorCode.Reverted },
          }}
          transactionId={mockTransactionId}
        />,
      );

      expect(getByText('This transaction is likely to fail')).toBeDefined();
    });

    it('if simulation is failed', () => {
      const { getByText } = render(
        <SimulationDetails
          simulationData={{
            ...simulationDataMock,
            error: { code: SimulationErrorCode.InvalidResponse },
          }}
          transactionId={mockTransactionId}
        />,
      );

      expect(
        getByText('There was an error loading your estimation.'),
      ).toBeDefined();
    });
  });

  it('renders if no balance change', () => {
    const { getByText } = render(
      <SimulationDetails
        simulationData={simulationDataMock}
        transactionId={mockTransactionId}
      />,
    );

    expect(getByText('No changes predicted for your wallet')).toBeDefined();
  });

  it('renders balance changes', () => {
    useBalanceChangesMock.mockReturnValueOnce({
      pending: false,
      value: [
        {
          amount: new BigNumber('0x1', 16).times(-1),
          asset: { type: AssetType.Native },
        },
        {
          amount: new BigNumber('0x123456', 16).times(1),
          asset: {
            address: FIRST_PARTY_CONTRACT_ADDRESS_1_MOCK,
            tokenId: undefined,
            type: AssetType.ERC20,
          },
        },
        {
          amount: new BigNumber('0x123456789', 16).times(1),
          asset: {
            address: FIRST_PARTY_CONTRACT_ADDRESS_2_MOCK,
            tokenId: undefined,
            type: AssetType.ERC20,
          },
        },
      ],
    });

    const { getByTestId } = render(
      <SimulationDetails
        simulationData={simulationDataMock}
        transactionId={mockTransactionId}
      />,
    );

    expect(
      getByTestId('simulation-details-balance-change-list-outgoing'),
    ).toBeDefined();
    expect(
      getByTestId('simulation-details-balance-change-list-incoming'),
    ).toBeDefined();
  });
});
