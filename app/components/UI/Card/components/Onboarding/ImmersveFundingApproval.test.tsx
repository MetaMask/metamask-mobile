import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import ImmersveFundingApproval from './ImmersveFundingApproval';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import Engine from '../../../../../core/Engine';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import { useImmersveSpendingPrerequisites } from '../../hooks/useImmersveSpendingPrerequisites';
import { useImmersveFunding } from '../../hooks/useImmersveFunding';
import { useImmersveOnboardingRouter } from '../../hooks/useImmersveOnboardingRouter';
import type { ImmersveNextAction } from '../../util/immersvePrerequisites';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../util/networks');

jest.mock('../../../../../core/redux/slices/card', () => ({
  selectImmersveFundingSourceId: 'select-funding-source-id',
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: 'select-account-by-scope',
}));

jest.mock('../../../../../selectors/cardController', () => ({
  selectCardHomeData: 'select-card-home-data',
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  getMemoizedInternalAccountByAddress: jest.fn(
    (_state: unknown, address: string) => ({
      address,
      id: `id-${address}`,
      metadata: { name: 'Funding Account' },
    }),
  ),
}));

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountToGroupMap: 'select-account-to-group-map',
  }),
);

jest.mock('../../../../../selectors/settings', () => ({
  selectAvatarAccountType: 'select-avatar-account-type',
}));

jest.mock('../../../../hooks/multichainAccounts/useAccountGroupName', () => ({
  useAccountGroupName: jest.fn(() => null),
}));

const MOCK_ACCOUNT = {
  address: '0xAccount',
  metadata: { name: 'Account 1' },
};
const mockSelectAccountByScope = jest.fn(() => MOCK_ACCOUNT);

jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector: unknown) => {
    switch (selector) {
      case 'select-funding-source-id':
        return 'fs-1';
      case 'select-account-by-scope':
        return mockSelectAccountByScope;
      case 'select-avatar-account-type':
        return 'default';
      case 'select-card-home-data':
        return null;
      case 'select-account-to-group-map':
        return {};
      default:
        return undefined;
    }
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(() => ({ countryKey: 'GB' })),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    CardController: {
      fetchCardHomeData: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('../../hooks/useCardHeaderHandlers', () => ({
  useCardHeaderHandlers: jest.fn(() => ({})),
}));

jest.mock('../../hooks/useImmersveSpendingPrerequisites', () => ({
  useImmersveSpendingPrerequisites: jest.fn(),
}));
jest.mock('../../hooks/useImmersveFunding', () => ({
  useImmersveFunding: jest.fn(),
}));
jest.mock('../../hooks/useImmersveOnboardingRouter', () => ({
  useImmersveOnboardingRouter: jest.fn(),
}));

const mockRefresh = jest.fn().mockResolvedValue(null);
const mockRoute = jest.fn();
const mockExecuteFunding = jest.fn();
const mockCreateCard = jest.fn();
const mockBuildApproveWrite = jest.fn();
const mockFetchCardHomeData = Engine.context.CardController
  .fetchCardHomeData as jest.Mock;

jest.mock('../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../util/theme');
  return {
    ...actual,
    useTheme: jest.fn(() => actual.mockTheme),
  };
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    })),
  }),
}));

jest.mock('../../util/metrics', () => ({
  CardScreens: { FUNDING_APPROVAL: 'FUNDING_APPROVAL' },
  CardActions: {
    FUNDING_APPROVAL_CONFIRM: 'FUNDING_APPROVAL_CONFIRM',
    FUNDING_APPROVAL_RETRY: 'FUNDING_APPROVAL_RETRY',
  },
  withCardProvider: (
    provider: string | null | undefined,
    properties: Record<string, unknown> = {},
  ) => ({
    provider,
    ...properties,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    Box: ({ children, ...p }: React.PropsWithChildren<object>) =>
      ReactActual.createElement(View, p, children),
    Text: ({ children, ...p }: React.PropsWithChildren<object>) =>
      ReactActual.createElement(Text, p, children),
    Button: ({
      children,
      onPress,
      testID,
      isDisabled,
      isLoading,
    }: React.PropsWithChildren<{
      onPress?: () => void;
      testID?: string;
      isDisabled?: boolean;
      isLoading?: boolean;
    }>) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          onPress,
          testID,
          disabled: isDisabled,
          accessibilityState: { disabled: isDisabled, busy: isLoading },
        },
        children,
      ),
    AvatarAccount: () => null,
    AvatarToken: () => null,
    BadgeWrapper: ({ children }: React.PropsWithChildren<object>) => children,
    BadgeNetwork: () => null,
    HeaderStandard: () => null,
    Icon: () => null,
    AvatarAccountVariant: {
      Jazzicon: 'Jazzicon',
      Blockies: 'Blockies',
      Maskicon: 'Maskicon',
    },
    ButtonVariant: { Primary: 'Primary' },
    ButtonSize: { Lg: 'Lg', Md: 'Md' },
    TextVariant: { BodyMd: 'BodyMd', HeadingLg: 'HeadingLg' },
    AvatarBaseSize: { Sm: 'Sm' },
    BadgeWrapperPosition: { BottomRight: 'BottomRight' },
    IconName: { Danger: 'Danger' },
    IconSize: { Xl: 'Xl' },
    IconColor: { ErrorDefault: 'ErrorDefault' },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockReset = jest.fn();

const WRITE = {
  abi: [],
  contractAddress: '0xToken',
  method: 'approve',
  params: { _spender: '0xSpender', _value: '1' },
};

const setNextAction = (
  nextAction: ImmersveNextAction | null,
  error: string | null = null,
  isLoading = false,
) => {
  (useImmersveSpendingPrerequisites as jest.Mock).mockReturnValue({
    nextAction,
    refresh: mockRefresh,
    prerequisites: [],
    isLoading,
    error,
  });
};

const setFundingState = (isLoading = false, error: string | null = null) => {
  (useImmersveFunding as jest.Mock).mockReturnValue({
    executeFunding: mockExecuteFunding,
    createCard: mockCreateCard,
    buildApproveWrite: mockBuildApproveWrite,
    createFundingSource: jest.fn(),
    isLoading,
    error,
  });
};

describe('ImmersveFundingApproval', () => {
  const mockUseSelectorImplementation = (selector: unknown) => {
    switch (selector) {
      case 'select-funding-source-id':
        return 'fs-1';
      case 'select-account-by-scope':
        return mockSelectAccountByScope;
      case 'select-avatar-account-type':
        return 'default';
      case 'select-card-home-data':
        return null;
      case 'select-account-to-group-map':
        return {};
      default:
        return undefined;
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { useSelector } = jest.requireMock('react-redux');
    useSelector.mockImplementation(mockUseSelectorImplementation);
    (useParams as jest.Mock).mockReturnValue({ countryKey: 'GB' });
    (useNavigation as jest.Mock).mockReturnValue({
      reset: mockReset,
    });
    (useImmersveOnboardingRouter as jest.Mock).mockReturnValue(mockRoute);
    mockExecuteFunding.mockResolvedValue('0xtxhash');
    mockCreateCard.mockResolvedValue({ cardId: 'card-1' });
    mockBuildApproveWrite.mockReturnValue(WRITE);
    mockFetchCardHomeData.mockResolvedValue(undefined);
    setFundingState();
    setNextAction(null);
  });

  it('polls once on mount and shows the loading spinner before a nextAction resolves', () => {
    setNextAction(null, null, true);
    const { getByTestId } = render(<ImmersveFundingApproval />);
    expect(mockRefresh).toHaveBeenCalled();
    expect(getByTestId('immersve-funding-approval-spinner')).toBeTruthy();
  });

  it('shows a full-screen error with retry when the first poll fails', () => {
    setNextAction(null, 'Something went wrong');
    const { getByTestId } = render(<ImmersveFundingApproval />);

    fireEvent.press(getByTestId('immersve-funding-approval-retry-button'));
    expect(mockRefresh).toHaveBeenCalledTimes(2); // mount + retry
  });

  it('renders the settings card and an enabled confirm button once funding is known', () => {
    setNextAction({ type: 'funding', write: WRITE });
    const { getByTestId } = render(<ImmersveFundingApproval />);

    expect(useCardHeaderHandlers).toHaveBeenCalledWith('close-direct');
    expect(getByTestId('immersve-funding-approval-account-row')).toBeTruthy();
    expect(getByTestId('immersve-funding-approval-token-row')).toBeTruthy();
    const button = getByTestId('immersve-funding-approval-confirm-button');
    expect(button.props.accessibilityState.disabled).toBeFalsy();
  });

  it('does not poll in the background while sitting idle on funding (no flicker)', () => {
    jest.useFakeTimers();
    setNextAction({ type: 'funding', write: WRITE });
    render(<ImmersveFundingApproval />);
    expect(mockRefresh).toHaveBeenCalledTimes(1); // mount only

    act(() => {
      jest.advanceTimersByTime(20000);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('keeps the settings card mounted and disables the button while approving (no full-screen swap)', async () => {
    setNextAction({ type: 'funding', write: WRITE });
    const { getByTestId } = render(<ImmersveFundingApproval />);

    fireEvent.press(getByTestId('immersve-funding-approval-confirm-button'));

    expect(mockExecuteFunding).toHaveBeenCalledWith(WRITE, '2199023255551');
    // Settling flips synchronously on press — the card stays mounted, only the
    // button's own state changes.
    expect(getByTestId('immersve-funding-approval-account-row')).toBeTruthy();
    expect(
      getByTestId('immersve-funding-approval-confirm-button').props
        .accessibilityState.disabled,
    ).toBe(true);

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(2)); // mount + post-approve
  });

  it('locally polls for settlement after approving, and stops once active', async () => {
    jest.useFakeTimers();
    setNextAction({ type: 'funding', write: WRITE });
    const { getByTestId, rerender } = render(<ImmersveFundingApproval />);

    await act(async () => {
      fireEvent.press(getByTestId('immersve-funding-approval-confirm-button'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockRefresh).toHaveBeenCalledTimes(2); // mount + post-approve

    await act(async () => {
      jest.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(mockRefresh).toHaveBeenCalledTimes(3); // still 'funding' — settling poll fired

    setNextAction({ type: 'active' });
    rerender(<ImmersveFundingApproval />);

    await act(async () => {
      jest.advanceTimersByTime(20000);
      await Promise.resolve();
    });
    // Settled to active — the local poll must have stopped.
    expect(mockRefresh).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });

  it('creates the card once nextAction becomes active, then resets to Card Home', async () => {
    setNextAction({ type: 'active' });
    render(<ImmersveFundingApproval />);

    await waitFor(() => {
      expect(mockCreateCard).toHaveBeenCalledWith('fs-1');
    });
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
  });

  it('skips createCard and resets to Card Home when a card already exists', async () => {
    const { useSelector } = jest.requireMock('react-redux');
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === 'select-card-home-data') {
        return { card: { id: 'existing-card' } };
      }
      return mockUseSelectorImplementation(selector);
    });
    setNextAction({ type: 'active' });
    render(<ImmersveFundingApproval />);

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    });
    expect(mockCreateCard).not.toHaveBeenCalled();
  });

  it('does not re-create the card on re-render while still active', async () => {
    setNextAction({ type: 'active' });
    const { rerender } = render(<ImmersveFundingApproval />);

    await waitFor(() => {
      expect(mockCreateCard).toHaveBeenCalledTimes(1);
    });

    rerender(<ImmersveFundingApproval />);
    expect(mockCreateCard).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error and re-enables the button to retry when executeFunding fails', () => {
    setNextAction({ type: 'funding', write: WRITE });
    setFundingState(false, 'Approval failed');
    const { getByTestId } = render(<ImmersveFundingApproval />);

    expect(getByTestId('immersve-funding-approval-error').props.children).toBe(
      'Approval failed',
    );
    const retryButton = getByTestId('immersve-funding-approval-retry-button');
    expect(retryButton.props.accessibilityState.disabled).toBeFalsy();

    fireEvent.press(retryButton);
    expect(mockExecuteFunding).toHaveBeenCalledWith(WRITE, '2199023255551');
  });

  it('shows an inline error and retries createCard when it fails', () => {
    setNextAction({ type: 'active' });
    setFundingState(false, 'Card creation failed');
    const { getByTestId } = render(<ImmersveFundingApproval />);

    const retryButton = getByTestId('immersve-funding-approval-retry-button');
    fireEvent.press(retryButton);
    expect(mockCreateCard).toHaveBeenCalledWith('fs-1');
  });

  it('delegates unexpected next actions to the shared router', () => {
    const action: ImmersveNextAction = { type: 'rejected' };
    setNextAction(action);
    render(<ImmersveFundingApproval />);

    expect(mockRoute).toHaveBeenCalledWith(action, { countryKey: 'GB' });
    expect(mockCreateCard).not.toHaveBeenCalled();
  });

  describe('reapprove mode', () => {
    beforeEach(() => {
      (useParams as jest.Mock).mockReturnValue({
        countryKey: 'GB',
        mode: 'reapprove',
      });
    });

    it('renders reapprove copy and skips prerequisite polling', () => {
      const { getByText, getByTestId } = render(<ImmersveFundingApproval />);

      expect(mockRefresh).not.toHaveBeenCalled();
      expect(useCardHeaderHandlers).toHaveBeenCalledWith('back');
      expect(
        getByText(
          'card.card_onboarding.immersve_funding_approval.reapprove.title',
        ),
      ).toBeTruthy();
      expect(
        getByText(
          'card.card_onboarding.immersve_funding_approval.reapprove.description',
        ),
      ).toBeTruthy();
      expect(
        getByTestId('immersve-funding-approval-confirm-button'),
      ).toBeTruthy();
    });

    it('builds a local approve, submits it, refetches home data, and resets to Card Home', async () => {
      (useParams as jest.Mock).mockReturnValue({
        countryKey: 'GB',
        mode: 'reapprove',
        fundingAddress: '0xFunding',
      });
      const { getByTestId } = render(<ImmersveFundingApproval />);

      fireEvent.press(getByTestId('immersve-funding-approval-confirm-button'));

      expect(useImmersveFunding).toHaveBeenCalledWith({
        fundingAddress: '0xFunding',
      });
      expect(mockBuildApproveWrite).toHaveBeenCalledWith('2199023255551');
      expect(mockExecuteFunding).toHaveBeenCalledWith(WRITE, '2199023255551');
      expect(mockCreateCard).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(mockFetchCardHomeData).toHaveBeenCalledWith({ force: true });
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.HOME }],
        });
      });
    });

    it('resets to Card Home when refetch fails after reapprove', async () => {
      mockFetchCardHomeData.mockRejectedValueOnce(new Error('refetch failed'));

      const { getByTestId } = render(<ImmersveFundingApproval />);

      fireEvent.press(getByTestId('immersve-funding-approval-confirm-button'));

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: Routes.CARD.HOME }],
        });
      });
    });

    it('does not create a card when prerequisites report active', () => {
      setNextAction({ type: 'active' });
      render(<ImmersveFundingApproval />);

      expect(mockCreateCard).not.toHaveBeenCalled();
      expect(mockRoute).not.toHaveBeenCalled();
    });
  });
});
