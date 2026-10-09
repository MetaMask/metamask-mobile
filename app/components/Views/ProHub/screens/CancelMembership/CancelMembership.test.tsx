import React from 'react';
import { BackHandler } from 'react-native';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  CANCELLATION_REASONS,
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
  getCancelReasonCheckmarkTestId,
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

  it('starts on the reason step', () => {
    const { getByTestId, queryByTestId } = renderScreen();

    expect(getByTestId(CancelMembershipTestIds.TITLE)).toBeOnTheScreen();
    expect(queryByTestId(CancelMembershipTestIds.STAY_QUESTION)).toBeNull();
  });

  it('calls goBack when the back button on the reason step is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('calls goBack when keep membership is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.KEEP_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  // ── Two-step survey ───────────────────────────────────────────────────────

  describe('two-step survey', () => {
    it('advances to the stay step when a reason is selected', () => {
      const { getByTestId, queryByTestId } = renderScreen();

      fireEvent.press(
        getByTestId(getCancelReasonTestId(CANCELLATION_REASONS.TOO_EXPENSIVE)),
      );

      expect(
        getByTestId(CancelMembershipTestIds.STAY_QUESTION),
      ).toBeOnTheScreen();
      expect(
        getByTestId(CancelMembershipTestIds.STAY_QUESTION_INPUT),
      ).toBeOnTheScreen();
      expect(queryByTestId(CancelMembershipTestIds.TITLE)).toBeNull();
      expect(queryByTestId(CancelMembershipTestIds.REASONS_LIST)).toBeNull();
    });

    it('advances to the stay step when other is selected', () => {
      const { getByTestId, queryByTestId } = renderScreen();

      fireEvent.press(
        getByTestId(getCancelReasonTestId(CANCELLATION_REASONS.OTHER)),
      );

      expect(
        getByTestId(CancelMembershipTestIds.STAY_QUESTION),
      ).toBeOnTheScreen();
      expect(queryByTestId(CancelMembershipTestIds.TITLE)).toBeNull();
    });

    it('returns to the reason step with the selection preserved when back is pressed', () => {
      const { getByTestId, queryByTestId } = renderScreen();
      fireEvent.press(
        getByTestId(getCancelReasonTestId(CANCELLATION_REASONS.TOO_EXPENSIVE)),
      );

      fireEvent.press(getByTestId(CancelMembershipTestIds.BACK_BUTTON));

      expect(getByTestId(CancelMembershipTestIds.TITLE)).toBeOnTheScreen();
      expect(
        getByTestId(
          getCancelReasonCheckmarkTestId(CANCELLATION_REASONS.TOO_EXPENSIVE),
        ),
      ).toBeOnTheScreen();
      expect(queryByTestId(CancelMembershipTestIds.STAY_QUESTION)).toBeNull();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('keeps typed stay feedback after going back and selecting another reason', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(
        getByTestId(getCancelReasonTestId(CANCELLATION_REASONS.TOO_EXPENSIVE)),
      );
      fireEvent.changeText(
        getByTestId(CancelMembershipTestIds.STAY_QUESTION_INPUT),
        'Lower the price',
      );
      fireEvent.press(getByTestId(CancelMembershipTestIds.BACK_BUTTON));
      fireEvent.press(
        getByTestId(
          getCancelReasonTestId(CANCELLATION_REASONS.NOT_USING_BENEFITS),
        ),
      );

      expect(
        getByTestId(CancelMembershipTestIds.STAY_QUESTION_INPUT).props.value,
      ).toBe('Lower the price');
    });

    it('calls goBack when keep membership is pressed on the stay step', () => {
      const { getByTestId } = renderScreen();
      fireEvent.press(
        getByTestId(getCancelReasonTestId(CANCELLATION_REASONS.TOO_EXPENSIVE)),
      );

      fireEvent.press(getByTestId(CancelMembershipTestIds.KEEP_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not block leaving by gesture on the stay step', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(
        getByTestId(getCancelReasonTestId(CANCELLATION_REASONS.TOO_EXPENSIVE)),
      );

      expect(mockSetOptions).toHaveBeenLastCalledWith({
        gestureEnabled: true,
      });
    });

    it('redirects beforeRemove on the stay step back to the reason step', () => {
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
      const { getByTestId, queryByTestId } = renderScreen();
      fireEvent.press(
        getByTestId(getCancelReasonTestId(CANCELLATION_REASONS.TOO_EXPENSIVE)),
      );
      expect(beforeRemoveHandler).toBeDefined();

      const mockPreventDefault = jest.fn();
      act(() => {
        beforeRemoveHandler?.({ preventDefault: mockPreventDefault });
      });

      expect(mockPreventDefault).toHaveBeenCalledTimes(1);
      expect(getByTestId(CancelMembershipTestIds.TITLE)).toBeOnTheScreen();
      expect(queryByTestId(CancelMembershipTestIds.STAY_QUESTION)).toBeNull();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not register a beforeRemove listener on the reason step', () => {
      renderScreen();

      expect(mockAddListener).not.toHaveBeenCalledWith(
        'beforeRemove',
        expect.any(Function),
      );
    });

    it('redirects the Android hardware back button on the stay step to the reason step', () => {
      let backPressHandler: (() => boolean) | undefined;
      jest
        .spyOn(BackHandler, 'addEventListener')
        .mockImplementation((_event, handler) => {
          backPressHandler = handler as () => boolean;
          return { remove: jest.fn() };
        });
      const { getByTestId, queryByTestId } = renderScreen();
      fireEvent.press(
        getByTestId(getCancelReasonTestId(CANCELLATION_REASONS.TOO_EXPENSIVE)),
      );
      expect(backPressHandler).toBeDefined();

      let handled: boolean | undefined;
      act(() => {
        handled = backPressHandler?.();
      });

      expect(handled).toBe(true);
      expect(getByTestId(CancelMembershipTestIds.TITLE)).toBeOnTheScreen();
      expect(queryByTestId(CancelMembershipTestIds.STAY_QUESTION)).toBeNull();
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  it('cancels at period end without a reason when the survey is skipped', async () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalled());

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
    expect(mockGoBack).not.toHaveBeenCalled();
    expectPostCancellationReset();
  });

  it('includes the selected reason code and omits free-text feedback', async () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(
      getByTestId(getCancelReasonTestId(CANCELLATION_REASONS.TOO_EXPENSIVE)),
    );
    fireEvent.changeText(
      getByTestId(CancelMembershipTestIds.STAY_QUESTION_INPUT),
      'Lower the price',
    );
    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

    await waitFor(() =>
      expect(mockCancelSubscription).toHaveBeenCalledWith({
        subscriptionId: PLUS_SUBSCRIPTION.id,
        cancelAtPeriodEnd: true,
        cancellationReason: CANCELLATION_REASONS.TOO_EXPENSIVE,
      }),
    );
    expect(mockCancelSubscription.mock.calls[0][0]).not.toHaveProperty(
      'cancellationFeedback',
    );
  });

  it('sends other as the reason code', async () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(
      getByTestId(getCancelReasonTestId(CANCELLATION_REASONS.OTHER)),
    );
    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

    await waitFor(() =>
      expect(mockCancelSubscription).toHaveBeenCalledWith({
        subscriptionId: PLUS_SUBSCRIPTION.id,
        cancelAtPeriodEnd: true,
        cancellationReason: CANCELLATION_REASONS.OTHER,
      }),
    );
    expect(mockCancelSubscription.mock.calls[0][0]).not.toHaveProperty(
      'cancellationFeedback',
    );
  });

  it('cancels immediately and resets the stack to Pro Hub', async () => {
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
    await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
    expectPostCancellationReset();
  });

  it('shows an error and allows retry when cancellation fails', async () => {
    mockCancelSubscription
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValueOnce(undefined);
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

    await waitFor(() =>
      expect(
        getByTestId(CancelMembershipTestIds.ERROR_MESSAGE),
      ).toBeOnTheScreen(),
    );
    expect(mockDispatch).not.toHaveBeenCalled();

    fireEvent.press(getByTestId(CancelMembershipTestIds.CANCEL_BUTTON));

    await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
    expect(mockCancelSubscription).toHaveBeenCalledTimes(2);
    expectPostCancellationReset();
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

    it('does not block the reset to Pro Hub once the request succeeds', async () => {
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
      await finishCancel();

      expectPostCancellationReset();
      const mockPreventDefault = jest.fn();
      beforeRemoveHandler?.({ preventDefault: mockPreventDefault });
      expect(mockPreventDefault).not.toHaveBeenCalled();
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

  // ── Android hardware back button ──────────────────────────────────────────

  describe('Android hardware back button', () => {
    it('does not register a BackHandler listener on the reason step', () => {
      const addSpy = jest.spyOn(BackHandler, 'addEventListener');

      renderScreen();

      expect(addSpy).not.toHaveBeenCalled();
    });

    it('removes the BackHandler listener on unmount so it cannot leak into other screens', () => {
      const mockRemove = jest.fn();
      jest
        .spyOn(BackHandler, 'addEventListener')
        .mockReturnValue({ remove: mockRemove });

      const { getByTestId, unmount } = renderScreen();
      fireEvent.press(
        getByTestId(getCancelReasonTestId(CANCELLATION_REASONS.TOO_EXPENSIVE)),
      );
      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });
});
