import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { useNavigation } from '@react-navigation/native';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { providerErrors } from '@metamask/rpc-errors';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectDefaultEndpointByChainId } from '../../../../selectors/networkController';
import { addTransactionBatch } from '../../../../util/transaction-controller';
import { generateTransferData } from '../../../../util/transactions';
import { useConfirmNavigation } from '../../../Views/confirmations/hooks/useConfirmNavigation';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { ARBITRUM_USDC } from '../../../Views/confirmations/constants/perps';
import Routes from '../../../../constants/navigation/Routes';
import { usePerpsWithdrawConfirmation } from './usePerpsWithdrawConfirmation';
import usePerpsToasts from './usePerpsToasts';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../selectors/accountsController'),
  selectSelectedInternalAccountAddress: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../selectors/networkController'),
  selectDefaultEndpointByChainId: jest.fn(),
}));

jest.mock('../../../../util/transaction-controller', () => ({
  addTransactionBatch: jest.fn(),
}));

jest.mock('../../../../util/transactions', () => ({
  generateTransferData: jest.fn(),
}));

jest.mock('../../../Views/confirmations/hooks/useConfirmNavigation', () => ({
  useConfirmNavigation: jest.fn(),
}));

jest.mock('./usePerpsToasts', () => jest.fn());

const MOCK_ACCOUNT = '0x1234567890123456789012345678901234567890' as Hex;
const MOCK_TRANSFER_DATA = '0xabcdef' as Hex;
const MOCK_NETWORK_CLIENT_ID = 'arbitrum-mainnet';
const mockNavigateToConfirmation = jest.fn();
const mockGoBack = jest.fn();
const mockShowToast = jest.fn();
const mockWithdrawalStartFailedToast = { labelOptions: [{ label: 'failed' }] };
let retryWithdraw: (() => void) | undefined;
const mockWithdrawalStartFailed = jest.fn((onRetry: () => void) => {
  retryWithdraw = onRetry;
  return mockWithdrawalStartFailedToast;
});

describe('usePerpsWithdrawConfirmation', () => {
  const mockAddTransactionBatch = jest.mocked(addTransactionBatch);
  const mockGenerateTransferData = jest.mocked(generateTransferData);
  const mockSelectSelectedInternalAccountAddress = jest.mocked(
    selectSelectedInternalAccountAddress,
  );
  const mockSelectDefaultEndpointByChainId = jest.mocked(
    selectDefaultEndpointByChainId,
  );
  const mockUseConfirmNavigation = jest.mocked(useConfirmNavigation);
  const mockUseNavigation = jest.mocked(useNavigation);
  const mockUsePerpsToasts = jest.mocked(usePerpsToasts);

  beforeEach(() => {
    jest.clearAllMocks();
    retryWithdraw = undefined;

    mockSelectSelectedInternalAccountAddress.mockReturnValue(MOCK_ACCOUNT);
    mockSelectDefaultEndpointByChainId.mockReturnValue({
      networkClientId: MOCK_NETWORK_CLIENT_ID,
    } as never);
    mockGenerateTransferData.mockReturnValue(MOCK_TRANSFER_DATA);
    mockAddTransactionBatch.mockResolvedValue(undefined as never);
    mockUseConfirmNavigation.mockReturnValue({
      navigateToConfirmation: mockNavigateToConfirmation,
    } as never);
    mockUseNavigation.mockReturnValue({
      goBack: mockGoBack,
    } as never);
    mockUsePerpsToasts.mockReturnValue({
      showToast: mockShowToast,
      PerpsToastOptions: {
        accountManagement: {
          withdrawal: {
            withdrawalStartFailed: mockWithdrawalStartFailed,
          },
        },
      },
    } as never);

    (useSelector as jest.Mock).mockImplementation(((
      selector: (state: object) => unknown,
    ) => selector({})) as typeof useSelector);
  });

  it('navigates to confirmation with CustomAmount loader on Perps stack', async () => {
    const { result } = renderHook(() => usePerpsWithdrawConfirmation());

    await act(async () => {
      await result.current.withdrawWithConfirmation();
    });

    expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
      loader: ConfirmationLoader.CustomAmount,
      stack: Routes.PERPS.ROOT,
    });
  });

  it('adds a perpsWithdraw transaction batch on Arbitrum', async () => {
    const { result } = renderHook(() => usePerpsWithdrawConfirmation());

    await act(async () => {
      await result.current.withdrawWithConfirmation();
    });

    expect(mockSelectDefaultEndpointByChainId).toHaveBeenCalledWith(
      {},
      CHAIN_IDS.ARBITRUM,
    );
    expect(mockGenerateTransferData).toHaveBeenCalledWith('transfer', {
      toAddress: ARBITRUM_USDC.address,
      amount: '0x0',
    });
    expect(mockAddTransactionBatch).toHaveBeenCalledWith({
      from: MOCK_ACCOUNT,
      origin: ORIGIN_METAMASK,
      networkClientId: MOCK_NETWORK_CLIENT_ID,
      disableHook: true,
      disableSequential: true,
      transactions: [
        {
          params: {
            to: ARBITRUM_USDC.address,
            data: MOCK_TRANSFER_DATA,
          },
          type: TransactionType.perpsWithdraw,
        },
      ],
    });
  });

  it('navigates back and shows a retryable error toast when addTransactionBatch fails', async () => {
    const error = new Error('batch failed');
    mockAddTransactionBatch.mockRejectedValueOnce(error);

    const { result } = renderHook(() => usePerpsWithdrawConfirmation());

    await expect(
      act(async () => {
        await result.current.withdrawWithConfirmation();
      }),
    ).rejects.toThrow('batch failed');

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockWithdrawalStartFailed).toHaveBeenCalledWith(
      expect.any(Function),
    );
    expect(mockShowToast).toHaveBeenCalledWith(mockWithdrawalStartFailedToast);

    act(() => {
      retryWithdraw?.();
    });

    expect(mockNavigateToConfirmation).toHaveBeenCalledTimes(2);
    expect(mockAddTransactionBatch).toHaveBeenCalledTimes(2);
  });

  it('normalizes non-Error addTransactionBatch failures before rethrowing', async () => {
    mockAddTransactionBatch.mockRejectedValueOnce('batch failed');

    const { result } = renderHook(() => usePerpsWithdrawConfirmation());

    await expect(
      act(async () => {
        await result.current.withdrawWithConfirmation();
      }),
    ).rejects.toThrow('batch failed');

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(mockWithdrawalStartFailedToast);
  });

  it('does not show the start failure toast when the user rejects the confirmation', async () => {
    const error = providerErrors.userRejectedRequest();
    mockAddTransactionBatch.mockRejectedValueOnce(error);

    const { result } = renderHook(() => usePerpsWithdrawConfirmation());

    await expect(
      act(async () => {
        await result.current.withdrawWithConfirmation();
      }),
    ).rejects.toThrow(error.message);

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockWithdrawalStartFailed).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('swallows retry failures after showing another retryable error toast', async () => {
    mockAddTransactionBatch
      .mockRejectedValueOnce(new Error('batch failed'))
      .mockRejectedValueOnce(new Error('retry failed'));

    const { result } = renderHook(() => usePerpsWithdrawConfirmation());

    await expect(
      act(async () => {
        await result.current.withdrawWithConfirmation();
      }),
    ).rejects.toThrow('batch failed');

    act(() => {
      retryWithdraw?.();
    });

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(2);
    });

    expect(mockNavigateToConfirmation).toHaveBeenCalledTimes(2);
    expect(mockShowToast).toHaveBeenCalledTimes(2);
    expect(mockWithdrawalStartFailed).toHaveBeenCalledTimes(2);
  });
});
