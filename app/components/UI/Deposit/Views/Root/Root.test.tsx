import { waitFor } from '@testing-library/react-native';
import Root from './Root';
import Routes from '../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockCheckExistingToken = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
      reset: mockReset,
    }),
  };
});

jest.mock('../../sdk', () => {
  const actual = jest.requireActual('../../sdk');
  return {
    ...actual,
    useDepositSDK: () => ({
      checkExistingToken: mockCheckExistingToken,
    }),
  };
});

describe('Root Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to BUILD_QUOTE when no token exists', async () => {
    mockCheckExistingToken.mockResolvedValue(false);

    renderDepositTestComponent(Root, Routes.DEPOSIT.ROOT);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: Routes.DEPOSIT.BUILD_QUOTE,
            params: { animationEnabled: false },
          },
        ],
      });
    });
  });

  it('redirects to VERIFY_IDENTITY when token exists', async () => {
    mockCheckExistingToken.mockResolvedValue(true);

    renderDepositTestComponent(Root, Routes.DEPOSIT.ROOT);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: Routes.DEPOSIT.VERIFY_IDENTITY,
            params: { animationEnabled: false },
          },
        ],
      });
    });
  });

  it('does not reset navigation until initialRoute is set', async () => {
    mockCheckExistingToken.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(false), 100);
        }),
    );
    renderDepositTestComponent(Root, Routes.DEPOSIT.ROOT);
    expect(mockReset).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: Routes.DEPOSIT.BUILD_QUOTE,
            params: { animationEnabled: false },
          },
        ],
      });
    });
  });
});
