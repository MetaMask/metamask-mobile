import React from 'react';
import { BackHandler } from 'react-native';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  CANCEL_TYPES,
  PAYMENT_TYPES,
  PRODUCT_TYPES,
  RECURRING_INTERVALS,
  SUBSCRIPTION_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import CancelMembership from './CancelMembership';
import {
  CancelMembershipTestIds,
  getCancelReasonTestId,
} from './CancelMembership.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { POST_CANCELLATION_PRO_HUB_SOURCE } from './CancelMembership.utils';

// ─── Navigation ───────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockSetOptions = jest.fn();
const mockAddListener = jest.fn();
const mockCancelSubscription = jest.fn();
const mockGetSubscriptionByProduct = jest.fn();
const mockLoggerError = jest.fn();

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

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SubscriptionController: {
        cancelSubscription: (...args: unknown[]) =>
          mockCancelSubscription(...args),
        getSubscriptionByProduct: (...args: unknown[]) =>
          mockGetSubscriptionByProduct(...args),
      },
    },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}));

const PLUS_SUBSCRIPTION: Subscription = {
  id: 'subscription-1',
  products: [
    {
      name: PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
      currency: 'usd',
      unitAmount: 499,
      unitDecimals: 2,
    },
  ],
  currentPeriodStart: '2027-06-20T12:00:00.000Z',
  currentPeriodEnd: '2027-07-20T12:00:00.000Z',
  status: SUBSCRIPTION_STATUSES.active,
  interval: RECURRING_INTERVALS.year,
  paymentMethod: {
    type: PAYMENT_TYPES.byCard,
    card: {
      brand: 'visa',
      displayBrand: 'Visa',
      last4: '4242',
    },
  },
  cancelType: CANCEL_TYPES.ALLOWED_AT_PERIOD_END,
  isEligibleForSupport: true,
};
const FORMATTED_PERIOD_END = new Date(
  PLUS_SUBSCRIPTION.currentPeriodEnd,
).toLocaleDateString(undefined, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
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

const expectPostCancellationReset = (shouldReturnToProHub = true) => {
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  const stackReducer = mockDispatch.mock.calls[0][0] as (
    state: typeof mockProFlowState,
  ) => unknown;

  expect(typeof stackReducer).toBe('function');
  expect(stackReducer(mockProFlowState)).toEqual(
    expect.objectContaining({
      type: 'RESET',
      payload: expect.objectContaining({
        index: shouldReturnToProHub ? 1 : 0,
        routes: shouldReturnToProHub
          ? [
              { key: 'home', name: 'Home' },
              {
                name: Routes.PRO_HUB.ROOT,
                params: { source: POST_CANCELLATION_PRO_HUB_SOURCE },
              },
            ]
          : [{ key: 'home', name: 'Home' }],
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
    mockGetSubscriptionByProduct.mockReturnValue(PLUS_SUBSCRIPTION);
    mockCancelSubscription.mockResolvedValue(undefined);
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

  it('shows the stay question after a reason is selected', () => {
    const { getByTestId, queryByTestId } = renderScreen();

    expect(queryByTestId(CancelMembershipTestIds.STAY_QUESTION)).toBeNull();

    fireEvent.press(getByTestId(getCancelReasonTestId('too_expensive')));

    expect(
      getByTestId(CancelMembershipTestIds.STAY_QUESTION),
    ).toBeOnTheScreen();
  });

  it('shows the other reason input after other is selected', () => {
    const { getByTestId, queryByTestId } = renderScreen();

    expect(
      queryByTestId(CancelMembershipTestIds.OTHER_REASON_INPUT),
    ).toBeNull();

    fireEvent.press(getByTestId(getCancelReasonTestId('other')));

    expect(
      getByTestId(CancelMembershipTestIds.OTHER_REASON_INPUT),
    ).toBeOnTheScreen();
  });

  it('hides the other reason input after switching from other to a different reason', () => {
    const { getByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByTestId(getCancelReasonTestId('other')));
    fireEvent.press(getByTestId(getCancelReasonTestId('too_expensive')));

    expect(
      queryByTestId(CancelMembershipTestIds.OTHER_REASON_INPUT),
    ).toBeNull();
  });

  it('keeps typed other reason text after switching away from other and back', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(getCancelReasonTestId('other')));
    fireEvent.changeText(
      getByTestId(CancelMembershipTestIds.OTHER_REASON_INPUT),
      'Too many emails',
    );
    fireEvent.press(getByTestId(getCancelReasonTestId('too_expensive')));
    fireEvent.press(getByTestId(getCancelReasonTestId('other')));

    expect(
      getByTestId(CancelMembershipTestIds.OTHER_REASON_INPUT).props.value,
    ).toBe('Too many emails');
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

  it('cancels at period end without a reason when the survey is skipped', async () => {
    const { getByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

    await waitFor(() =>
      expect(
        getByTestId(CancelMembershipTestIds.SUCCESS_TITLE),
      ).toBeOnTheScreen(),
    );

    expect(mockGetSubscriptionByProduct).toHaveBeenCalledWith(
      PRODUCT_TYPES.MONEY_ACCOUNT_PLUS,
    );
    expect(mockCancelSubscription).toHaveBeenCalledWith({
      subscriptionId: PLUS_SUBSCRIPTION.id,
      cancelAtPeriodEnd: true,
    });
    expect(mockCancelSubscription.mock.calls[0][0]).not.toHaveProperty(
      'cancellationReason',
    );
    expect(mockCancelSubscription.mock.calls[0][0]).not.toHaveProperty(
      'cancellationFeedback',
    );
    expect(
      getByTestId(CancelMembershipTestIds.SUCCESS_DESCRIPTION),
    ).toHaveTextContent(new RegExp(FORMATTED_PERIOD_END));
    expect(queryByTestId(CancelMembershipTestIds.TITLE)).not.toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('includes the selected reason code and omits free-text feedback', async () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(getCancelReasonTestId('too_expensive')));
    fireEvent.changeText(
      getByTestId(CancelMembershipTestIds.STAY_QUESTION_INPUT),
      'Lower the price',
    );
    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

    await waitFor(() =>
      expect(mockCancelSubscription).toHaveBeenCalledWith({
        subscriptionId: PLUS_SUBSCRIPTION.id,
        cancelAtPeriodEnd: true,
        cancellationReason: 'too_expensive',
      }),
    );
    expect(mockCancelSubscription.mock.calls[0][0]).not.toHaveProperty(
      'cancellationFeedback',
    );
  });

  it('sends other as the reason code without typed other text', async () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(getCancelReasonTestId('other')));
    fireEvent.changeText(
      getByTestId(CancelMembershipTestIds.OTHER_REASON_INPUT),
      'Too many emails',
    );
    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

    await waitFor(() =>
      expect(mockCancelSubscription).toHaveBeenCalledWith({
        subscriptionId: PLUS_SUBSCRIPTION.id,
        cancelAtPeriodEnd: true,
        cancellationReason: 'other',
      }),
    );
    expect(mockCancelSubscription.mock.calls[0][0]).not.toHaveProperty(
      'cancellationFeedback',
    );
  });

  it('passes immediate timing to the controller and success screen', async () => {
    mockGetSubscriptionByProduct.mockReturnValue({
      ...PLUS_SUBSCRIPTION,
      cancelType: CANCEL_TYPES.ALLOWED_IMMEDIATE,
    });
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

    await waitFor(() =>
      expect(mockCancelSubscription).toHaveBeenCalledWith({
        subscriptionId: PLUS_SUBSCRIPTION.id,
        cancelAtPeriodEnd: false,
      }),
    );
    expect(
      getByTestId(CancelMembershipTestIds.SUCCESS_DESCRIPTION),
    ).toHaveTextContent(/your benefits have ended/);

    fireEvent.press(getByTestId(CancelMembershipTestIds.SUCCESS_DONE_BUTTON));
    expectPostCancellationReset(false);
  });

  it('shows an error and allows retry when cancellation fails', async () => {
    mockCancelSubscription
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValueOnce(undefined);
    const { getByTestId, queryByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

    await waitFor(() =>
      expect(
        getByTestId(CancelMembershipTestIds.ERROR_MESSAGE),
      ).toBeOnTheScreen(),
    );
    expect(queryByTestId(CancelMembershipTestIds.SUCCESS_TITLE)).toBeNull();

    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

    await waitFor(() =>
      expect(
        getByTestId(CancelMembershipTestIds.SUCCESS_TITLE),
      ).toBeOnTheScreen(),
    );
    expect(mockCancelSubscription).toHaveBeenCalledTimes(2);
  });

  it('does not cancel when the subscription disallows cancellation', async () => {
    mockGetSubscriptionByProduct.mockReturnValue({
      ...PLUS_SUBSCRIPTION,
      cancelType: CANCEL_TYPES.NOT_ALLOWED,
    });
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

    await waitFor(() =>
      expect(
        getByTestId(CancelMembershipTestIds.ERROR_MESSAGE),
      ).toBeOnTheScreen(),
    );
    expect(mockCancelSubscription).not.toHaveBeenCalled();
  });

  it('resets the stack to Pro Hub on top of the origin screen when done is pressed on the success step', async () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));
    await waitFor(() =>
      expect(
        getByTestId(CancelMembershipTestIds.SUCCESS_DONE_BUTTON),
      ).toBeOnTheScreen(),
    );
    fireEvent.press(getByTestId(CancelMembershipTestIds.SUCCESS_DONE_BUTTON));

    expectPostCancellationReset();
  });

  // ── In-flight cancellation ────────────────────────────────────────────────

  describe('while the cancellation request is in flight', () => {
    let resolveCancel: () => void;
    let rejectCancel: (error: Error) => void;

    const startCancel = async () => {
      mockCancelSubscription.mockImplementation(
        () =>
          new Promise<void>((resolve, reject) => {
            resolveCancel = resolve;
            rejectCancel = reject;
          }),
      );
      const screen = renderScreen();
      fireEvent.press(
        screen.getByTestId(CancelMembershipTestIds.CANCEL_BUTTON),
      );
      await waitFor(() => expect(mockCancelSubscription).toHaveBeenCalled());
      return screen;
    };

    // Lets the pending request settle so the resulting state updates happen
    // inside act(), rather than after the test ends.
    const finishCancel = async () => {
      await act(async () => {
        resolveCancel();
      });
    };

    const failCancel = async () => {
      await act(async () => {
        rejectCancel(new Error('Request failed'));
      });
    };

    it('ignores the header back button', async () => {
      const { getByTestId } = await startCancel();

      fireEvent.press(getByTestId(CancelMembershipTestIds.BACK_BUTTON));

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      await finishCancel();
    });

    it('ignores keep membership', async () => {
      const { getByTestId } = await startCancel();

      fireEvent.press(getByTestId(CancelMembershipTestIds.KEEP_BUTTON));

      expect(mockGoBack).not.toHaveBeenCalled();
      await finishCancel();
    });

    it('does not start a second cancellation request', async () => {
      const { getByTestId } = await startCancel();

      fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

      expect(mockCancelSubscription).toHaveBeenCalledTimes(1);
      await finishCancel();
    });

    it('disables the iOS swipe-back gesture', async () => {
      await startCancel();

      expect(mockSetOptions).toHaveBeenLastCalledWith({
        gestureEnabled: false,
      });
      await finishCancel();
    });

    it('blocks programmatic navigation away without resetting the stack', async () => {
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

      await startCancel();
      await waitFor(() => expect(beforeRemoveHandler).toBeDefined());

      const mockPreventDefault = jest.fn();
      beforeRemoveHandler?.({ preventDefault: mockPreventDefault });

      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
      expect(mockDispatch).not.toHaveBeenCalled();
      await finishCancel();
    });

    it('swallows the Android hardware back button', async () => {
      let backPressHandler: (() => boolean) | undefined;
      jest
        .spyOn(BackHandler, 'addEventListener')
        .mockImplementation((_event, handler) => {
          backPressHandler = handler as () => boolean;
          return { remove: jest.fn() };
        });

      await startCancel();
      await waitFor(() => expect(backPressHandler).toBeDefined());

      expect(backPressHandler?.()).toBe(true);
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      await finishCancel();
    });

    it('re-enables leaving after the request fails', async () => {
      const { getByTestId } = await startCancel();

      await failCancel();

      await waitFor(() =>
        expect(
          getByTestId(CancelMembershipTestIds.ERROR_MESSAGE),
        ).toBeOnTheScreen(),
      );
      fireEvent.press(getByTestId(CancelMembershipTestIds.BACK_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  // ── Gesture / navigation interception ─────────────────────────────────────

  describe('gesture and navigation interception', () => {
    it('registers a beforeRemove listener on the success step', async () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

      await waitFor(() =>
        expect(mockAddListener).toHaveBeenCalledWith(
          'beforeRemove',
          expect.any(Function),
        ),
      );
    });

    it('beforeRemove handler prevents default and resets to Pro Hub on top of the origin screen', async () => {
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

      await waitFor(() =>
        expect(
          getByTestId(CancelMembershipTestIds.SUCCESS_TITLE),
        ).toBeOnTheScreen(),
      );
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

    it('registers a BackHandler listener once the success step is reached', async () => {
      const addSpy = jest.spyOn(BackHandler, 'addEventListener');

      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

      await waitFor(() =>
        expect(addSpy).toHaveBeenCalledWith(
          'hardwareBackPress',
          expect.any(Function),
        ),
      );
    });

    it('behaves like pressing Done (resets to Pro Hub on top of the origin screen) instead of popping the screen', async () => {
      let backPressHandler: (() => boolean) | undefined;
      jest
        .spyOn(BackHandler, 'addEventListener')
        .mockImplementation((_event, handler) => {
          backPressHandler = handler as () => boolean;
          return { remove: jest.fn() };
        });

      const { getByTestId } = renderScreen();
      fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

      await waitFor(() =>
        expect(
          getByTestId(CancelMembershipTestIds.SUCCESS_TITLE),
        ).toBeOnTheScreen(),
      );
      const handled = backPressHandler?.();

      expect(handled).toBe(true);
      expect(mockGoBack).not.toHaveBeenCalled();
      expectPostCancellationReset();
    });

    it('removes the BackHandler listener on unmount so it cannot leak into other screens', async () => {
      const mockRemove = jest.fn();
      jest
        .spyOn(BackHandler, 'addEventListener')
        .mockReturnValue({ remove: mockRemove });

      const { getByTestId, unmount } = renderScreen();
      fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));
      await waitFor(() =>
        expect(
          getByTestId(CancelMembershipTestIds.SUCCESS_TITLE),
        ).toBeOnTheScreen(),
      );
      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });
});
