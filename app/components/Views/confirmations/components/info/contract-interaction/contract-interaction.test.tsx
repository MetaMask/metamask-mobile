import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import React from 'react';
import {
  generateContractInteractionState,
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import useBalanceChanges from '../../../../../UI/SimulationDetails/useBalanceChanges';
// eslint-disable-next-line import/no-namespace
import * as EditNonceHook from '../../../../../../components/hooks/useEditNonce';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
// eslint-disable-next-line import/no-namespace
import * as TransactionMetadataRequestHook from '../../../hooks/transactions/useTransactionMetadataRequest';
import ContractInteraction from './contract-interaction';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../../rows/account-network-info-row', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../hooks/gas/useIsGaslessSupported', () => ({
  useIsGaslessSupported: jest.fn().mockReturnValue({
    isSupported: false,
    isSmartTransaction: false,
  }),
}));
jest.mock('../../../hooks/tokens/useTokenWithBalance');

jest.mock('../../../hooks/useAutomaticGasFeeTokenSelect');

jest.mock('../../../hooks/alerts/useInsufficientBalanceAlert', () => ({
  useInsufficientBalanceAlert: jest.fn().mockReturnValue([]),
}));
jest.mock('../../../../../UI/SimulationDetails/useBalanceChanges');

jest.mock('../../../hooks/7702/use7702TransactionType', () => ({
  use7702TransactionType: jest
    .fn()
    .mockReturnValue({ isBatched: true, isBatchedUpgrade: true }),
}));

jest.mock('../../../../../hooks/AssetPolling/AssetPollingProvider', () => ({
  AssetPollingProvider: () => null,
}));

jest.mock('../../../../../../core/Engine', () => {
  const { KeyringTypes } = jest.requireActual('@metamask/keyring-controller');
  return {
    context: {
      getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
      NetworkController: {
        getNetworkConfigurationByNetworkClientId: jest.fn(),
        findNetworkClientIdByChainId: jest.fn(),
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
      KeyringController: {
        state: {
          keyrings: [
            {
              type: KeyringTypes.hd,
              accounts: ['0x0000000000000000000000000000000000000000'],
              metadata: {
                id: '01JNG71B7GTWH0J1TSJY9891S0',
                name: '',
              },
            },
          ],
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
  };
});

jest.mock('../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(),
}));

jest.mock('../../../hooks/metrics/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: jest.fn(),
}));

describe('ContractInteraction', () => {
  const mockTrackPageViewedEvent = jest.fn();
  const mockUseConfirmActions = jest.mocked(useConfirmActions);
  const mockUseConfirmationMetricEvents = jest.mocked(
    useConfirmationMetricEvents,
  );
  const mockUseBalanceChanges = jest.mocked(useBalanceChanges);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfirmActions.mockReturnValue({
      onReject: jest.fn(),
      onConfirm: jest.fn(),
    });

    mockUseConfirmationMetricEvents.mockReturnValue({
      trackPageViewedEvent: mockTrackPageViewedEvent,
    } as unknown as ReturnType<typeof useConfirmationMetricEvents>);
    mockUseBalanceChanges.mockReturnValue({
      pending: false,
      value: [],
    });

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
      } as unknown as TransactionMeta);

    jest.spyOn(EditNonceHook, 'useEditNonce').mockReturnValue({
      setShowNonceModal: jest.fn(),
      updateNonce: jest.fn(),
      showNonceModal: false,
      proposedNonce: 10,
      userSelectedNonce: 10,
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
    expect(getByText('Network fee')).toBeDefined();
  });

  it('tracks mockTrackPageViewedEvent metrics event', () => {
    renderWithProvider(<ContractInteraction />, {
      state: generateContractInteractionState,
    });

    expect(mockTrackPageViewedEvent).toHaveBeenCalledTimes(1);
  });

  it('renders switch account section for batched upgrade', () => {
    jest
      .spyOn(TransactionMetadataRequestHook, 'useTransactionMetadataRequest')
      .mockReturnValue(
        upgradeAccountConfirmation as unknown as TransactionMeta,
      );

    const { getByText } = renderWithProvider(<ContractInteraction />, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    expect(getByText('Now')).toBeDefined();
    expect(getByText('Switching to')).toBeDefined();
  });
});
