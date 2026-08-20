import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CancelMembership from './CancelMembership';
import { CancelMembershipTestIds } from './CancelMembership.testIds';
import Routes from '../../../../../constants/navigation/Routes';

// ─── Navigation ───────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  };
});

// ─── Tailwind ─────────────────────────────────────────────────────────────────

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: unknown[]) => ({}),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderScreen = () => render(<CancelMembership />);

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('CancelMembership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the container', () => {
    const { getByTestId } = renderScreen();

    expect(getByTestId(CancelMembershipTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('starts on the survey step', () => {
    const { getByTestId, queryByTestId } = renderScreen();

    expect(getByTestId(CancelMembershipTestIds.TITLE)).toBeOnTheScreen();
    expect(queryByTestId(CancelMembershipTestIds.SUCCESS_TITLE)).toBeNull();
  });

  it('calls goBack when the back button on the survey step is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('calls goBack when keep membership is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.KEEP_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('switches to the success step when the cancel button is pressed, without navigating away', () => {
    const { getByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

    expect(
      getByTestId(CancelMembershipTestIds.SUCCESS_TITLE),
    ).toBeOnTheScreen();
    expect(queryByTestId(CancelMembershipTestIds.TITLE)).toBeNull();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates back to the existing ProHub root (popping Membership/CancelMembership) when done is pressed on the success step', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));
    fireEvent.press(getByTestId(CancelMembershipTestIds.SUCCESS_DONE_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.ROOT, {
      source: 'pro_subscription_cancellation_success',
    });
  });
});
