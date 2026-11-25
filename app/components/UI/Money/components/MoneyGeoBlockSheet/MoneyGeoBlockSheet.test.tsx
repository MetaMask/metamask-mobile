import React from 'react';
import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyGeoBlockSheet from './MoneyGeoBlockSheet';
import { MoneyGeoBlockSheetTestIds } from './MoneyGeoBlockSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { BOTTOM_SHEET_NAMES } from '../../constants/moneyEvents';

const mockTrackBottomSheetViewed = jest.fn();
const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
const mockNavigate = jest.fn();
const mockParentGoBack = jest.fn();
const mockGetParent = jest.fn(() => ({ goBack: mockParentGoBack }));

const mockRefreshGeolocation = jest.fn();
let mockEngineGeolocationState: { location: string; status: string } = {
  location: UNKNOWN_LOCATION,
  status: 'error',
};

jest.mock('../../../../../core/Engine', () => ({
  context: {
    GeolocationController: {
      refreshGeolocation: (...args: unknown[]) =>
        mockRefreshGeolocation(...args),
    },
  },
  get state() {
    return { GeolocationController: mockEngineGeolocationState };
  },
}));

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      getParent: mockGetParent,
    }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        testID,
        onClose,
      }: {
        children: React.ReactNode;
        testID?: string;
        onClose?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));

      return ReactActual.createElement(View, { testID, onClose }, children);
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
  };
});

describe('MoneyGeoBlockSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMoneyAnalytics as jest.Mock).mockReturnValue({
      trackBottomSheetViewed: mockTrackBottomSheetViewed,
    });
  });

  it('renders geo-block bottom sheet container', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);

    expect(getByTestId(MoneyGeoBlockSheetTestIds.SHEET)).toBeOnTheScreen();
  });

  it('renders geo-block title copy', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);

    expect(getByTestId(MoneyGeoBlockSheetTestIds.TITLE)).toHaveTextContent(
      strings('money.geo_block.title'),
    );
  });

  it('renders geo-block description copy', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);

    expect(getByTestId(MoneyGeoBlockSheetTestIds.BODY)).toHaveTextContent(
      strings('money.geo_block.description'),
    );
  });

  it('renders eligibility failure copy when geolocation errors without a known location', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />, {
      state: {
        engine: {
          backgroundState: {
            GeolocationController: {
              location: UNKNOWN_LOCATION,
              status: 'error',
            },
          },
        },
      },
    });

    expect(getByTestId(MoneyGeoBlockSheetTestIds.TITLE)).toHaveTextContent(
      strings('fiat_on_ramp_aggregator.eligibility_failed_modal.title'),
    );
    expect(getByTestId(MoneyGeoBlockSheetTestIds.BODY)).toHaveTextContent(
      strings('fiat_on_ramp_aggregator.eligibility_failed_modal.description'),
    );
  });

  it('renders geo-block copy when geolocation errors with a known location', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />, {
      state: {
        engine: {
          backgroundState: {
            GeolocationController: {
              location: 'US',
              status: 'error',
            },
          },
        },
      },
    });

    expect(getByTestId(MoneyGeoBlockSheetTestIds.TITLE)).toHaveTextContent(
      strings('money.geo_block.title'),
    );
    expect(getByTestId(MoneyGeoBlockSheetTestIds.BODY)).toHaveTextContent(
      strings('money.geo_block.description'),
    );
  });

  it('renders continue button copy', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);

    expect(
      getByTestId(MoneyGeoBlockSheetTestIds.CONTINUE_BUTTON),
    ).toHaveTextContent(strings('money.geo_block.button'));
  });

  it('dismisses the Money modal gateway when continue is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);

    fireEvent.press(getByTestId(MoneyGeoBlockSheetTestIds.CONTINUE_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockParentGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('dismisses the Money modal gateway when the bottom sheet close callback runs', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);
    const sheet = getByTestId(MoneyGeoBlockSheetTestIds.SHEET);

    sheet.props.onClose();

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockParentGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('dismisses the Money modal gateway when the header close button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);

    fireEvent.press(getByTestId(MoneyGeoBlockSheetTestIds.CLOSE_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockParentGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  describe('geolocation lookup error retry', () => {
    const lookupErrorState = {
      engine: {
        backgroundState: {
          GeolocationController: {
            location: UNKNOWN_LOCATION,
            status: 'error' as const,
          },
        },
      },
    };

    beforeEach(() => {
      mockEngineGeolocationState = {
        location: UNKNOWN_LOCATION,
        status: 'error',
      };
      mockRefreshGeolocation.mockResolvedValue(UNKNOWN_LOCATION);
    });

    it('renders a try again button and a dismiss button in the lookup error state', () => {
      const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />, {
        state: lookupErrorState,
      });

      expect(
        getByTestId(MoneyGeoBlockSheetTestIds.RETRY_BUTTON),
      ).toHaveTextContent(strings('money.geo_block.retry_button'));
      expect(
        getByTestId(MoneyGeoBlockSheetTestIds.CONTINUE_BUTTON),
      ).toHaveTextContent(strings('money.geo_block.button'));
    });

    it('does not render a try again button for a resolved blocked region', () => {
      const { queryByTestId } = renderWithProvider(<MoneyGeoBlockSheet />);

      expect(
        queryByTestId(MoneyGeoBlockSheetTestIds.RETRY_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('refreshes geolocation when try again is pressed', async () => {
      const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />, {
        state: lookupErrorState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(MoneyGeoBlockSheetTestIds.RETRY_BUTTON));
      });

      expect(mockRefreshGeolocation).toHaveBeenCalledTimes(1);
    });

    it('closes the Money modal flow when the retry resolves an eligible location', async () => {
      const { getByTestId, store } = renderWithProvider(
        <MoneyGeoBlockSheet />,
        {
          state: lookupErrorState,
        },
      );
      mockRefreshGeolocation.mockImplementation(async () => {
        mockEngineGeolocationState = { location: 'ES', status: 'complete' };
        store.dispatch(updateBgState({ key: 'GeolocationController' }));
        return 'ES';
      });

      await act(async () => {
        fireEvent.press(getByTestId(MoneyGeoBlockSheetTestIds.RETRY_BUTTON));
      });

      await waitFor(() => {
        expect(mockParentGoBack).toHaveBeenCalledTimes(1);
      });
    });

    it('stays open with geo-block copy when the retry resolves a blocked region', async () => {
      const { getByTestId, store } = renderWithProvider(
        <MoneyGeoBlockSheet />,
        {
          state: {
            ...lookupErrorState,
            engine: {
              backgroundState: {
                ...lookupErrorState.engine.backgroundState,
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    moneyAccountGeoBlockedCountries: { blockedRegions: ['GB'] },
                  },
                  cacheTimestamp: 0,
                },
              },
            },
          },
        },
      );
      mockRefreshGeolocation.mockImplementation(async () => {
        mockEngineGeolocationState = { location: 'GB', status: 'complete' };
        store.dispatch(updateBgState({ key: 'GeolocationController' }));
        return 'GB';
      });

      await act(async () => {
        fireEvent.press(getByTestId(MoneyGeoBlockSheetTestIds.RETRY_BUTTON));
      });

      expect(mockParentGoBack).not.toHaveBeenCalled();
      expect(getByTestId(MoneyGeoBlockSheetTestIds.TITLE)).toHaveTextContent(
        strings('money.geo_block.title'),
      );
    });

    it('stays open with the lookup error copy when the retry fails', async () => {
      mockRefreshGeolocation.mockRejectedValue(new Error('network'));
      const { getByTestId } = renderWithProvider(<MoneyGeoBlockSheet />, {
        state: lookupErrorState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(MoneyGeoBlockSheetTestIds.RETRY_BUTTON));
      });

      expect(mockParentGoBack).not.toHaveBeenCalled();
      expect(getByTestId(MoneyGeoBlockSheetTestIds.TITLE)).toHaveTextContent(
        strings('fiat_on_ramp_aggregator.eligibility_failed_modal.title'),
      );
      expect(
        getByTestId(MoneyGeoBlockSheetTestIds.RETRY_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('analytics', () => {
    it('initialises useMoneyAnalytics with MONEY_GEO_BLOCK_SHEET bottom_sheet_name', () => {
      renderWithProvider(<MoneyGeoBlockSheet />);

      expect(useMoneyAnalytics).toHaveBeenCalledWith({
        bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_GEO_BLOCK_SHEET,
      });
    });

    it('calls trackBottomSheetViewed on mount', () => {
      renderWithProvider(<MoneyGeoBlockSheet />);

      expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
    });
  });
});
