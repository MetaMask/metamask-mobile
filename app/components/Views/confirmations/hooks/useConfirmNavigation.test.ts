import Routes from '../../../../constants/navigation/Routes';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { ConfirmationLoader } from '../components/confirm/confirm-component';
import { useConfirmNavigation } from './useConfirmNavigation';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const STACK_MOCK = 'SomeStack';

function runHook() {
  return renderHookWithProvider(useConfirmNavigation, { state: {} });
}

describe('useConfirmNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to confirmation with stack', () => {
    const { navigateToConfirmation } = runHook().result.current;

    navigateToConfirmation({
      stack: STACK_MOCK,
      loader: ConfirmationLoader.PerpsDeposit,
    });

    expect(mockNavigate).toHaveBeenCalledWith(STACK_MOCK, {
      screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      params: { loader: ConfirmationLoader.PerpsDeposit },
    });
  });

  it('navigates to confirmation without stack', () => {
    const { navigateToConfirmation } = runHook().result.current;

    navigateToConfirmation({
      loader: ConfirmationLoader.PerpsDeposit,
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      { params: { loader: ConfirmationLoader.PerpsDeposit } },
    );
  });
});
