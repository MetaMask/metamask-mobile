import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import ManagePriceAlertsView from './ManagePriceAlertsView';
import { ManagePriceAlertsTestIds, type PriceAlert } from '../../constants';
import Routes from '../../../../../../constants/navigation/Routes';
import { ToastContext } from '../../../../../../component-library/components/Toast';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

// Prevents act() warnings caused by useQuery's internal batched updates
notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const mockGoBack = jest.fn();
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
const mockShowToast = jest.fn();

function WithToast({ children }: { children: React.ReactNode }) {
  const ref = React.useRef({ showToast: mockShowToast, closeToast: jest.fn() });
  return (
    <ToastContext.Provider value={{ toastRef: ref }}>
      {children}
    </ToastContext.Provider>
  );
}

const renderView = () => {
  const { Wrapper } = createWrapper();
  return render(
    <Wrapper>
      <WithToast>
        <ManagePriceAlertsView />
      </WithToast>
    </Wrapper>,
  );
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    replace: mockReplace,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {
      symbol: 'ETH',
      ticker: 'ETH',
      currentPrice: 2500,
      currentCurrency: 'USD',
      assetId: 'eip155:1/slip44:60',
    },
  }),
}));

const mockFetchAlerts = jest.fn();
const mockDeleteAlert = jest.fn();
const mockUpdateAlert = jest.fn();
jest.mock('../../api', () => ({
  fetchAlerts: (...args: unknown[]) => mockFetchAlerts(...args),
  deleteAlert: (...args: unknown[]) => mockDeleteAlert(...args),
  updateAlert: (...args: unknown[]) => mockUpdateAlert(...args),
  priceAlertsQueryKey: (assetId: string) => ['priceAlerts', assetId],
}));

const makeAlert = (overrides: Partial<PriceAlert> = {}): PriceAlert => ({
  id: 'alert-1',
  userId: 'user-1',
  asset: 'eip155:1/slip44:60',
  threshold: 3000,
  recurring: true,
  active: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const makeFetchResponse = (alerts: PriceAlert[], ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  json: jest.fn().mockResolvedValue(alerts),
  text: jest.fn().mockResolvedValue(''),
});

const waitForLoaded = (screen: ReturnType<typeof render>) =>
  waitFor(() => {
    expect(screen.queryByTestId(ManagePriceAlertsTestIds.LOADING)).toBeNull();
  });

const makeOkResponse = (status = 204) => ({
  ok: true,
  status,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
});

const makeErrorResponse = (status = 500) => ({
  ok: false,
  status,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockDeleteAlert.mockResolvedValue(makeOkResponse(204));
  mockUpdateAlert.mockResolvedValue(makeOkResponse(200));
});

describe('ManagePriceAlertsView', () => {
  it('shows a loading indicator while the fetch is in-flight', async () => {
    let resolve!: (value: unknown) => void;
    mockFetchAlerts.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );

    const { getByTestId } = renderView();
    expect(getByTestId(ManagePriceAlertsTestIds.LOADING)).toBeOnTheScreen();

    await act(async () => {
      resolve(makeFetchResponse([makeAlert()]));
    });
  });

  it('hides the loading indicator once alerts are loaded', async () => {
    mockFetchAlerts.mockResolvedValue(makeFetchResponse([makeAlert()]));
    const screen = renderView();

    await waitForLoaded(screen);

    expect(screen.queryByTestId(ManagePriceAlertsTestIds.LOADING)).toBeNull();
  });

  it('calls fetchAlerts with the assetId from route params', async () => {
    mockFetchAlerts.mockResolvedValue(makeFetchResponse([makeAlert()]));
    const screen = renderView();

    await waitForLoaded(screen);

    expect(mockFetchAlerts).toHaveBeenCalledWith('eip155:1/slip44:60');
  });

  describe('when alerts are returned', () => {
    const twoAlerts = [
      makeAlert({ id: 'alert-1', threshold: 3000, recurring: true }),
      makeAlert({
        id: 'alert-2',
        threshold: 1500,
        recurring: false,
        active: false,
      }),
    ];

    beforeEach(() => {
      mockFetchAlerts.mockResolvedValue(makeFetchResponse(twoAlerts));
    });

    it('renders one row per alert', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      expect(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_ITEM_PREFIX}-alert-1`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_ITEM_PREFIX}-alert-2`,
        ),
      ).toBeOnTheScreen();
    });

    it('shows the formatted threshold in each row', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      expect(screen.getByText('Reaches $3,000.00')).toBeOnTheScreen();
    });

    it('formats tiny thresholds with subscript notation instead of scientific notation', async () => {
      mockFetchAlerts.mockResolvedValue(
        makeFetchResponse([
          makeAlert({ id: 'alert-tiny', threshold: 0.0000000000000105 }),
        ]),
      );

      const screen = renderView();
      await waitForLoaded(screen);

      expect(screen.getByText('Reaches $0.0₁₃105')).toBeOnTheScreen();
    });

    it('preserves full precision for sub-cent thresholds', async () => {
      mockFetchAlerts.mockResolvedValue(
        makeFetchResponse([
          makeAlert({ id: 'alert-a', threshold: 0.00181069 }),
          makeAlert({ id: 'alert-b', threshold: 0.00182069 }),
        ]),
      );

      const screen = renderView();
      await waitForLoaded(screen);

      expect(screen.getByText('Reaches $0.00181069')).toBeOnTheScreen();
      expect(screen.getByText('Reaches $0.00182069')).toBeOnTheScreen();
    });

    it('shows "Recurring" for recurring alerts and "Once" for one-shot alerts', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      expect(screen.getAllByText('Recurring').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Once')).toBeOnTheScreen();
    });

    it('renders a delete button and active toggle for each row', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      expect(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-alert-1`,
        ),
      ).toBeOnTheScreen();
    });

    it('shows the "Add alert" button', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      expect(
        screen.getByTestId(ManagePriceAlertsTestIds.ADD_ALERT_BUTTON),
      ).toBeOnTheScreen();
    });

    it('navigates to CreatePriceAlert with fromManage=true when "Add alert" is pressed', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(ManagePriceAlertsTestIds.ADD_ALERT_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CREATE_PRICE_ALERT,
        expect.objectContaining({
          symbol: 'ETH',
          ticker: 'ETH',
          currentPrice: 2500,
          currentCurrency: 'USD',
          assetId: 'eip155:1/slip44:60',
          fromManage: true,
        }),
      );
    });

    it('passes existingThresholds of current alerts when navigating to Add alert', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(ManagePriceAlertsTestIds.ADD_ALERT_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CREATE_PRICE_ALERT,
        expect.objectContaining({
          existingThresholds: expect.arrayContaining([3000, 1500]),
        }),
      );
    });

    it('does not pass editingAlert when "Add alert" is pressed', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(ManagePriceAlertsTestIds.ADD_ALERT_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CREATE_PRICE_ALERT,
        expect.not.objectContaining({ editingAlert: expect.anything() }),
      );
    });
  });

  describe('edit alert', () => {
    const twoAlerts = [
      makeAlert({ id: 'alert-1', threshold: 3000, recurring: true }),
      makeAlert({
        id: 'alert-2',
        threshold: 1500,
        recurring: false,
        active: false,
      }),
    ];

    beforeEach(() => {
      mockFetchAlerts.mockResolvedValue(makeFetchResponse(twoAlerts));
    });

    it('navigates to CreatePriceAlert with editingAlert when a row is tapped', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_EDIT_PREFIX}-alert-1`,
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CREATE_PRICE_ALERT,
        expect.objectContaining({
          editingAlert: expect.objectContaining({ id: 'alert-1' }),
          fromManage: true,
        }),
      );
    });

    it('passes the correct alert data for the tapped row', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_EDIT_PREFIX}-alert-2`,
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CREATE_PRICE_ALERT,
        expect.objectContaining({
          editingAlert: expect.objectContaining({
            id: 'alert-2',
            threshold: 1500,
            recurring: false,
          }),
        }),
      );
    });

    it('passes existingThresholds of all current alerts when editing', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_EDIT_PREFIX}-alert-1`,
        ),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CREATE_PRICE_ALERT,
        expect.objectContaining({
          existingThresholds: expect.arrayContaining([3000, 1500]),
        }),
      );
    });

    it('does not navigate when the row tap is disabled during a delete', async () => {
      let resolveDelete!: (value: unknown) => void;
      mockDeleteAlert.mockReturnValueOnce(
        new Promise((r) => {
          resolveDelete = r;
        }),
      );

      const screen = renderView();
      await waitForLoaded(screen);

      // Trigger delete — row tap is now disabled
      fireEvent.press(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
        ),
      );

      // The delete button is replaced by a spinner, so the tap target is gone
      expect(
        screen.queryByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
        ),
      ).toBeNull();

      await act(async () => {
        resolveDelete(makeOkResponse(204));
      });
    });
  });

  describe('delete alert', () => {
    beforeEach(() => {
      mockFetchAlerts.mockResolvedValue(
        makeFetchResponse([
          makeAlert({ id: 'alert-1', threshold: 3000 }),
          makeAlert({ id: 'alert-2', threshold: 1500 }),
        ]),
      );
    });

    it('shows a spinner in place of the delete button while the request is in-flight', async () => {
      let resolveDelete!: (value: unknown) => void;
      mockDeleteAlert.mockReturnValueOnce(
        new Promise((r) => {
          resolveDelete = r;
        }),
      );

      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
        ),
      );

      expect(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_SPINNER_PREFIX}-alert-1`,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
        ),
      ).toBeNull();

      await act(async () => {
        resolveDelete(makeOkResponse(204));
      });
    });

    it('removes the row after a successful delete', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
          ),
        );
      });

      await waitFor(() => {
        expect(
          screen.queryByTestId(
            `${ManagePriceAlertsTestIds.ALERT_ITEM_PREFIX}-alert-1`,
          ),
        ).toBeNull();
      });
      expect(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_ITEM_PREFIX}-alert-2`,
        ),
      ).toBeOnTheScreen();
    });

    it('calls deleteAlert with the correct id', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
        ),
      );

      await waitFor(() => {
        expect(mockDeleteAlert).toHaveBeenCalledWith('alert-1');
      });
    });

    it('shows a success toast after deleting an alert', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
        ),
      );

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            labelOptions: expect.arrayContaining([
              expect.objectContaining({
                label: 'Price alert deleted.',
              }),
            ]),
            hasNoTimeout: false,
          }),
        );
      });
    });

    it('navigates back to token details when last alert is deleted', async () => {
      mockFetchAlerts.mockResolvedValue(
        makeFetchResponse([makeAlert({ id: 'alert-1' })]),
      );
      const screen = renderView();
      await waitForLoaded(screen);

      await act(async () => {
        fireEvent.press(
          screen.getByTestId(
            `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
          ),
        );
      });

      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalledTimes(1);
      });
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('restores the row and delete button when deleteAlert returns a non-ok response', async () => {
      mockDeleteAlert.mockResolvedValueOnce(makeErrorResponse(500));
      mockFetchAlerts
        .mockResolvedValueOnce(
          makeFetchResponse([
            makeAlert({ id: 'alert-1', threshold: 3000 }),
            makeAlert({ id: 'alert-2', threshold: 1500 }),
          ]),
        )
        .mockResolvedValueOnce(
          makeFetchResponse([
            makeAlert({ id: 'alert-1', threshold: 3000 }),
            makeAlert({ id: 'alert-2', threshold: 1500 }),
          ]),
        );

      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
        ),
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(
            `${ManagePriceAlertsTestIds.ALERT_ITEM_PREFIX}-alert-1`,
          ),
        ).toBeOnTheScreen();
      });

      // Spinner should be gone and delete button restored after failure
      await waitFor(() => {
        expect(
          screen.getByTestId(
            `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
          ),
        ).toBeOnTheScreen();
      });
    });

    it('ignores a second press on the delete button while the first request is in-flight', async () => {
      let resolveDelete!: (value: unknown) => void;
      mockDeleteAlert.mockReturnValueOnce(
        new Promise((r) => {
          resolveDelete = r;
        }),
      );

      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
        ),
      );

      // Button is replaced by spinner — a second press is impossible
      expect(
        screen.queryByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
        ),
      ).toBeNull();

      expect(mockDeleteAlert).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveDelete(makeOkResponse(204));
      });
    });
  });

  describe('toggle alert active state', () => {
    beforeEach(() => {
      mockFetchAlerts.mockResolvedValue(
        makeFetchResponse([makeAlert({ id: 'alert-1', active: true })]),
      );
    });

    it('calls updateAlert with the toggled active value', async () => {
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-alert-1`,
        ),
        'valueChange',
        false,
      );

      await waitFor(() => {
        expect(mockUpdateAlert).toHaveBeenCalledWith('alert-1', {
          active: false,
        });
      });
    });

    it('disables the switch while the update request is in-flight', async () => {
      let resolveUpdate!: (value: unknown) => void;
      mockUpdateAlert.mockReturnValueOnce(
        new Promise((r) => {
          resolveUpdate = r;
        }),
      );

      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-alert-1`,
        ),
        'valueChange',
        false,
      );

      expect(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-alert-1`,
        ),
      ).toHaveProp('disabled', true);

      await act(async () => {
        resolveUpdate(makeOkResponse(200));
      });

      await waitFor(() => {
        expect(
          screen.getByTestId(
            `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-alert-1`,
          ),
        ).toHaveProp('disabled', false);
      });
    });

    it('re-enables the switch after a failed update', async () => {
      mockUpdateAlert.mockResolvedValueOnce(makeErrorResponse(500));
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-alert-1`,
        ),
        'valueChange',
        false,
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(
            `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-alert-1`,
          ),
        ).toHaveProp('disabled', false);
      });
    });

    it('rolls back the toggle when updateAlert returns a non-ok response', async () => {
      mockUpdateAlert.mockResolvedValueOnce(makeErrorResponse(500));
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-alert-1`,
        ),
        'valueChange',
        false,
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(
            `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-alert-1`,
          ),
        ).toHaveProp('value', true);
      });
    });
  });

  describe('redirect to CreatePriceAlert', () => {
    it('replaces the screen when the API returns an empty list', async () => {
      mockFetchAlerts.mockResolvedValue(makeFetchResponse([]));
      renderView();

      await waitFor(() => expect(mockReplace).toHaveBeenCalled());

      expect(mockReplace).toHaveBeenCalledWith(
        Routes.CREATE_PRICE_ALERT,
        expect.objectContaining({ assetId: 'eip155:1/slip44:60' }),
      );
      expect(mockReplace.mock.calls[0][1].fromManage).toBeUndefined();
    });

    it('calls goBack (not replace) on a non-ok HTTP response', async () => {
      mockFetchAlerts.mockResolvedValue(makeFetchResponse([], false));
      renderView();

      await waitFor(() => expect(mockGoBack).toHaveBeenCalled());

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('shows a fetch error toast on a non-ok HTTP response', async () => {
      mockFetchAlerts.mockResolvedValue(makeFetchResponse([], false));
      renderView();

      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            labelOptions: expect.arrayContaining([
              expect.objectContaining({
                label: 'Failed to load price alerts. Please try again.',
              }),
            ]),
            hasNoTimeout: false,
          }),
        ),
      );
    });

    it('calls goBack (not replace) when the fetch rejects entirely', async () => {
      mockFetchAlerts.mockRejectedValue(new Error('Network failure'));
      renderView();

      await waitFor(() => expect(mockGoBack).toHaveBeenCalled());

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('shows a fetch error toast when the fetch rejects entirely', async () => {
      mockFetchAlerts.mockRejectedValue(new Error('Network failure'));
      renderView();

      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            labelOptions: expect.arrayContaining([
              expect.objectContaining({
                label: 'Failed to load price alerts. Please try again.',
              }),
            ]),
            hasNoTimeout: false,
          }),
        ),
      );
    });
  });

  describe('error toasts', () => {
    beforeEach(() => {
      mockFetchAlerts.mockResolvedValue(
        makeFetchResponse([
          makeAlert({ id: 'alert-1', threshold: 3000 }),
          makeAlert({ id: 'alert-2', threshold: 1500 }),
        ]),
      );
    });

    it('shows a delete error toast when deleteAlert returns a non-ok response', async () => {
      mockDeleteAlert.mockResolvedValueOnce(makeErrorResponse(500));
      mockFetchAlerts.mockResolvedValue(
        makeFetchResponse([
          makeAlert({ id: 'alert-1', threshold: 3000 }),
          makeAlert({ id: 'alert-2', threshold: 1500 }),
        ]),
      );

      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
        ),
      );

      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            labelOptions: expect.arrayContaining([
              expect.objectContaining({
                label: 'Failed to delete price alert. Please try again.',
              }),
            ]),
            hasNoTimeout: false,
          }),
        ),
      );
    });

    it('shows a toggle error toast when updateAlert returns a non-ok response', async () => {
      mockUpdateAlert.mockResolvedValueOnce(makeErrorResponse(500));
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-alert-1`,
        ),
        'valueChange',
        false,
      );

      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            labelOptions: expect.arrayContaining([
              expect.objectContaining({
                label: 'Failed to update price alert. Please try again.',
              }),
            ]),
            hasNoTimeout: false,
          }),
        ),
      );
    });
  });

  describe('analytics', () => {
    const mockAnalytics = jest.mocked(useAnalytics)();

    const builderForEvent = (event: unknown) => {
      const calls = jest.mocked(mockAnalytics.createEventBuilder).mock.calls;
      const idx = calls.findIndex((c) => c[0] === event);
      return jest.mocked(mockAnalytics.createEventBuilder).mock.results[idx]
        .value;
    };

    it('tracks Price Alert Creation Interaction (deleted) on success', async () => {
      mockFetchAlerts.mockResolvedValue(
        makeFetchResponse([
          makeAlert({ id: 'alert-1', threshold: 3000 }),
          makeAlert({ id: 'alert-2', threshold: 1500 }),
        ]),
      );
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
        ),
      );

      await waitFor(() => {
        expect(mockAnalytics.createEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION,
        );
      });
      expect(
        builderForEvent(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
          .addProperties,
      ).toHaveBeenCalledWith({
        interaction_type: 'deleted',
        asset_id: 'eip155:1/slip44:60',
        token_symbol: 'ETH',
        alert_type: 'threshold',
        alert_value: 3000,
        alert_recurring: true,
        alert_active: true,
      });
    });

    it('does not track Price Alert Creation Interaction when delete fails', async () => {
      mockDeleteAlert.mockResolvedValueOnce(makeErrorResponse(500));
      mockFetchAlerts.mockResolvedValue(
        makeFetchResponse([
          makeAlert({ id: 'alert-1', threshold: 3000 }),
          makeAlert({ id: 'alert-2', threshold: 1500 }),
        ]),
      );
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent.press(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`,
        ),
      );

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });
      expect(mockAnalytics.createEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION,
      );
    });

    it('tracks Price Alert Creation Interaction (updated) when toggling active', async () => {
      mockFetchAlerts.mockResolvedValue(
        makeFetchResponse([
          makeAlert({
            id: 'alert-1',
            threshold: 3000,
            recurring: true,
            active: true,
          }),
        ]),
      );
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-alert-1`,
        ),
        'valueChange',
        false,
      );

      await waitFor(() => {
        expect(mockAnalytics.createEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION,
        );
      });
      expect(
        builderForEvent(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
          .addProperties,
      ).toHaveBeenCalledWith({
        interaction_type: 'updated',
        asset_id: 'eip155:1/slip44:60',
        token_symbol: 'ETH',
        alert_type: 'threshold',
        alert_value: 3000,
        alert_recurring: true,
        alert_active: false,
        prev_alert_value: 3000,
        prev_alert_recurring: true,
        prev_alert_active: true,
      });
    });

    it('does not track Price Alert Creation Interaction when toggle fails', async () => {
      mockUpdateAlert.mockResolvedValueOnce(makeErrorResponse(500));
      mockFetchAlerts.mockResolvedValue(
        makeFetchResponse([makeAlert({ id: 'alert-1', active: true })]),
      );
      const screen = renderView();
      await waitForLoaded(screen);

      fireEvent(
        screen.getByTestId(
          `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-alert-1`,
        ),
        'valueChange',
        false,
      );

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });
      expect(mockAnalytics.createEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION,
      );
    });
  });
});
