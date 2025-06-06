import { waitFor } from '@testing-library/react-native';
import Root from './Root';
import Routes from '../../../../../../constants/navigation/Routes';
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

  it('redirects to BUILD_QUOTE', async () => {
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
});
