import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import ImmersveFundingApproval from './ImmersveFundingApproval';
import Routes from '../../../../../constants/navigation/Routes';
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
      default:
        return undefined;
    }
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({ countryKey: 'GB' }),
}));

jest.mock('../../hooks/useImmersveSpendingPrerequisites');
jest.mock('../../hooks/useImmersveFunding');
jest.mock('../../hooks/useImmersveOnboardingRouter');

const mockRefresh = jest.fn().mockResolvedValue(null);
const mockRoute = jest.fn();
const mockExecuteFunding = jest.fn();
const mockCreateCard = jest.fn();

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
    createFundingSource: jest.fn(),
    isLoading,
    error,
  });
};

describe('ImmersveFundingApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      reset: mockReset,
    });
    (useImmersveOnboardingRouter as jest.Mock).mockReturnValue(mockRoute);
    mockExecuteFunding.mockResolvedValue('0xtxhash');
    mockCreateCard.mockResolvedValue({ cardId: 'card-1' });
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
});
