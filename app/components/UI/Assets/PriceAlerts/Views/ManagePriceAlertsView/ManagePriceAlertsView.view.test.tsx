import '../../../../../../../tests/component-view/mocks';
import { renderManagePriceAlertsViewWithRoutes } from '../../../../../../../tests/component-view/renderers/priceAlerts';
import {
  setupPriceAlertsApiMock,
  clearPriceAlertsApiMocks,
  mockPriceAlertsData,
} from '../../../../../../../tests/component-view/api-mocking/priceAlerts';
import { describeForPlatforms } from '../../../../../../../tests/component-view/platform';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import {
  ManagePriceAlertsTestIds,
  CreatePriceAlertTestIds,
} from '../../constants';

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
});
