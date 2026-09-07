import React from 'react';
import { BackHandler } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import CancelMembership from './CancelMembership';
import { CancelMembershipTestIds } from './CancelMembership.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { POST_CANCELLATION_PRO_HUB_SOURCE } from './CancelMembership.utils';

// ─── Navigation ───────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockSetOptions = jest.fn();
const mockAddListener = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      dispatch: mockDispatch,
      setOptions: mockSetOptions,
      addListener: mockAddListener,
    }),
  };
});

const mockProFlowState = {
  key: 'stack',
  index: 3,
  routeNames: ['Home', 'ProHub', 'ProHubMembership', 'ProHubCancelMembership'],
  routes: [
    { key: 'home', name: 'Home' },
    { key: 'hub', name: Routes.PRO_HUB.ROOT },
    { key: 'membership', name: Routes.PRO_HUB.MEMBERSHIP },
    { key: 'cancel', name: Routes.PRO_HUB.CANCEL_MEMBERSHIP },
  ],
  type: 'stack',
  stale: false,
};

const expectPostCancellationReset = () => {
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  const stackReducer = mockDispatch.mock.calls[0][0] as (
    state: typeof mockProFlowState,
  ) => unknown;

  expect(typeof stackReducer).toBe('function');
  expect(stackReducer(mockProFlowState)).toEqual(
    expect.objectContaining({
      type: 'RESET',
      payload: expect.objectContaining({
        index: 1,
        routes: [
          { key: 'home', name: 'Home' },
          {
            name: Routes.PRO_HUB.ROOT,
            params: { source: POST_CANCELLATION_PRO_HUB_SOURCE },
          },
        ],
      }),
    }),
  );
};

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
    jest.resetAllMocks();
    mockAddListener.mockReturnValue(jest.fn());
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
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('resets the stack to Pro Hub on top of the origin screen when done is pressed on the success step', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));
    fireEvent.press(getByTestId(CancelMembershipTestIds.SUCCESS_DONE_BUTTON));

    expectPostCancellationReset();
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

    it('beforeRemove handler prevents default and resets to Pro Hub on top of the origin screen', () => {
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
      expectPostCancellationReset();
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

    it('behaves like pressing Done (resets to Pro Hub on top of the origin screen) instead of popping the screen', () => {
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
      expectPostCancellationReset();
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
