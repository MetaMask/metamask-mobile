import React from 'react';
import { ConnectedComponent } from 'react-redux';
import { Hex } from '@metamask/utils';
import { merge } from 'lodash';
import { fireEvent } from '@testing-library/react-native';

import QuotesView from './QuotesView';
import {
  DeepPartial,
  renderScreen,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_2,
} from '../../../util/test/accountsControllerTestUtils';
import { SwapsViewSelectors } from '../../../../e2e/selectors/swaps/SwapsView.selectors';
import Engine from '../../../core/Engine';

jest.mock('../../../core/Engine', () => ({
  context: {
    SwapsController: {
      stopPollingAndResetState: jest.fn(),
      startFetchAndSetQuotes: jest.fn(),
    },
    TransactionController: {
      estimateGasFee: jest.fn(),
    },
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756'],
          },
        ],
      },
    },
  },
}));

// Mock Fox component to avoid unnecessary snapshots
jest.mock('../../../components/UI/Fox', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./components/LoadingAnimation', () => ({
  __esModule: true,
  default: ({ onAnimationEnd }: { onAnimationEnd?: () => void }) => {
    if (onAnimationEnd) {
      onAnimationEnd();
    }
    return null;
  },
}));

const destinationToken = '0x987654321';
const sourceToken = '0x123456';
const accountBalance = '0x654321';
const selectedAddress = MOCK_ADDRESS_2;
const normalizedSelectedAddress = selectedAddress.toLowerCase();
const mockChainId = '0x1';
const topAggIdMock = 'topAggId';
const quotesMock = {
  [topAggIdMock]: {
    aggType: 'RFQ',
    aggregator: topAggIdMock,
    approvalNeeded: null,
    averageGas: 0,
    destinationAmount: '5',
    destinationToken,
    destinationTokenRate: 1,
    error: null,
    estimatedRefund: 0,
    fee: 0,
    fetchTime: 0,
    gasEstimate: '0x3d7a3',
    gasEstimateWithRefund: '0x3d7a3',
    gasMultiplier: 1,
    hasRoute: false,
    isGasIncludedTrade: false,
    maxGas: 0,
    priceSlippage: {
      bucket: 'low',
      calculationError: '',
      destinationAmountInETH: 0,
      destinationAmountInNativeCurrency: 0,
      destinationAmountInUSD: 0,
      ratio: 1,
      sourceAmountInETH: 0,
      sourceAmountInNativeCurrency: 0,
      sourceAmountInUSD: 0,
    },
    quoteRefreshSeconds: 30,
    slippage: 2,
    sourceAmount: '5',
    sourceToken,
    sourceTokenRate: 1,
    trade: {
      data: 'TRADE TX',
      from: selectedAddress,
      gas: '0x3d7a3',
      to: '0x881d40237659c251811cec9c364ef91dc08d300c',
      value: '0x5af3107a4000',
    },
    tradeTxFees: {
      baseFeePerGas: 14028013812,
      feeEstimate: 3050341159721301,
      fees: [],
      gasLimit: '0x3d7a3',
      maxFeeEstimate: 5910045890298291,
    },
  },
};
const quoteValuesMock = {
  [topAggIdMock]: {
    aggregator: topAggIdMock,
    ethFee: '0.002910246604106472',
    ethValueOfTokens: '0.000098654753332117',
    maxEthFee: '0.007649129721886653',
    metaMaskFeeInEth: '0.000000870849020586',
    overallValueOfQuote: '-0.002811591850774355',
    tradeGasLimit: '202989',
    tradeMaxGasLimit: '251823',
  },
};
const usedGasEstimateMock = {
  baseFeeTrend: 'down',
  estimatedBaseFee: '12.457753087',
  high: {
    maxWaitTimeEstimate: 30000,
    minWaitTimeEstimate: 15000,
    suggestedMaxFeePerGas: '30.671253777',
    suggestedMaxPriorityFeePerGas: '2.018421676',
  },
  historicalBaseFeeRange: ['9.994725452', '15.517624473'],
  historicalPriorityFeeRange: ['0.005', '82.668725682'],
  latestPriorityFeeRange: ['0.058', '3'],
  low: {
    maxWaitTimeEstimate: 60000,
    minWaitTimeEstimate: 15000,
    suggestedMaxFeePerGas: '12.467059087',
    suggestedMaxPriorityFeePerGas: '0.009306',
  },
  medium: {
    maxWaitTimeEstimate: 45000,
    minWaitTimeEstimate: 15000,
    suggestedMaxFeePerGas: '19.515724976',
    suggestedMaxPriorityFeePerGas: '1.701138061',
  },
  networkCongestion: 0.58865,
  priorityFeeTrend: 'level',
};

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      AccountTrackerController: {
        accounts: {
          [selectedAddress]: {
            balance: accountBalance,
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {
          [normalizedSelectedAddress as Hex]: {
            [mockChainId]: {
              [sourceToken]: '0x5',
            },
          },
        },
      },
      SwapsController: {
        topAggId: topAggIdMock,
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        quotes: quotesMock as any,
        quoteValues: quoteValuesMock,
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        usedGasEstimate: usedGasEstimateMock as any,
        approvalTransaction: {
          data: '0x123456',
        },
      },
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networksMetadata: {
          mainnet: {
            EIPS: {
              1559: true,
            },
          },
        },
        networkConfigurationsByChainId: {
          '0x1': {
            blockExplorerUrls: [],
            chainId: '0x1',
            defaultRpcEndpointIndex: 0,
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
            rpcEndpoints: [],
          },
        },
      },
    },
  },
  settings: {},
  transaction: {},
  fiatOrders: {},
};

function render(
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: React.ComponentType | ConnectedComponent<any, any>,
  modifiedState?: DeepPartial<RootState>,
) {
  return renderScreen(
    Component,
    {
      name: 'QuotesView',
    },
    {
      state: modifiedState ?? mockInitialState,
    },
    {
      sourceAmount: '5',
      tokens: [
        {
          address: sourceToken,
          symbol: 'DAI',
        },
        {
          address: destinationToken,
          symbol: 'USDC',
        },
      ],
      sourceTokenAddress: sourceToken,
      destinationTokenAddress: destinationToken,
    },
  );
}

describe('QuotesView', () => {
  it('should render quote screen', async () => {
    const wrapper = render(QuotesView, mockInitialState);
    expect(wrapper).toMatchSnapshot();

    expect(
      wrapper.findByTestId(SwapsViewSelectors.QUOTE_SUMMARY),
    ).toBeDefined();
  });

  describe('should use TransactionController estimations for EIP1559 networks', () => {
    it('for approval transactions', async () => {
      const wrapper = render(QuotesView, mockInitialState);

      const swapButton = await wrapper.findByTestId(
        SwapsViewSelectors.SWAP_BUTTON,
      );

      fireEvent.press(swapButton);

      const estimateGasFeeSpy = jest.spyOn(
        Engine.context.TransactionController,
        'estimateGasFee',
      );

      expect(estimateGasFeeSpy).toHaveBeenCalled();
    });

    it('for trade transactions', async () => {
      const state = merge(mockInitialState, {
        engine: {
          backgroundState: {
            SwapsController: {
              approvalTransaction: null,
            },
          },
        },
      });
      const wrapper = render(QuotesView, state);

      const swapButton = await wrapper.findByTestId(
        SwapsViewSelectors.SWAP_BUTTON,
      );

      fireEvent.press(swapButton);

      const estimateGasFeeSpy = jest.spyOn(
        Engine.context.TransactionController,
        'estimateGasFee',
      );

      expect(estimateGasFeeSpy).toHaveBeenCalled();
    });
  });
});
