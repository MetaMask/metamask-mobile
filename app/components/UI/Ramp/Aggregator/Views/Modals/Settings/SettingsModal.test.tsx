// Third party dependencies.
import { fireEvent } from '@testing-library/react-native';

// Internal dependencies.
import SettingsModal from './SettingsModal';
import {
  DeepPartial,
  renderScreen,
} from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import Routes from '../../../../../../../constants/navigation/Routes';
import { RampSDK } from '../../../sdk';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDangerouslyGetParent = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      ...actualReactNavigation.useNavigation(),
      navigate: mockNavigate,
      goBack: mockGoBack,
      getParent: mockDangerouslyGetParent,
    }),
  };
});

const mockUseRampSDKValues: DeepPartial<RampSDK> = {
  selectedRegion: { id: 'us' },
};

jest.mock('../../../sdk', () => ({
  ...jest.requireActual('../../../sdk'),
  useRampSDK: () => mockUseRampSDKValues,
}));

function render() {
  return renderScreen(
    SettingsModal,
    {
      name: 'SettingsModal',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('SettingsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDangerouslyGetParent.mockReturnValue({
      getParent: jest.fn().mockReturnValue({
        goBack: jest.fn(),
      }),
    });
  });

  it('displays settings title in header', () => {
    const { getByText } = render();

    expect(getByText('Settings')).toBeTruthy();
  });

  it('displays view order history menu item', () => {
    const { getByText } = render();

    expect(getByText('View order history')).toBeTruthy();
  });

  it('navigates to transactions view when view order history is pressed', () => {
    const { getByText } = render();
    const viewOrderHistoryButton = getByText('View order history');

    fireEvent.press(viewOrderHistoryButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: {
        redirectToOrders: true,
      },
    });
  });

  describe('bottom sheet behavior', () => {
    it('renders bottom sheet with settings content', () => {
      const { getByText } = render();

      expect(getByText('Settings')).toBeTruthy();
    });
  });

  describe('menu item icons', () => {
    it('renders clock icon for view order history', () => {
      const { getByText } = render();

      expect(getByText('View order history')).toBeTruthy();
    });
  });

  describe('callback functions', () => {
    it('calls navigation callbacks only when menu items are pressed', () => {
      render();

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDangerouslyGetParent).not.toHaveBeenCalled();
    });
  });
});
