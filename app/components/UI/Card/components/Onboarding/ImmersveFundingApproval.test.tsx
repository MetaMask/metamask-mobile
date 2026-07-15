import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'fs-1'),
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

jest.mock('../../../AnimatedSpinner', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID: testID || 'animated-spinner' }),
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

jest.mock('./OnboardingStep', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ({ formFields }: { formFields: React.ReactNode }) =>
    ReactActual.createElement(View, { testID: 'onboarding-step' }, formFields);
});

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
    }: React.PropsWithChildren<{ onPress?: () => void; testID?: string }>) =>
      ReactActual.createElement(
        TouchableOpacity,
        { onPress, testID },
        children,
      ),
    ButtonVariant: { Primary: 'Primary' },
    ButtonSize: { Lg: 'Lg' },
    TextVariant: { BodyMd: 'BodyMd' },
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockNavigate = jest.fn();
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
      navigate: mockNavigate,
      reset: mockReset,
    });
    (useImmersveOnboardingRouter as jest.Mock).mockReturnValue(mockRoute);
    mockExecuteFunding.mockResolvedValue('0xtxhash');
    mockCreateCard.mockResolvedValue({ cardId: 'card-1' });
    setFundingState();
    setNextAction(null);
  });

  it('polls on mount and renders the spinner before a nextAction resolves', () => {
    const { getByTestId } = render(<ImmersveFundingApproval />);
    expect(mockRefresh).toHaveBeenCalled();
    expect(getByTestId('immersve-funding-approval-spinner')).toBeTruthy();
  });

  it('renders the confirm button when nextAction is funding', () => {
    setNextAction({ type: 'funding', write: WRITE });
    const { getByTestId, queryByTestId } = render(<ImmersveFundingApproval />);

    expect(
      getByTestId('immersve-funding-approval-confirm-button'),
    ).toBeTruthy();
    expect(queryByTestId('immersve-funding-approval-spinner')).toBeNull();
  });

  it('approves funding and refreshes prerequisites on confirm', async () => {
    setNextAction({ type: 'funding', write: WRITE });
    const { getByTestId } = render(<ImmersveFundingApproval />);

    fireEvent.press(getByTestId('immersve-funding-approval-confirm-button'));

    await waitFor(() => {
      expect(mockExecuteFunding).toHaveBeenCalledWith(WRITE);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(2); // mount + post-approve
  });

  it('shows the spinner (not the confirm button) while submitting', () => {
    setNextAction({ type: 'funding', write: WRITE });
    setFundingState(true);
    const { getByTestId, queryByTestId } = render(<ImmersveFundingApproval />);

    expect(getByTestId('immersve-funding-approval-spinner')).toBeTruthy();
    expect(
      queryByTestId('immersve-funding-approval-confirm-button'),
    ).toBeNull();
  });

  it('creates the card once when nextAction becomes active, then resets to Card Home', async () => {
    setNextAction({ type: 'active' });
    const { rerender } = render(<ImmersveFundingApproval />);

    await waitFor(() => {
      expect(mockCreateCard).toHaveBeenCalledWith('fs-1');
    });
    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });

    // Re-render with the same active action must not re-create the card.
    rerender(<ImmersveFundingApproval />);
    expect(mockCreateCard).toHaveBeenCalledTimes(1);
  });

  it('shows an error and a retry button when createCard fails', async () => {
    mockCreateCard.mockRejectedValue(new Error('boom'));
    setNextAction({ type: 'active' });
    setFundingState(false, 'Something went wrong');
    const { getByTestId } = render(<ImmersveFundingApproval />);

    await waitFor(() => {
      expect(getByTestId('immersve-funding-approval-error')).toBeTruthy();
    });

    fireEvent.press(getByTestId('immersve-funding-approval-retry-button'));
    expect(mockCreateCard).toHaveBeenCalledWith('fs-1');
  });

  it('shows an error and re-enables the confirm retry when executeFunding fails', () => {
    setNextAction({ type: 'funding', write: WRITE });
    setFundingState(false, 'Approval failed');
    const { getByTestId } = render(<ImmersveFundingApproval />);

    fireEvent.press(getByTestId('immersve-funding-approval-retry-button'));
    expect(mockExecuteFunding).toHaveBeenCalledWith(WRITE);
  });

  it('delegates unexpected next actions to the shared router', () => {
    const action: ImmersveNextAction = { type: 'rejected' };
    setNextAction(action);
    render(<ImmersveFundingApproval />);

    expect(mockRoute).toHaveBeenCalledWith(action, { countryKey: 'GB' });
    expect(mockCreateCard).not.toHaveBeenCalled();
  });
});
