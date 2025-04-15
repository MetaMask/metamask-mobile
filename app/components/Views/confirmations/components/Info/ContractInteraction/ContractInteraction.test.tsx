import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import React from 'react';
import { generateContractInteractionState } from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useConfirmationMetricEvents } from '../../../hooks/useConfirmationMetricEvents';
// eslint-disable-next-line import/no-namespace
import * as TransactionMetadataRequestHook from '../../../hooks/useTransactionMetadataRequest';
import ContractInteraction from './ContractInteraction';

jest.mock('../../../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
  context: {
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {
            '0x0000000000000000000000000000000000000000': {
              address: '0x0000000000000000000000000000000000000000',
            },
          },
        },
      },
    },
  },
  getTotalEvmFiatAccountBalance: jest.fn().mockReturnValue({
    ethFiat: 0,
    ethFiat1dAgo: 0,
    tokenFiat: 0,
    tokenFiat1dAgo: 0,
    totalNativeTokenBalance: '0',
    ticker: 'ETH',
  }),
}));

jest.mock('../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('../../../hooks/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: jest.fn(),
}));

describe('ContractInteraction', () => {
  const mockTrackPageViewedEvent = jest.fn();
  const mockUseConfirmActions = jest.mocked(useConfirmActions);
  const mockUseConfirmationMetricEvents = jest.mocked(
    useConfirmationMetricEvents,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfirmActions.mockReturnValue({
      onReject: jest.fn(),
      onConfirm: jest.fn(),
    });

    mockUseConfirmationMetricEvents.mockReturnValue({
      trackPageViewedEvent: mockTrackPageViewedEvent,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);

    const mockTxId = '7e62bcb1-a4e9-11ef-9b51-ddf21c91a998';
    jest
      .spyOn(TransactionMetadataRequestHook, 'useTransactionMetadataRequest')
      .mockReturnValue({
        id: mockTxId,
        type: TransactionType.contractInteraction,
        txParams: {
          data: '0x123456',
          from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
          to: '0x1234567890123456789012345678901234567890',
          value: '0x0',
        },
        chainId: '0x1' as `0x${string}`,
        networkClientId: 'mainnet',
        status: TransactionStatus.unapproved,
        time: Date.now(),
        origin: 'https://metamask.github.io',
      });
  });

  it('renders "estimate changes" and "network fee" sections', () => {
    const mockOnReject = jest.fn();
    mockUseConfirmActions.mockImplementation(() => ({
      onConfirm: jest.fn(),
      onReject: mockOnReject,
    }));

    const { getByText } = renderWithProvider(<ContractInteraction />, {
      state: generateContractInteractionState,
    });
    expect(getByText('Estimated changes')).toBeDefined();
    expect(getByText('Network Fee')).toBeDefined();
  });

  it('tracks mockTrackPageViewedEvent metrics event', () => {
    renderWithProvider(<ContractInteraction />, {
      state: generateContractInteractionState,
    });

    expect(mockTrackPageViewedEvent).toHaveBeenCalledTimes(1);
  });
});
