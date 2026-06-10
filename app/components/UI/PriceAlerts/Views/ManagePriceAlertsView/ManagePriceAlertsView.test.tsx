import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import ManagePriceAlertsView from './ManagePriceAlertsView';
import { ManagePriceAlertsTestIds, type PriceAlert } from '../../constants';
import Routes from '../../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockReplace = jest.fn();
const mockNavigate = jest.fn();

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
jest.mock('../../api', () => ({
  fetchAlerts: (...args: unknown[]) => mockFetchAlerts(...args),
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

const flush = () =>
  act(async () => {
    await Promise.resolve();
  });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ManagePriceAlertsView', () => {
  it('shows a loading indicator while the fetch is in-flight', async () => {
    let resolve!: (value: unknown) => void;
    mockFetchAlerts.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );

    const { getByTestId } = render(<ManagePriceAlertsView />);
    expect(getByTestId(ManagePriceAlertsTestIds.LOADING)).toBeOnTheScreen();

    await act(async () => {
      resolve(makeFetchResponse([makeAlert()]));
    });
  });

  it('hides the loading indicator once alerts are loaded', async () => {
    mockFetchAlerts.mockResolvedValue(makeFetchResponse([makeAlert()]));
    const { queryByTestId } = render(<ManagePriceAlertsView />);

    await flush();

    expect(queryByTestId(ManagePriceAlertsTestIds.LOADING)).toBeNull();
  });

  it('calls fetchAlerts with the assetId from route params', async () => {
    mockFetchAlerts.mockResolvedValue(makeFetchResponse([makeAlert()]));
    render(<ManagePriceAlertsView />);

    await flush();

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
      const { getByTestId } = render(<ManagePriceAlertsView />);
      await flush();

      expect(
        getByTestId(`${ManagePriceAlertsTestIds.ALERT_ITEM_PREFIX}-alert-1`),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`${ManagePriceAlertsTestIds.ALERT_ITEM_PREFIX}-alert-2`),
      ).toBeOnTheScreen();
    });

    it('shows the formatted threshold in each row', async () => {
      const { getByText } = render(<ManagePriceAlertsView />);
      await flush();

      expect(getByText('Reaches $3000')).toBeOnTheScreen();
    });

    it('shows "Recurring" for recurring alerts and "Once" for one-shot alerts', async () => {
      const { getAllByText, getByText } = render(<ManagePriceAlertsView />);
      await flush();

      expect(getAllByText('Recurring').length).toBeGreaterThanOrEqual(1);
      expect(getByText('Once')).toBeOnTheScreen();
    });

    it('renders a delete button and active toggle for each row', async () => {
      const { getByTestId } = render(<ManagePriceAlertsView />);
      await flush();

      expect(
        getByTestId(`${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-alert-1`),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-alert-1`),
      ).toBeOnTheScreen();
    });

    it('shows the "Add alert" button', async () => {
      const { getByTestId } = render(<ManagePriceAlertsView />);
      await flush();

      expect(
        getByTestId(ManagePriceAlertsTestIds.ADD_ALERT_BUTTON),
      ).toBeOnTheScreen();
    });

    it('navigates to CreatePriceAlert with fromManage=true when "Add alert" is pressed', async () => {
      const { getByTestId } = render(<ManagePriceAlertsView />);
      await flush();

      fireEvent.press(getByTestId(ManagePriceAlertsTestIds.ADD_ALERT_BUTTON));

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
  });

  describe('redirect to CreatePriceAlert', () => {
    it('replaces the screen when the API returns an empty list', async () => {
      mockFetchAlerts.mockResolvedValue(makeFetchResponse([]));
      render(<ManagePriceAlertsView />);
      await flush();

      expect(mockReplace).toHaveBeenCalledWith(
        Routes.CREATE_PRICE_ALERT,
        expect.objectContaining({ assetId: 'eip155:1/slip44:60' }),
      );
      expect(mockReplace.mock.calls[0][1].fromManage).toBeUndefined();
    });

    it('replaces the screen on a non-ok HTTP response', async () => {
      mockFetchAlerts.mockResolvedValue(makeFetchResponse([], false));
      render(<ManagePriceAlertsView />);
      await flush();

      expect(mockReplace).toHaveBeenCalledWith(
        Routes.CREATE_PRICE_ALERT,
        expect.objectContaining({ assetId: 'eip155:1/slip44:60' }),
      );
    });

    it('replaces the screen when the fetch rejects entirely', async () => {
      mockFetchAlerts.mockRejectedValue(new Error('Network failure'));
      render(<ManagePriceAlertsView />);
      await flush();

      expect(mockReplace).toHaveBeenCalledWith(
        Routes.CREATE_PRICE_ALERT,
        expect.objectContaining({ assetId: 'eip155:1/slip44:60' }),
      );
    });
  });
});
