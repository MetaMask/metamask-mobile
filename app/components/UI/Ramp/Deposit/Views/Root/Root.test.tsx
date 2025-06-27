import { waitFor } from '@testing-library/react-native';
import Root from './Root';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockCheckExistingToken = jest.fn();
let mockGetStarted = true;

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
      getStarted: mockGetStarted,
    }),
  };
});

jest.mock(
  './GetStarted/GetStarted',
  () =>
    function MockGetStarted() {
      return null;
    },
);

describe('Root Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStarted = true;
  });

  it('render matches snapshot', () => {
    const screen = renderDepositTestComponent(Root, Routes.DEPOSIT.ROOT);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls checkExistingToken on load', async () => {
    mockCheckExistingToken.mockResolvedValue(false);
    renderDepositTestComponent(Root, Routes.DEPOSIT.ROOT);
    await waitFor(() => {
      expect(mockCheckExistingToken).toHaveBeenCalled();
    });
  });

  it('redirects to BUILD_QUOTE when getStarted is true', async () => {
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

  it('does not redirect when getStarted is false', async () => {
    mockGetStarted = false;
    mockCheckExistingToken.mockResolvedValue(false);
    renderDepositTestComponent(Root, Routes.DEPOSIT.ROOT);
    await waitFor(() => {
      expect(mockReset).not.toHaveBeenCalled();
    });
  });
});
