import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { StackActions } from '@react-navigation/native';
import { act } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { usePredictConfirmNavigation } from './usePredictConfirmNavigation';

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
  context: {
    ApprovalController: {
      reject: jest.fn(),
    },
  },
}));

const TRANSACTION_ID_MOCK = '123-456';

function runHook({ transactions }: { transactions?: TransactionMeta[] } = {}) {
  return renderHookWithProvider(usePredictConfirmNavigation, {
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

describe('usePredictConfirmNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('always replaces with redesigned confirmations and custom amount loader', () => {
    const { navigateToConfirmation } = runHook().result.current;

    navigateToConfirmation();

    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace(Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER, {
        loader: ConfirmationLoader.CustomAmount,
        animationEnabled: false,
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('rejects pending transactions before navigating', async () => {
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
      navigateToConfirmation();
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
