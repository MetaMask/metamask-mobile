import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import RewardsEnvironmentToggle from './RewardsEnvironmentToggle';
import { cancelBulkLink } from '../../../../../store/sagas/rewardsBulkLinkAccountGroups';
import {
  resetRewardsState,
  setCandidateSubscriptionId,
} from '../../../../../reducers/rewards';
import { resetRewardsMoneyState } from '../../../../../reducers/rewardsMoney';

const DEV_URL = 'https://rewards.dev-api.cx.metamask.io';
const UAT_URL = 'https://rewards.uat-api.cx.metamask.io';
const PRD_URL = 'https://rewards.api.cx.metamask.io';
const MONEY_DEV_URL = 'https://rewards-money.dev-api.cx.metamask.io';
const MONEY_UAT_URL = 'https://rewards-money.uat-api.cx.metamask.io';
const MONEY_PRD_URL = 'https://rewards-money.api.cx.metamask.io';

jest.mock('../../../../../core/AppConstants', () => ({
  REWARDS_API_URL: {
    DEV: 'https://rewards.dev-api.cx.metamask.io',
    UAT: 'https://rewards.uat-api.cx.metamask.io',
    PRD: 'https://rewards.api.cx.metamask.io',
  },
  REWARDS_MONEY_API_URL: {
    DEV: 'https://rewards-money.dev-api.cx.metamask.io',
    UAT: 'https://rewards-money.uat-api.cx.metamask.io',
    PRD: 'https://rewards-money.api.cx.metamask.io',
  },
}));

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../store/sagas/rewardsBulkLinkAccountGroups', () => ({
  cancelBulkLink: jest.fn(() => ({ type: 'BULK_LINK_CANCEL' })),
}));

jest.mock('../../../../../reducers/rewardsMoney', () => ({
  resetRewardsMoneyState: jest.fn(() => ({
    type: 'rewardsMoney/resetRewardsMoneyState',
  })),
}));

jest.mock('../../../../../constants/navigation/Routes', () => ({
  REWARDS_ONBOARDING_FLOW: 'RewardsOnboardingFlow',
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    const MockBottomSheet = ReactActual.forwardRef(
      (
        {
          children,
          onClose,
        }: { children?: React.ReactNode; onClose?: () => void },
        ref: React.Ref<unknown>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: () => onClose?.(),
        }));
        return ReactActual.createElement(View, null, children);
      },
    );
    MockBottomSheet.displayName = 'MockBottomSheet';
    return { __esModule: true, default: MockBottomSheet };
  },
);

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.settings.environment_selector': 'Environment',
      'bottom_nav.rewards': 'Rewards',
      'bottom_nav.money': 'Money',
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
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return PRD_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return PRD_URL;
      return undefined;
    });

    const { getByTestId } = render(<RewardsEnvironmentToggle />);

    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));

    expect(getByTestId(`environment-option-${DEV_URL}`)).toBeTruthy();
    expect(getByTestId(`environment-option-${UAT_URL}`)).toBeTruthy();
    expect(getByTestId(`environment-option-${PRD_URL}`)).toBeTruthy();
  });

  it('closes sheet when header close button is pressed', () => {
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return PRD_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return PRD_URL;
      return undefined;
    });

    const { getByTestId, queryByTestId } = render(<RewardsEnvironmentToggle />);

    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));
    expect(getByTestId(`environment-option-${DEV_URL}`)).toBeOnTheScreen();

    fireEvent.press(getByTestId('environment-sheet-close-button'));

    expect(queryByTestId(`environment-option-${DEV_URL}`)).toBeNull();
  });

  it('shows a "Default" badge next to the env that matches the default', () => {
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return DEV_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return UAT_URL;
      return undefined;
    });

    const { getByTestId, getByText } = render(<RewardsEnvironmentToggle />);

    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));

    expect(getByText('Default')).toBeTruthy();
  });

  it('shows no "Default" badge when no env matches the default', () => {
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return DEV_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return 'https://unknown.env';
      return undefined;
    });

    const { getByTestId, queryByText } = render(<RewardsEnvironmentToggle />);

    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));

    expect(queryByText('Default')).toBeNull();
  });

  it('calls setRewardsEnvUrl when a different env option is pressed', async () => {
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return PRD_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return PRD_URL;
      return undefined;
    });

    const { getByTestId } = render(<RewardsEnvironmentToggle />);

    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));
    fireEvent.press(getByTestId(`environment-option-${DEV_URL}`));

    await waitFor(() => {
      expect(mockCall).toHaveBeenCalledWith(
        'RewardsController:setRewardsEnvUrl',
        DEV_URL,
      );
    });
  });

  it('does not call setRewardsEnvUrl when the already-selected env is pressed', async () => {
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return PRD_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return PRD_URL;
      return undefined;
    });

    const { getByTestId } = render(<RewardsEnvironmentToggle />);

    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));
    fireEvent.press(getByTestId(`environment-option-${PRD_URL}`));

    expect(mockCall).not.toHaveBeenCalledWith(
      'RewardsController:setRewardsEnvUrl',
      expect.anything(),
    );
  });

  it('dispatches cancelBulkLink, resetRewardsState, and setCandidateSubscriptionId(retry) after changing env', async () => {
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return PRD_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return PRD_URL;
      return undefined;
    });

    const { getByTestId } = render(<RewardsEnvironmentToggle />);

    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));
    fireEvent.press(getByTestId(`environment-option-${DEV_URL}`));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(cancelBulkLink());
      expect(mockDispatch).toHaveBeenCalledWith(resetRewardsState());
      expect(mockDispatch).toHaveBeenCalledWith(
        setCandidateSubscriptionId('retry'),
      );
    });
  });

  it('does not dispatch or navigate when re-selecting the current env', async () => {
    mockCall.mockImplementation((action: string) => {
      if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
      if (action === 'RewardsController:getRewardsEnvUrl') return PRD_URL;
      if (action === 'RewardsController:getDefaultRewardsEnvUrl')
        return PRD_URL;
      return undefined;
    });

    const { getByTestId } = render(<RewardsEnvironmentToggle />);

    fireEvent.press(getByTestId('rewards-environment-toggle-trigger'));
    fireEvent.press(getByTestId(`environment-option-${PRD_URL}`));

    await waitFor(() => {
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('exports a valid React component', () => {
    expect(RewardsEnvironmentToggle).toBeDefined();
    expect(typeof RewardsEnvironmentToggle).toBe('function');
  });

  describe('Money environment field', () => {
    const mockMoneyAllowed = (
      current = MONEY_UAT_URL,
      fallback = MONEY_UAT_URL,
    ) => {
      mockCall.mockImplementation((action: string) => {
        if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
        if (action === 'RewardsController:getRewardsEnvUrl') return UAT_URL;
        if (action === 'RewardsController:getDefaultRewardsEnvUrl')
          return UAT_URL;
        if (action === 'RewardsMoneyController:canChangeRewardsMoneyEnvUrl')
          return true;
        if (action === 'RewardsMoneyController:getRewardsMoneyEnvUrl')
          return current;
        if (action === 'RewardsMoneyController:getDefaultRewardsMoneyEnvUrl')
          return fallback;
        return undefined;
      });
    };

    it('renders the Money field when the money env may be changed', () => {
      mockMoneyAllowed();

      const { getByTestId, getByText } = render(<RewardsEnvironmentToggle />);

      expect(getByText('Money')).toBeOnTheScreen();
      expect(
        getByTestId('rewards-money-environment-toggle-trigger'),
      ).toBeOnTheScreen();
    });

    it('hides the Money field when the money env may not be changed', () => {
      mockCall.mockImplementation((action: string) => {
        if (action === 'RewardsController:canChangeRewardsEnvUrl') return true;
        if (action === 'RewardsController:getRewardsEnvUrl') return UAT_URL;
        if (action === 'RewardsController:getDefaultRewardsEnvUrl')
          return UAT_URL;
        if (action === 'RewardsMoneyController:canChangeRewardsMoneyEnvUrl')
          return false;
        return undefined;
      });

      const { getByTestId, queryByTestId } = render(
        <RewardsEnvironmentToggle />,
      );

      expect(
        getByTestId('rewards-environment-toggle-trigger'),
      ).toBeOnTheScreen();
      expect(
        queryByTestId('rewards-money-environment-toggle-trigger'),
      ).toBeNull();
    });

    it('renders only the Money field when Rewards env changes are closed', () => {
      mockCall.mockImplementation((action: string) => {
        if (action === 'RewardsController:canChangeRewardsEnvUrl') return false;
        if (action === 'RewardsMoneyController:canChangeRewardsMoneyEnvUrl')
          return true;
        if (action === 'RewardsMoneyController:getRewardsMoneyEnvUrl')
          return MONEY_DEV_URL;
        if (action === 'RewardsMoneyController:getDefaultRewardsMoneyEnvUrl')
          return MONEY_DEV_URL;
        return undefined;
      });

      const { getByTestId, queryByTestId } = render(
        <RewardsEnvironmentToggle />,
      );

      expect(
        getByTestId('rewards-money-environment-toggle-trigger'),
      ).toBeOnTheScreen();
      expect(queryByTestId('rewards-environment-toggle-trigger')).toBeNull();
    });

    it('lists the money hosts after opening the Money sheet', () => {
      mockMoneyAllowed(MONEY_PRD_URL, MONEY_PRD_URL);

      const { getByTestId } = render(<RewardsEnvironmentToggle />);

      fireEvent.press(getByTestId('rewards-money-environment-toggle-trigger'));

      expect(
        getByTestId(`money-environment-option-${MONEY_DEV_URL}`),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`money-environment-option-${MONEY_UAT_URL}`),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`money-environment-option-${MONEY_PRD_URL}`),
      ).toBeOnTheScreen();
    });

    it('calls setRewardsMoneyEnvUrl and resets the money slice when a different host is pressed', async () => {
      mockMoneyAllowed(MONEY_PRD_URL, MONEY_PRD_URL);

      const { getByTestId } = render(<RewardsEnvironmentToggle />);

      fireEvent.press(getByTestId('rewards-money-environment-toggle-trigger'));
      fireEvent.press(getByTestId(`money-environment-option-${MONEY_DEV_URL}`));

      await waitFor(() => {
        expect(mockCall).toHaveBeenCalledWith(
          'RewardsMoneyController:setRewardsMoneyEnvUrl',
          MONEY_DEV_URL,
        );
        expect(mockDispatch).toHaveBeenCalledWith(resetRewardsMoneyState());
      });
    });

    it('does not call setRewardsMoneyEnvUrl when the current money host is pressed', async () => {
      mockMoneyAllowed(MONEY_PRD_URL, MONEY_PRD_URL);

      const { getByTestId } = render(<RewardsEnvironmentToggle />);

      fireEvent.press(getByTestId('rewards-money-environment-toggle-trigger'));
      fireEvent.press(getByTestId(`money-environment-option-${MONEY_PRD_URL}`));

      expect(mockCall).not.toHaveBeenCalledWith(
        'RewardsMoneyController:setRewardsMoneyEnvUrl',
        expect.anything(),
      );
      expect(mockDispatch).not.toHaveBeenCalledWith(resetRewardsMoneyState());
    });
  });
});
