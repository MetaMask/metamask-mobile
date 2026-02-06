import { Alert } from 'react-native';
import { waitFor } from '@testing-library/react-native';
import { errorCodes } from '@metamask/rpc-errors';
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
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
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

const mockAlert = jest.fn();
Alert.alert = mockAlert;

const mockState = {
  state: evmSendStateMock,
};

describe('useSendActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSendContext.mockReturnValue({
      asset: {
        chainId: '0x1',
        address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        decimals: 2,
        isNative: true,
      },
      chainId: '0x1',
      from: ACCOUNT_ADDRESS_MOCK_1,
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
      } as unknown as ReturnType<typeof useSendContext>);
    });

    it('shows alert with translated error for snap validation errors with errors array', async () => {
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
        expect(mockAlert).toHaveBeenCalledWith('Insufficient funds');
        expect(mockNavigate).not.toHaveBeenCalledWith('TransactionsView');
      });
    });

    it('shows alert with generic error when valid: false without errors array', async () => {
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
        expect(mockAlert).toHaveBeenCalledWith('Transaction error');
        expect(mockNavigate).not.toHaveBeenCalledWith('TransactionsView');
      });
    });

    it('shows alert with translated error for InsufficientBalanceToCoverFee error code', async () => {
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
        expect(mockAlert).toHaveBeenCalledWith(
          'Insufficient balance to cover fees',
        );
      });
    });

    it('does not show alert on user rejection', async () => {
      const userRejectionError = Object.assign(new Error('User rejected'), {
        code: errorCodes.provider.userRejectedRequest,
      });
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockRejectedValue(userRejectionError);

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(mockAlert).not.toHaveBeenCalled();
      });
    });

    it('shows alert with generic error for snap/internal errors (non-user-rejection)', async () => {
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockRejectedValue(new Error('Snap execution failed'));

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Transaction error');
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
        expect(mockAlert).not.toHaveBeenCalled();
      });
    });
  });
});
