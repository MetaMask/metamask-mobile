import { waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  ACCOUNT_ADDRESS_MOCK_1,
  ACCOUNT_ADDRESS_MOCK_2,
  evmSendStateMock,
  solanaSendStateMock,
  SOLANA_ASSET,
} from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
// eslint-disable-next-line import/no-namespace
import * as SendUtils from '../../utils/send';
// eslint-disable-next-line import/no-namespace
import * as SendExitMetrics from './metrics/useSendExitMetrics';
// eslint-disable-next-line import/no-namespace
import * as MultichainSnaps from '../../utils/multichain-snaps';
// eslint-disable-next-line import/no-namespace
import * as SendType from './useSendType';
import { useSendActions } from './useSendActions';

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockPop = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    pop: mockPop,
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {
        chainId: '0x1',
      },
    },
    name: 'send_route',
  }),
}));

const mockState = {
  state: evmSendStateMock,
};

describe('useSendActions', () => {
  const mockUpdateSubmitErrorDefault = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateSubmitErrorDefault.mockClear();
    mockPop.mockClear();
    mockUseSendContext.mockReturnValue({
      asset: {
        chainId: '0x1',
        address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        decimals: 2,
        isNative: true,
      },
      chainId: '0x1',
      from: ACCOUNT_ADDRESS_MOCK_1,
      updateSubmitError: mockUpdateSubmitErrorDefault,
    } as unknown as ReturnType<typeof useSendContext>);
  });

  it('return function submitSend, cancelSend', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    expect(result.current.handleSubmitPress).toBeDefined();
    expect(result.current.handleCancelPress).toBeDefined();
  });

  it('calls navigation.navigate with correct params when evm ', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    jest.spyOn(SendUtils, 'submitEvmTransaction').mockImplementation(jest.fn());
    result.current.handleSubmitPress();
    expect(mockNavigate).toHaveBeenCalledWith('RedesignedConfirmations', {
      params: { maxValueMode: undefined },
      loader: 'transfer',
    });
  });

  it('calls navigation.goBack when handleBackPress is invoked', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    result.current.handleBackPress();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls navigation.goBack when handleCancelPress is invoked', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    result.current.handleCancelPress();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('capture metrics when handleCancelPress is invoked', () => {
    const mockCaptureSendExit = jest.fn();
    jest
      .spyOn(SendExitMetrics, 'useSendExitMetrics')
      .mockReturnValue({ captureSendExit: mockCaptureSendExit });
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    result.current.handleCancelPress();
    expect(mockCaptureSendExit).toHaveBeenCalled();
  });

  describe('non-EVM send error handling', () => {
    const mockUpdateSubmitError = jest.fn();

    beforeEach(() => {
      jest.spyOn(SendType, 'useSendType').mockReturnValue({
        isEvmSendType: false,
        isPredefinedEvm: false,
        isEvmNativeSendType: false,
        isNonEvmNativeSendType: true,
        isNonEvmSendType: true,
        isSolanaSendType: true,
        isPredefinedSolana: false,
        isBitcoinSendType: false,
        isPredefinedBitcoin: false,
        isTronSendType: false,
        isPredefinedTron: false,
      });

      mockUseSendContext.mockReturnValue({
        asset: SOLANA_ASSET,
        chainId: SOLANA_ASSET.chainId,
        from: ACCOUNT_ADDRESS_MOCK_2,
        to: ACCOUNT_ADDRESS_MOCK_2,
        value: '10',
        fromAccount: {
          id: 'solana-account-id',
          address: ACCOUNT_ADDRESS_MOCK_2,
          metadata: {
            snap: {
              id: 'npm:@metamask/solana-wallet-snap',
            },
          },
        },
        updateSubmitError: mockUpdateSubmitError,
      } as unknown as ReturnType<typeof useSendContext>);
    });

    it('handles snap validation errors with errors array for non-evm send', async () => {
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockResolvedValue({
          valid: false,
          errors: [{ code: 'InsufficientBalance' }],
        });

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(mockUpdateSubmitError).toHaveBeenCalledWith(
          'Insufficient funds',
        );
        // Should navigate back 2 screens to Amount screen
        expect(mockPop).toHaveBeenCalledWith(2);
      });
    });

    it('handles valid: false without errors array for non-evm send', async () => {
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockResolvedValue({
          valid: false,
          // No errors array - should still show generic error
        });

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        // Should show generic error message when valid: false but no errors array
        expect(mockUpdateSubmitError).toHaveBeenCalledWith('Transaction error');
        // Should navigate back 2 screens to Amount screen
        expect(mockPop).toHaveBeenCalledWith(2);
      });
    });

    it('handles InsufficientBalanceToCoverFee error code', async () => {
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockResolvedValue({
          valid: false,
          errors: [{ code: 'InsufficientBalanceToCoverFee' }],
        });

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(mockUpdateSubmitError).toHaveBeenCalledWith(
          'Insufficient balance to cover fees',
        );
        // Should navigate back 2 screens to Amount screen
        expect(mockPop).toHaveBeenCalledWith(2);
      });
    });

    it('handles user rejection for non-evm send', async () => {
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockRejectedValue(new Error('User rejected'));

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        // Should clear error for user rejection
        expect(mockUpdateSubmitError).toHaveBeenCalledWith(undefined);
        // Should navigate back 2 screens to Amount screen
        expect(mockPop).toHaveBeenCalledWith(2);
      });
    });

    it('navigates to transactions view on successful submission', async () => {
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockResolvedValue({
          transactionId: 'tx123',
          status: 'submitted',
        });

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('TransactionsView');
      });
    });

    it('clears previous submit error before submission', async () => {
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockResolvedValue({
          transactionId: 'tx123',
          status: 'submitted',
        });

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        // First call should clear the error, then navigates successfully
        expect(mockUpdateSubmitError).toHaveBeenCalledWith(undefined);
      });
    });
  });
});
