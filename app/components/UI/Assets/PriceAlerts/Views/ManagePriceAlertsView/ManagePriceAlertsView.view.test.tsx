import '../../../../../../../tests/component-view/mocks';
import { renderManagePriceAlertsViewWithRoutes } from '../../../../../../../tests/component-view/renderers/priceAlerts';
import {
  setupPriceAlertsApiMock,
  clearPriceAlertsApiMocks,
  mockPriceAlertsData,
  setupPriceAlertsDeleteMock,
  setupPriceAlertsPatchMock,
} from '../../../../../../../tests/component-view/api-mocking/priceAlerts';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import {
  ManagePriceAlertsTestIds,
  CreatePriceAlertTestIds,
} from '../../constants';
import Routes from '../../../../../../constants/navigation/Routes';

beforeEach(() => {
  setupPriceAlertsApiMock();
});

afterEach(() => {
  clearPriceAlertsApiMocks();
});

describeForPlatforms('ManagePriceAlertsView', () => {
  it('loads and displays all alert fields for each row after async fetch', async () => {
    const { findByTestId, queryByTestId } =
      renderManagePriceAlertsViewWithRoutes();

    await waitFor(() => {
      expect(
        queryByTestId(ManagePriceAlertsTestIds.LOADING),
      ).not.toBeOnTheScreen();
    });

    const row1 = await findByTestId(
      `${ManagePriceAlertsTestIds.ALERT_ITEM_PREFIX}-${mockPriceAlertsData[0].id}`,
    );
    const scope1 = within(row1);
    expect(scope1.getByText('Reaches $3,000.00')).toBeOnTheScreen();
    expect(scope1.getByText('Recurring')).toBeOnTheScreen();

    const row2 = await findByTestId(
      `${ManagePriceAlertsTestIds.ALERT_ITEM_PREFIX}-${mockPriceAlertsData[1].id}`,
    );
    const scope2 = within(row2);
    expect(scope2.getByText('Reaches $1,500.00')).toBeOnTheScreen();
    expect(scope2.getByText('Once')).toBeOnTheScreen();
  });

  it('navigates to CreatePriceAlertView when "Add alert" is pressed', async () => {
    const { findByTestId, queryByTestId } =
      renderManagePriceAlertsViewWithRoutes();

    await waitFor(() => {
      expect(
        queryByTestId(ManagePriceAlertsTestIds.LOADING),
      ).not.toBeOnTheScreen();
    });

    fireEvent.press(
      await findByTestId(ManagePriceAlertsTestIds.ADD_ALERT_BUTTON),
    );

    await findByTestId(CreatePriceAlertTestIds.CONTAINER);
  });

  it('navigates to CreatePriceAlertView with the alert pre-populated when a row is tapped', async () => {
    const { findByTestId, getByText, queryByTestId } =
      renderManagePriceAlertsViewWithRoutes();

    await waitFor(() => {
      expect(
        queryByTestId(ManagePriceAlertsTestIds.LOADING),
      ).not.toBeOnTheScreen();
    });

    fireEvent.press(
      await findByTestId(
        `${ManagePriceAlertsTestIds.ALERT_EDIT_PREFIX}-${mockPriceAlertsData[0].id}`,
      ),
    );

    await findByTestId(CreatePriceAlertTestIds.CONTAINER);

    expect(getByText('Edit ETH price alert')).toBeOnTheScreen();
    expect(getByText('$3000')).toBeOnTheScreen();
  });

  it('auto-redirects to Create view when no alerts exist for the token', async () => {
    setupPriceAlertsApiMock([]);

    const { findByTestId } = renderManagePriceAlertsViewWithRoutes();

    await findByTestId(CreatePriceAlertTestIds.CONTAINER);
  });

  it('deletes an alert via trash icon and removes it from the list', async () => {
    const alertToDelete = mockPriceAlertsData[0];
    const scope = setupPriceAlertsDeleteMock(alertToDelete.id);

    const { findByTestId, queryByTestId } =
      renderManagePriceAlertsViewWithRoutes();

    await waitFor(() => {
      expect(
        queryByTestId(ManagePriceAlertsTestIds.LOADING),
      ).not.toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(
        await findByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-${alertToDelete.id}`,
        ),
      );
    });

    await waitFor(() => expect(scope.isDone()).toBe(true));

    await waitFor(() => {
      expect(
        queryByTestId(
          `${ManagePriceAlertsTestIds.ALERT_ITEM_PREFIX}-${alertToDelete.id}`,
        ),
      ).not.toBeOnTheScreen();
    });
  });

  it('deletes the last remaining alert and empties the list', async () => {
    const singleAlert = mockPriceAlertsData[0];
    setupPriceAlertsApiMock([singleAlert]);
    const scope = setupPriceAlertsDeleteMock(singleAlert.id);

    const { findByTestId, queryByTestId } =
      renderManagePriceAlertsViewWithRoutes();

    await waitFor(() => {
      expect(
        queryByTestId(ManagePriceAlertsTestIds.LOADING),
      ).not.toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(
        await findByTestId(
          `${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-${singleAlert.id}`,
        ),
      );
    });

    await waitFor(() => expect(scope.isDone()).toBe(true));

    // After the last alert is deleted, the row is removed from the list
    await waitFor(() => {
      expect(
        queryByTestId(
          `${ManagePriceAlertsTestIds.ALERT_ITEM_PREFIX}-${singleAlert.id}`,
        ),
      ).not.toBeOnTheScreen();
    });
    // The "Add alert" button is also gone (only shown when alerts.length > 0)
    expect(
      queryByTestId(ManagePriceAlertsTestIds.ADD_ALERT_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('toggles an active alert off via PATCH', async () => {
    const activeAlert = mockPriceAlertsData[0]; // active: true
    const scope = setupPriceAlertsPatchMock(activeAlert.id);

    const { findByTestId, queryByTestId } =
      renderManagePriceAlertsViewWithRoutes();

    await waitFor(() => {
      expect(
        queryByTestId(ManagePriceAlertsTestIds.LOADING),
      ).not.toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent(
        await findByTestId(
          `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-${activeAlert.id}`,
        ),
        'valueChange',
        false,
      );
    });

    await waitFor(() => expect(scope.isDone()).toBe(true));
  });

  it('toggles an inactive alert on via PATCH', async () => {
    const inactiveAlert = mockPriceAlertsData[1]; // active: false
    const scope = setupPriceAlertsPatchMock(inactiveAlert.id);

    const { findByTestId, queryByTestId } =
      renderManagePriceAlertsViewWithRoutes();

    await waitFor(() => {
      expect(
        queryByTestId(ManagePriceAlertsTestIds.LOADING),
      ).not.toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent(
        await findByTestId(
          `${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-${inactiveAlert.id}`,
        ),
        'valueChange',
        true,
      );
    });

    await waitFor(() => expect(scope.isDone()).toBe(true));
  });
});
