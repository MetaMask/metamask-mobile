import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import RewardsEnvironmentToggle from './RewardsEnvironmentToggle';
import { cancelBulkLink } from '../../../../../store/sagas/rewardsBulkLinkAccountGroups';
import {
  resetRewardsState,
  setCandidateSubscriptionId,
} from '../../../../../reducers/rewards';

const DEV_URL = 'https://rewards.dev-api.cx.metamask.io';
const UAT_URL = 'https://rewards.uat-api.cx.metamask.io';
const PRD_URL = 'https://rewards.api.cx.metamask.io';

jest.mock('../../../../../core/AppConstants', () => ({
  REWARDS_API_URL: {
    DEV: 'https://rewards.dev-api.cx.metamask.io',
    UAT: 'https://rewards.uat-api.cx.metamask.io',
    PRD: 'https://rewards.api.cx.metamask.io',
  },
}));

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
let mockIsEnvSelectorEnabled = true;

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: () => mockIsEnvSelectorEnabled,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../store/sagas/rewardsBulkLinkAccountGroups', () => ({
  cancelBulkLink: jest.fn(() => ({ type: 'BULK_LINK_CANCEL' })),
}));

jest.mock('../../../../../reducers/rewards', () => ({
  resetRewardsState: jest.fn(() => ({ type: 'rewards/resetRewardsState' })),
  setCandidateSubscriptionId: jest.fn((payload) => ({
    type: 'rewards/setCandidateSubscriptionId',
    payload,
  })),
}));

jest.mock('../../../../../constants/navigation/Routes', () => ({
  REWARDS_ONBOARDING_FLOW: 'RewardsOnboardingFlow',
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    Box: function MockBox({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) {
      return ReactActual.createElement(View, { testID, ...props }, children);
    },
    Text: function MockText({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) {
      return ReactActual.createElement(Text, { ...props }, children);
    },
    Button: function MockButton({
      children,
      onPress,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      [key: string]: unknown;
    }) {
      return ReactActual.createElement(
        TouchableOpacity,
        { onPress, testID, ...props },
        ReactActual.createElement(Text, null, children),
      );
    },
    TextVariant: {
      HeadingSm: 'HeadingSm',
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
      BodyMDBold: 'BodyMDBold',
    },
    TextColor: {
      TextAlternative: 'text-alternative',
    },
    ButtonVariant: { Secondary: 'secondary', Primary: 'primary' },
    ButtonSize: { Md: 'md', Sm: 'sm' },
    BoxFlexDirection: { Row: 'row' },
    BoxAlignItems: { center: 'center', Center: 'center' },
    BoxJustifyContent: { Between: 'justify-between' },
  };
});

// Mock BottomSheet
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    const MockBottomSheet = ReactActual.forwardRef(
      (
        { children }: { children?: React.ReactNode },
        ref: React.Ref<unknown>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn(),
        }));
        return ReactActual.createElement(View, null, children);
      },
    );
    MockBottomSheet.displayName = 'MockBottomSheet';
    return { __esModule: true, default: MockBottomSheet };
  },
);

// Mock ListItemSelect
jest.mock(
  '../../../../../component-library/components/List/ListItemSelect',
  () => {
    const { TouchableOpacity } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    return {
      __esModule: true,
      default: function MockListItemSelect({
        children,
        onPress,
        isSelected,
        testID,
      }: {
        children?: React.ReactNode;
        onPress?: () => void;
        isSelected?: boolean;
        testID?: string;
      }) {
        return ReactActual.createElement(
          TouchableOpacity,
          { onPress, testID, accessibilityState: { selected: isSelected } },
          children,
        );
      },
    };
  },
);

// Mock ListItem
jest.mock('../../../../../component-library/components/List/ListItem', () => ({
  VerticalAlignment: { Center: 'center' },
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.settings.environment_selector': 'Environment',
      'rewards.settings.environment_default': 'Default',
    };
    return translations[key] || key;
  }),
}));

// Mock Engine
const mockCall = jest.fn();
jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: (...args: unknown[]) => mockCall(...args),
  },
}));

describe('RewardsEnvironmentToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockClear();
    mockNavigate.mockClear();
    mockIsEnvSelectorEnabled = true;
  });

  it('renders nothing when the rewards-environment-selector feature flag is disabled', () => {
    // Arrange
    mockIsEnvSelectorEnabled = false;
    mockCall.mockReturnValue(true);

    // Act
    const { toJSON } = render(<RewardsEnvironmentToggle />);

    // Assert
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when canChangeRewardsEnvUrl returns false', () => {
    // Arrange
    mockCall.mockReturnValue(false);

    // Act
    const { toJSON } = render(<RewardsEnvironmentToggle />);

    // Assert
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when canChangeRewardsEnvUrl returns undefined (data service not queried)', () => {
    // Arrange
    mockCall.mockReturnValue(undefined);

    // Act
    const { toJSON } = render(<RewardsEnvironmentToggle />);

    // Assert
    expect(toJSON()).toBeNull();
  });

  it('renders the environment selector when canChangeRewardsEnvUrl returns true', () => {
    // Arrange
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return UAT_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return UAT_URL;
      return undefined;
    });

    // Act
    const { getByTestId } = render(<RewardsEnvironmentToggle />);

    // Assert
    expect(getByTestId('rewards-environment-toggle')).toBeTruthy();
  });

  it('calls canChangeRewardsEnvUrl, getRewardsEnvUrl, and getDefaultRewardsEnvUrl on mount when allowed', () => {
    // Arrange
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return PRD_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return PRD_URL;
      return undefined;
    });

    // Act
    render(<RewardsEnvironmentToggle />);

    // Assert
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:canChangeRewardsEnvUrl',
    );
    expect(mockCall).toHaveBeenCalledWith('RewardsController:getRewardsEnvUrl');
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getDefaultRewardsEnvUrl',
    );
  });

  it('does not call getRewardsEnvUrl or getDefaultRewardsEnvUrl when canChangeRewardsEnvUrl returns false', () => {
    // Arrange
    mockCall.mockReturnValue(false);

    // Act
    render(<RewardsEnvironmentToggle />);

    // Assert
    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:canChangeRewardsEnvUrl',
    );
    expect(mockCall).not.toHaveBeenCalledWith(
      'RewardsController:getRewardsEnvUrl',
    );
    expect(mockCall).not.toHaveBeenCalledWith(
      'RewardsController:getDefaultRewardsEnvUrl',
    );
  });

  it('renders all environment options after opening the sheet', () => {
    // Arrange
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return PRD_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return PRD_URL;
      return undefined;
    });

    const { getByTestId, getByText, getAllByText } = render(
      <RewardsEnvironmentToggle />,
    );

    // Act — open the sheet
    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));

    // Assert
    expect(getByText(DEV_URL)).toBeTruthy();
    expect(getByText(UAT_URL)).toBeTruthy();
    // PRD URL appears twice: once in the trigger label, once in the sheet
    expect(getAllByText(PRD_URL).length).toBeGreaterThanOrEqual(1);
  });

  it('shows a "Default" badge next to the env that matches the default', () => {
    // Arrange — current env is DEV but default is UAT
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return DEV_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return UAT_URL;
      return undefined;
    });

    const { getByTestId, getByText } = render(<RewardsEnvironmentToggle />);

    // Act — open the sheet
    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));

    // Assert — "Default" badge is shown (once, next to UAT)
    expect(getByText('Default')).toBeTruthy();
  });

  it('shows no "Default" badge when no env matches the default', () => {
    // Arrange — default returns an unknown URL not in the options list
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return DEV_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return 'https://unknown.env';
      return undefined;
    });

    const { getByTestId, queryByText } = render(<RewardsEnvironmentToggle />);

    // Act — open the sheet
    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));

    // Assert
    expect(queryByText('Default')).toBeNull();
  });

  it('calls setRewardsEnvUrl when a different env option is pressed', async () => {
    // Arrange
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return PRD_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return PRD_URL;
      return undefined;
    });

    const { getByTestId, getByText } = render(<RewardsEnvironmentToggle />);

    // Open the sheet, then press the DEV option
    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));
    fireEvent.press(getByText(DEV_URL));

    // Assert
    await waitFor(() => {
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:setRewardsEnvUrl',
        DEV_URL,
      );
    });
  });

  it('does not call setRewardsEnvUrl when the already-selected env is pressed', async () => {
    // Arrange
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return PRD_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return PRD_URL;
      return undefined;
    });

    const { getByTestId, getAllByText } = render(<RewardsEnvironmentToggle />);

    // Open the sheet, then press the already-selected PRD option
    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));
    fireEvent.press(getAllByText(PRD_URL)[0]);

    // Assert
    expect(mockCall).not.toHaveBeenCalledWith(
      'RewardsController:setRewardsEnvUrl',
      expect.anything(),
    );
  });

  it('dispatches cancelBulkLink, resetRewardsState, and setCandidateSubscriptionId(retry) after changing env', async () => {
    // Arrange
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return PRD_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return PRD_URL;
      return undefined;
    });

    const { getByTestId, getByText } = render(<RewardsEnvironmentToggle />);

    // Act — open sheet and select a different env
    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));
    fireEvent.press(getByText(DEV_URL));

    // Assert — reset flow + trigger immediate candidate subscription re-fetch
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(cancelBulkLink());
      expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());
      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId('retry'),
      );
    });
  });

  it('does not dispatch or navigate when re-selecting the current env', async () => {
    // Arrange
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return PRD_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return PRD_URL;
      return undefined;
    });

    const { getByTestId, getAllByText } = render(<RewardsEnvironmentToggle />);

    // Act — open sheet and press the already-selected env
    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));
    fireEvent.press(getAllByText(PRD_URL)[0]);

    // Assert — no reset or navigation should occur
    await waitFor(() => {
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('exports a valid React component', () => {
    expect(RewardsEnvironmentToggle).toBeDefined();
    expect(typeof RewardsEnvironmentToggle).toBe('function');
  });
});
