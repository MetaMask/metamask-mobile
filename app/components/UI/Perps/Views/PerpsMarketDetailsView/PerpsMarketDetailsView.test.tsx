import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PerpsMarketDetailsView from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsMarketDetailsViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import { PerpsConnectionProvider } from '../../providers/PerpsConnectionProvider';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        market: {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: '$45,000.00',
          change24h: '+$1,125.00',
          change24hPercent: '+2.50%',
          volume: '$1.23B',
          maxLeverage: '40x',
        },
      },
    }),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('../../hooks/useHasExistingPosition', () => ({
  useHasExistingPosition: () => ({
    hasPosition: false,
    isLoading: false,
    error: null,
    existingPosition: null,
  }),
}));

// Mock PerpsBottomSheetTooltip to avoid SafeAreaProvider issues
jest.mock('../../components/PerpsBottomSheetTooltip', () => ({
  __esModule: true,
  default: ({ isVisible }: { isVisible: boolean }) => {
    const { View } = jest.requireActual('react-native');
    return isVisible ? <View testID="perps-bottom-sheet-tooltip" /> : null;
  },
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PerpsMarketDetailsView', () => {
  it('renders correctly', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsConnectionProvider>
        <PerpsMarketDetailsView />
      </PerpsConnectionProvider>,
      {
        state: initialState,
      },
    );

    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.CONTAINER),
    ).toBeTruthy();
    expect(getByTestId(PerpsMarketDetailsViewSelectorsIDs.HEADER)).toBeTruthy();
  });

  it('renders statistics items', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsConnectionProvider>
        <PerpsMarketDetailsView />
      </PerpsConnectionProvider>,
      {
        state: initialState,
      },
    );

    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.STATISTICS_HIGH_24H),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.STATISTICS_LOW_24H),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.STATISTICS_VOLUME_24H),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.STATISTICS_OPEN_INTEREST),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.STATISTICS_FUNDING_RATE),
    ).toBeTruthy();
    expect(
      getByTestId(
        PerpsMarketDetailsViewSelectorsIDs.STATISTICS_FUNDING_COUNTDOWN,
      ),
    ).toBeTruthy();
  });

  it('renders action buttons', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsConnectionProvider>
        <PerpsMarketDetailsView />
      </PerpsConnectionProvider>,
      {
        state: initialState,
      },
    );

    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.LONG_BUTTON),
    ).toBeTruthy();
    expect(
      getByTestId(PerpsMarketDetailsViewSelectorsIDs.SHORT_BUTTON),
    ).toBeTruthy();
  });

  it('shows tooltip when Open Interest info icon is clicked', async () => {
    const { getByTestId } = renderWithProvider(
      <PerpsConnectionProvider>
        <PerpsMarketDetailsView />
      </PerpsConnectionProvider>,
      {
        state: initialState,
      },
    );

    const openInterestInfoIcon = getByTestId(
      PerpsMarketDetailsViewSelectorsIDs.OPEN_INTEREST_INFO_ICON,
    );
    expect(openInterestInfoIcon).toBeTruthy();

    fireEvent.press(openInterestInfoIcon);

    await waitFor(() => {
      expect(getByTestId('perps-bottom-sheet-tooltip')).toBeTruthy();
    });
  });

  it('shows tooltip when Funding Rate info icon is clicked', async () => {
    const { getByTestId } = renderWithProvider(
      <PerpsConnectionProvider>
        <PerpsMarketDetailsView />
      </PerpsConnectionProvider>,
      {
        state: initialState,
      },
    );

    const fundingRateInfoIcon = getByTestId(
      PerpsMarketDetailsViewSelectorsIDs.FUNDING_RATE_INFO_ICON,
    );
    expect(fundingRateInfoIcon).toBeTruthy();

    fireEvent.press(fundingRateInfoIcon);

    await waitFor(() => {
      expect(getByTestId('perps-bottom-sheet-tooltip')).toBeTruthy();
    });
  });
});
