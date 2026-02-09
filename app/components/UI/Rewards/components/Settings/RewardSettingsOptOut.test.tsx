import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RewardSettingsOptOut from './RewardSettingsOptOut';
import { useOptout } from '../../hooks/useOptout';
import { useMetrics } from '../../../../hooks/useMetrics';
import Routes from '../../../../../constants/navigation/Routes';
import { RewardsMetricsButtons } from '../../utils';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText, View } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => ReactActual.createElement(View, { testID, ...props }, children),
    Text: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => ReactActual.createElement(RNText, props, children),
    TextVariant: {
      BodySm: 'BodySm',
      HeadingSm: 'HeadingSm',
    },
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const ReactActual = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      testID,
      label,
      onPress,
      isDisabled,
    }: {
      testID?: string;
      label: string;
      onPress: () => void;
      isDisabled?: boolean;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          testID,
          onPress,
          disabled: isDisabled,
          accessibilityState: { disabled: isDisabled },
        },
        ReactActual.createElement(Text, {}, label),
      ),
    ButtonVariants: {
      Secondary: 'secondary',
    },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../hooks/useOptout', () => ({
  useOptout: jest.fn(),
}));

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    REWARDS_PAGE_BUTTON_CLICKED: 'REWARDS_PAGE_BUTTON_CLICKED',
  },
}));

const mockUseOptout = useOptout as jest.MockedFunction<typeof useOptout>;
const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;

describe('RewardSettingsOptOut', () => {
  const mockShowOptoutBottomSheet = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn(() => ({
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn(() => ({ event: 'REWARDS_PAGE_BUTTON_CLICKED' })),
  }));

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseOptout.mockReturnValue({
      optout: jest.fn().mockResolvedValue(true),
      isLoading: false,
      showOptoutBottomSheet: mockShowOptoutBottomSheet,
    });

    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
      addTraitsToUser: jest.fn(),
      isEnabled: true,
      enable: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getDataDeletionTaskStatus: jest.fn(),
      getDataDeletionTaskId: jest.fn(),
      getDataDeletionTaskUrl: jest.fn(),
    } as never);
  });

  describe('Rendering', () => {
    it('renders the opt-out section with correct testID', () => {
      const { getByTestId } = render(<RewardSettingsOptOut />);

      expect(getByTestId('rewards-settings-opt-out')).toBeOnTheScreen();
    });

    it('renders the opt-out button', () => {
      const { getByTestId } = render(<RewardSettingsOptOut />);

      expect(getByTestId('rewards-opt-out-button')).toBeOnTheScreen();
    });

    it('renders the title and description text', () => {
      const { getByText } = render(<RewardSettingsOptOut />);

      expect(getByText('rewards.optout.title')).toBeOnTheScreen();
      expect(getByText('rewards.optout.description')).toBeOnTheScreen();
    });

    it('renders the button label', () => {
      const { getByText } = render(<RewardSettingsOptOut />);

      expect(getByText('rewards.optout.confirm')).toBeOnTheScreen();
    });
  });

  describe('Opt-out Button State', () => {
    it('disables opt-out button when isLoading is true', () => {
      mockUseOptout.mockReturnValue({
        optout: jest.fn().mockResolvedValue(true),
        isLoading: true,
        showOptoutBottomSheet: mockShowOptoutBottomSheet,
      });

      const { getByTestId } = render(<RewardSettingsOptOut />);

      const optOutButton = getByTestId('rewards-opt-out-button');
      expect(optOutButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('enables opt-out button when isLoading is false', () => {
      mockUseOptout.mockReturnValue({
        optout: jest.fn().mockResolvedValue(true),
        isLoading: false,
        showOptoutBottomSheet: mockShowOptoutBottomSheet,
      });

      const { getByTestId } = render(<RewardSettingsOptOut />);

      const optOutButton = getByTestId('rewards-opt-out-button');
      expect(optOutButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('Opt-out Button Interaction', () => {
    it('calls showOptoutBottomSheet with correct route when pressed', () => {
      const { getByTestId } = render(<RewardSettingsOptOut />);

      const optOutButton = getByTestId('rewards-opt-out-button');
      fireEvent.press(optOutButton);

      expect(mockShowOptoutBottomSheet).toHaveBeenCalledTimes(1);
      expect(mockShowOptoutBottomSheet).toHaveBeenCalledWith(
        Routes.REWARDS_SETTINGS_VIEW,
      );
    });

    it('tracks metric event when button is pressed', () => {
      const { getByTestId } = render(<RewardSettingsOptOut />);

      const optOutButton = getByTestId('rewards-opt-out-button');
      fireEvent.press(optOutButton);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'REWARDS_PAGE_BUTTON_CLICKED',
      );
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('tracks metric event with correct button_type property', () => {
      const mockAddProperties = jest.fn().mockReturnThis();
      const mockBuild = jest.fn(() => ({
        event: 'REWARDS_PAGE_BUTTON_CLICKED',
        properties: { button_type: RewardsMetricsButtons.OPT_OUT },
      }));

      mockCreateEventBuilder.mockReturnValue({
        addProperties: mockAddProperties,
        build: mockBuild,
      });

      const { getByTestId } = render(<RewardSettingsOptOut />);

      const optOutButton = getByTestId('rewards-opt-out-button');
      fireEvent.press(optOutButton);

      expect(mockAddProperties).toHaveBeenCalledWith({
        button_type: RewardsMetricsButtons.OPT_OUT,
      });
      expect(mockBuild).toHaveBeenCalled();
    });
  });
});
