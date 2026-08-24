import React from 'react';
import { BackHandler } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import CancelMembership from './CancelMembership';
import { CancelMembershipTestIds } from './CancelMembership.testIds';
import Routes from '../../../../../constants/navigation/Routes';

// ─── Navigation ───────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockAddListener = jest.fn().mockReturnValue(jest.fn());

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      addListener: mockAddListener,
    }),
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the container', () => {
    const { getByTestId } = renderScreen();

    expect(getByTestId(CancelMembershipTestIds.CONTAINER)).toBeOnTheScreen();
  });

  it('starts on the survey step', () => {
    const { getByTestId, queryByTestId } = renderScreen();

    expect(getByTestId(CancelMembershipTestIds.TITLE)).toBeOnTheScreen();
    expect(
      queryByTestId(CancelMembershipTestIds.SUCCESS_TITLE),
    ).not.toBeOnTheScreen();
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
    expect(queryByTestId(CancelMembershipTestIds.TITLE)).not.toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates back to the existing ProHub root when done is pressed on the success step', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));
    fireEvent.press(getByTestId(CancelMembershipTestIds.SUCCESS_DONE_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.ROOT, {
      source: 'pro_subscription_cancellation_success',
    });
  });

  // ── Gesture / navigation interception ─────────────────────────────────────

  describe('gesture and navigation interception', () => {
    it('registers a beforeRemove listener on the success step', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

      expect(mockAddListener).toHaveBeenCalledWith(
        'beforeRemove',
        expect.any(Function),
      );
    });

    it('beforeRemove handler prevents default and calls navigate to ProHub root', () => {
      let beforeRemoveHandler:
        | ((e: { preventDefault: () => void }) => void)
        | undefined;
      mockAddListener.mockImplementation(
        (
          event: string,
          handler: (e: { preventDefault: () => void }) => void,
        ) => {
          if (event === 'beforeRemove') {
            beforeRemoveHandler = handler;
          }
          return jest.fn();
        },
      );

      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

      expect(beforeRemoveHandler).toBeDefined();

      const mockPreventDefault = jest.fn();
      beforeRemoveHandler?.({ preventDefault: mockPreventDefault });

      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.ROOT, {
        source: 'pro_subscription_cancellation_success',
      });
    });
  });

  // ── Android hardware back button ──────────────────────────────────────────

  describe('Android hardware back button', () => {
    it('does not register a BackHandler listener on the survey step', () => {
      const addSpy = jest.spyOn(BackHandler, 'addEventListener');

      renderScreen();

      expect(addSpy).not.toHaveBeenCalled();
    });

    it('registers a BackHandler listener once the success step is reached', () => {
      const addSpy = jest.spyOn(BackHandler, 'addEventListener');

      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

      expect(addSpy).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
    });

    it('behaves like pressing Done (navigates to ProHub root) instead of popping the screen', () => {
      let backPressHandler: (() => boolean) | undefined;
      jest
        .spyOn(BackHandler, 'addEventListener')
        .mockImplementation((_event, handler) => {
          backPressHandler = handler as () => boolean;
          return { remove: jest.fn() };
        });

      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

      expect(backPressHandler).toBeDefined();
      const handled = backPressHandler?.();

      expect(handled).toBe(true);
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.ROOT, {
        source: 'pro_subscription_cancellation_success',
      });
    });

    it('removes the BackHandler listener on unmount so it cannot leak into other screens', () => {
      const mockRemove = jest.fn();
      jest
        .spyOn(BackHandler, 'addEventListener')
        .mockReturnValue({ remove: mockRemove });

      const { getByTestId, unmount } = renderScreen();
      fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));
      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });
});
