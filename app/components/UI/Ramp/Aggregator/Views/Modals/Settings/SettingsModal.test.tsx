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
import { RampsButtonClickData } from '../../../../hooks/useRampsButtonClickData';

const mockButtonClickData: RampsButtonClickData = {
  ramp_routing: undefined,
  is_authenticated: false,
  preferred_provider: undefined,
  order_count: 0,
};

jest.mock('../../../../hooks/useRampsButtonClickData', () => ({
  useRampsButtonClickData: jest.fn(() => mockButtonClickData),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDangerouslyGetParent = jest.fn();
const mockGoToDeposit = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      ...actualReactNavigation.useNavigation(),
      navigate: mockNavigate,
      goBack: mockGoBack,
      dangerouslyGetParent: mockDangerouslyGetParent,
    }),
  };
});

jest.mock('../../../../hooks/useAnalytics', () => () => mockTrackEvent);

jest.mock('../../../../hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(() => ({ goToDeposit: mockGoToDeposit })),
}));

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
      dangerouslyGetParent: jest.fn().mockReturnValue({
        goBack: jest.fn(),
      }),
    });
  });

  it('renders snapshot correctly', () => {
    const { toJSON } = render();
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays settings title in header', () => {
    const { getByText } = render();

    expect(getByText('Settings')).toBeTruthy();
  });

  it('displays view order history menu item', () => {
    const { getByText } = render();

    expect(getByText('View order history')).toBeTruthy();
  });

  it('displays use new buy experience menu item', () => {
    const { getByText } = render();

    expect(getByText('Use new buy experience')).toBeTruthy();
    expect(getByText('Try new native on ramp')).toBeTruthy();
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

  it('navigates to deposit when use new buy experience is pressed', () => {
    const { getByText } = render();
    const newBuyExperienceButton = getByText('Use new buy experience');

    fireEvent.press(newBuyExperienceButton);

    expect(mockDangerouslyGetParent).toHaveBeenCalled();
    expect(mockGoToDeposit).toHaveBeenCalled();
  });

  it('navigates back through parent navigation when deposit is pressed', () => {
    const mockParentGoBack = jest.fn();
    mockDangerouslyGetParent.mockReturnValue({
      dangerouslyGetParent: jest.fn().mockReturnValue({
        goBack: mockParentGoBack,
      }),
    });

    const { getByText } = render();
    const newBuyExperienceButton = getByText('Use new buy experience');

    fireEvent.press(newBuyExperienceButton);

    expect(mockParentGoBack).toHaveBeenCalled();
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

    it('renders add icon for new buy experience', () => {
      const { getByText } = render();

      expect(getByText('Use new buy experience')).toBeTruthy();
    });
  });

  describe('callback functions', () => {
    it('calls navigation callbacks only when menu items are pressed', () => {
      render();

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDangerouslyGetParent).not.toHaveBeenCalled();
    });

    it('tracks event when deposit is pressed', () => {
      const { getByText } = render();
      const newBuyExperienceButton = getByText('Use new buy experience');

      fireEvent.press(newBuyExperienceButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_BUTTON_CLICKED', {
        location: 'Buy Settings Modal',
        ramp_type: 'DEPOSIT',
        region: 'us',
        ramp_routing: undefined,
        is_authenticated: false,
        preferred_provider: undefined,
        order_count: 0,
      });
    });
  });
});
