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
import type { RootParamList } from '../../../../util/navigation/types';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    ApprovalController: {
      reject: jest.fn(),
    },
  },
}));

const STACK_MOCK = 'SomeStack' as keyof RootParamList;
const TRANSACTION_ID_MOCK = '123-456';

function runHook({ transactions }: { transactions?: TransactionMeta[] } = {}) {
  return renderHookWithProvider(useConfirmNavigation, {
    state: {
      engine: {
        backgroundState: {
          TransactionController: {
            transactions: transactions ?? [],
          },
        },
      },
    },
  });
}

describe('useConfirmNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    expect(approvalControllerMock.reject).toHaveBeenCalledTimes(1);
    expect(approvalControllerMock.reject).toHaveBeenCalledWith(
      TRANSACTION_ID_MOCK,
      expect.anything(),
    );
  });
});
