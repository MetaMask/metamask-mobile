import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import {
  SimulationData,
  SimulationErrorCode,
  SimulationTokenStandard,
  TransactionMeta,
} from '@metamask/transaction-controller';

import renderWithProvider from '../../../util/test/renderWithProvider';
import {
  batchApprovalConfirmation,
  generateContractInteractionState,
  getAppStateForConfirmation,
} from '../../../util/test/confirm-data-helpers';
import { MMM_ORIGIN } from '../../Views/confirmations/constants/confirmations';
// eslint-disable-next-line import/no-namespace
import * as BatchApprovalUtils from '../../Views/confirmations/hooks/7702/useBatchApproveBalanceChanges';
import AnimatedSpinner from '../AnimatedSpinner';
import SimulationDetails from './SimulationDetails';
import useBalanceChanges from './useBalanceChanges';
import { AssetType } from './types';

const approvalData = [
  {
    asset: {
      type: 'ERC20' as AssetType.ERC20 | AssetType.ERC721 | AssetType.ERC1155,
      address: '0x6b175474e89094c44da98b954eedeac495271d0f' as Hex,
      chainId: '0x1' as Hex,
    },
    amount: new BigNumber('-0.00001'),
    fiatAmount: null,
    isApproval: true,
    isAllApproval: false,
    isUnlimitedApproval: false,
    nestedTransactionIndex: 0,
    usdAmount: null,
  },
];
const DAPP_ORIGIN = 'https://dapp.com';
const FIRST_PARTY_CONTRACT_ADDRESS_1_MOCK =
  '0x0439e60F02a8900a951603950d8D4527f400C3f1';
const FIRST_PARTY_CONTRACT_ADDRESS_2_MOCK =
  '0x881D40237659C251811CEC9c364ef91dC08D300C';
const DUMMY_BALANCE_CHANGE = {
  previousBalance: '0xIGNORED' as Hex,
  newBalance: '0xIGNORED' as Hex,
};
const CHAIN_ID_MOCK = '0x123';
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

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenListController: {
      fetchTokenList: jest.fn(),
    },
  },
}));

jest.mock('../AnimatedSpinner');
jest.mock('./BalanceChangeList/BalanceChangeList', () => 'BalanceChangeList');
jest.mock('./useBalanceChanges');
jest.mock('./useSimulationMetrics');

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

    renderWithProvider(
      <SimulationDetails
        transaction={
          {
            id: mockTransactionId,
            simulationData: simulationDataMock,
            origin: DAPP_ORIGIN,
          } as TransactionMeta
        }
        enableMetrics={false}
      />,
      { state: generateContractInteractionState },
    );

    expect(animatedSpinnerMock).toHaveBeenCalled();
  });

  describe("doesn't render", () => {
    it('chain is not supported', () => {
      expect(
        renderWithProvider(
          <SimulationDetails
            transaction={
              {
                id: mockTransactionId,
                simulationData: {
                  ...simulationDataMock,
                  error: { code: SimulationErrorCode.ChainNotSupported },
                },
                origin: DAPP_ORIGIN,
              } as TransactionMeta
            }
            enableMetrics={false}
          />,
          { state: generateContractInteractionState },
        ).toJSON(),
      ).toBeNull();
    });

    it('simulation is disabled', () => {
      expect(
        renderWithProvider(
          <SimulationDetails
            transaction={
              {
                id: mockTransactionId,
                simulationData: {
                  ...simulationDataMock,
                  error: { code: SimulationErrorCode.Disabled },
                },
                origin: DAPP_ORIGIN,
              } as TransactionMeta
            }
            enableMetrics={false}
          />,
          { state: generateContractInteractionState },
        ).toJSON(),
      ).toBeNull();
    });

    it('is not a dapp interaction', () => {
      expect(
        renderWithProvider(
          <SimulationDetails
            transaction={
              {
                id: mockTransactionId,
                simulationData: simulationDataMock,
                origin: MMM_ORIGIN,
              } as TransactionMeta
            }
            enableMetrics={false}
          />,
          { state: generateContractInteractionState },
        ).toJSON(),
      ).toBeNull();
    });
  });

  describe('renders error', () => {
    it('if transaction will be reverted', () => {
      const { getByText } = renderWithProvider(
        <SimulationDetails
          transaction={
            {
              id: mockTransactionId,
              simulationData: {
                ...simulationDataMock,
                error: { code: SimulationErrorCode.Reverted },
              },
              origin: DAPP_ORIGIN,
            } as TransactionMeta
          }
          enableMetrics={false}
        />,
        { state: generateContractInteractionState },
      );

      expect(getByText('This transaction is likely to fail')).toBeDefined();
    });

    it('if simulation is failed', () => {
      const { getByText } = renderWithProvider(
        <SimulationDetails
          transaction={
            {
              id: mockTransactionId,
              simulationData: {
                ...simulationDataMock,
                error: { code: SimulationErrorCode.InvalidResponse },
              },
              origin: DAPP_ORIGIN,
            } as TransactionMeta
          }
          enableMetrics={false}
        />,
        { state: generateContractInteractionState },
      );

      expect(
        getByText('There was an error loading your estimation.'),
      ).toBeDefined();
    });
  });

  it('renders if no balance change', () => {
    const { getByText } = renderWithProvider(
      <SimulationDetails
        transaction={
          {
            id: mockTransactionId,
            simulationData: simulationDataMock,
            origin: DAPP_ORIGIN,
          } as TransactionMeta
        }
        enableMetrics={false}
      />,
      { state: generateContractInteractionState },
    );

    expect(getByText('No changes')).toBeDefined();
  });

  it('renders balance changes', () => {
    useBalanceChangesMock.mockReturnValueOnce({
      pending: false,
      value: [
        {
          amount: new BigNumber('0x1', 16).times(-1),
          fiatAmount: 10,
          asset: { type: AssetType.Native, chainId: CHAIN_ID_MOCK },
          usdAmount: 0,
        },
        {
          amount: new BigNumber('0x123456', 16).times(1),
          fiatAmount: 10,
          asset: {
            address: FIRST_PARTY_CONTRACT_ADDRESS_1_MOCK,
            tokenId: undefined,
            type: AssetType.ERC20,
            chainId: CHAIN_ID_MOCK,
          },
          usdAmount: 0,
        },
        {
          amount: new BigNumber('0x123456789', 16).times(1),
          fiatAmount: 10,
          asset: {
            address: FIRST_PARTY_CONTRACT_ADDRESS_2_MOCK,
            tokenId: undefined,
            type: AssetType.ERC20,
            chainId: CHAIN_ID_MOCK,
          },
          usdAmount: 0,
        },
      ],
    });

    const { getByTestId } = renderWithProvider(
      <SimulationDetails
        transaction={
          {
            id: mockTransactionId,
            simulationData: simulationDataMock,
            origin: DAPP_ORIGIN,
          } as TransactionMeta
        }
        enableMetrics={false}
      />,
      { state: generateContractInteractionState },
    );

    expect(
      getByTestId('simulation-details-balance-change-list-outgoing'),
    ).toBeDefined();
    expect(
      getByTestId('simulation-details-balance-change-list-incoming'),
    ).toBeDefined();
  });

  it('renders approval rows for batched transaction if they exist', async () => {
    useBalanceChangesMock.mockReturnValue({
      pending: false,
      value: [
        {
          amount: new BigNumber('-0.00001'),
          asset: {
            address: '0x6b175474e89094c44da98b954eedeac495271d0f',
            chainId: '0x1',
            tokenId: undefined,
            type: AssetType.ERC20,
          },
          fiatAmount: -0.00000999877,
          usdAmount: 0,
        },
        {
          amount: new BigNumber('0.000009'),
          asset: {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            chainId: '0x1',
            tokenId: undefined,
            type: AssetType.ERC20,
          },
          fiatAmount: 0.000008998623,
          usdAmount: 0,
        },
      ],
    });
    jest
      .spyOn(BatchApprovalUtils, 'useBatchApproveBalanceChanges')
      .mockReturnValue({ value: approvalData, pending: false });

    const { getByText } = renderWithProvider(
      <SimulationDetails
        transaction={
          {
            id: mockTransactionId,
            simulationData: simulationDataMock,
            origin: DAPP_ORIGIN,
          } as TransactionMeta
        }
        enableMetrics={false}
      />,
      { state: getAppStateForConfirmation(batchApprovalConfirmation) },
    );
    await waitFor(() => {
      expect(getByText('You approve')).toBeTruthy();
      expect(getByText('- 0.00001')).toBeTruthy();
    });
  });
});
