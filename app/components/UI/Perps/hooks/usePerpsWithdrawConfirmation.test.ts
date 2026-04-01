import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { renderHook, act } from '@testing-library/react-native';
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

const MOCK_ACCOUNT = '0x1234567890123456789012345678901234567890' as Hex;
const MOCK_TRANSFER_DATA = '0xabcdef' as Hex;
const MOCK_NETWORK_CLIENT_ID = 'arbitrum-mainnet';
const mockNavigateToConfirmation = jest.fn();

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

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelectSelectedInternalAccountAddress.mockReturnValue(MOCK_ACCOUNT);
    mockSelectDefaultEndpointByChainId.mockReturnValue({
      networkClientId: MOCK_NETWORK_CLIENT_ID,
    } as never);
    mockGenerateTransferData.mockReturnValue(MOCK_TRANSFER_DATA);
    mockAddTransactionBatch.mockResolvedValue(undefined as never);
    mockUseConfirmNavigation.mockReturnValue({
      navigateToConfirmation: mockNavigateToConfirmation,
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

  it('logs error to console when addTransactionBatch fails', async () => {
    const error = new Error('batch failed');
    mockAddTransactionBatch.mockRejectedValueOnce(error);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => usePerpsWithdrawConfirmation());

    await act(async () => {
      await result.current.withdrawWithConfirmation();
    });

    // Allow the rejected promise .catch to fire
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(consoleSpy).toHaveBeenCalledWith('Perps transaction error', error);
    consoleSpy.mockRestore();
  });
});
