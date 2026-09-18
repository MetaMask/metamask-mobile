import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import Routes from '../../../../constants/navigation/Routes';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { ConfirmationLoader } from '../components/confirm/confirm-component';
import { useConfirmNavigation } from './useConfirmNavigation';
import { act } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { StackActions } from '@react-navigation/native';
import { selectTransactions } from '../../../../selectors/transactionController';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    dispatch: mockDispatch,
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  state: { TransactionController: { transactions: [] } },
  context: { ApprovalController: { rejectRequest: jest.fn() } },
}));

jest.mock('../../../../selectors/transactionController', () => ({
  ...jest.requireActual('../../../../selectors/transactionController'),
  selectTransactions: jest.fn(),
}));

const STACK_MOCK = 'SomeStack';
const TRANSACTION_ID_MOCK = '123-456';

function runHook({ transactions }: { transactions?: TransactionMeta[] } = {}) {
  jest.mocked(selectTransactions).mockReturnValue(transactions ?? []);

  return renderHookWithProvider(useConfirmNavigation, {
    state: {},
  });
}

describe('useConfirmNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(selectTransactions).mockReturnValue([]);
  });

  it('navigates to confirmation with stack', () => {
    const { navigateToConfirmation } = runHook().result.current;

    navigateToConfirmation({
      stack: STACK_MOCK,
      loader: ConfirmationLoader.CustomAmount,
    });

    expect(mockNavigate).toHaveBeenCalledWith(STACK_MOCK, {
      screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      params: { loader: ConfirmationLoader.CustomAmount },
    });
  });

  it('navigates to confirmation without stack', () => {
    const { navigateToConfirmation } = runHook().result.current;

    navigateToConfirmation({
      loader: ConfirmationLoader.CustomAmount,
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      { loader: ConfirmationLoader.CustomAmount },
    );
  });

  it('replaces stacked confirmation route when replace is enabled', () => {
    const { navigateToConfirmation } = runHook().result.current;

    navigateToConfirmation({
      stack: STACK_MOCK,
      loader: ConfirmationLoader.CustomAmount,
      replace: true,
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(STACK_MOCK, {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        params: { loader: ConfirmationLoader.CustomAmount },
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('replaces confirmation route without stack when replace is enabled', () => {
    const { navigateToConfirmation } = runHook().result.current;

    navigateToConfirmation({
      loader: ConfirmationLoader.CustomAmount,
      replace: true,
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(
        Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        {
          loader: ConfirmationLoader.CustomAmount,
        },
      ),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to alternate route if headerShown is false', () => {
    const { navigateToConfirmation } = runHook().result.current;

    navigateToConfirmation({
      headerShown: false,
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER,
      {},
    );
  });

  it('navigates forced bottom sheets directly instead of through the parent stack', () => {
    const { navigateToConfirmation } = runHook().result.current;

    navigateToConfirmation({
      stack: STACK_MOCK,
      loader: ConfirmationLoader.CustomAmount,
      amount: '5',
      forceBottomSheet: true,
      bottomSheetHeightPercentage: 72,
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.CONFIRMATION_REQUEST_MODAL,
      {
        amount: '5',
        bottomSheetHeightPercentage: 72,
        forceBottomSheet: true,
        loader: ConfirmationLoader.CustomAmount,
      },
    );
    expect(mockNavigate).not.toHaveBeenCalledWith(
      STACK_MOCK,
      expect.any(Object),
    );
  });

  it('replaces forced bottom sheet route without nesting it in the parent stack', () => {
    const { navigateToConfirmation } = runHook().result.current;

    navigateToConfirmation({
      stack: STACK_MOCK,
      loader: ConfirmationLoader.CustomAmount,
      amount: '5',
      forceBottomSheet: true,
      replace: true,
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.CONFIRMATION_REQUEST_MODAL, {
        amount: '5',
        forceBottomSheet: true,
        loader: ConfirmationLoader.CustomAmount,
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('rejects pending transactions before navigating if custom amount loader', async () => {
    const { result } = runHook({
      transactions: [
        {
          id: TRANSACTION_ID_MOCK,
          status: TransactionStatus.unapproved,
        } as TransactionMeta,
      ],
    });

    const { navigateToConfirmation } = result.current;

    await act(async () => {
      navigateToConfirmation({
        headerShown: false,
        loader: ConfirmationLoader.CustomAmount,
      });
    });

    const approvalControllerMock = jest.mocked(
      Engine.context.ApprovalController,
    );

    expect(approvalControllerMock.rejectRequest).toHaveBeenCalledTimes(1);
    expect(approvalControllerMock.rejectRequest).toHaveBeenCalledWith(
      TRANSACTION_ID_MOCK,
      expect.anything(),
    );
  });
});
