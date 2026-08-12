import React from 'react';
import { render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../../../../../UI/Predict/constants/eventNames';
import { usePredictNavigation } from '../../../../../../UI/Predict/hooks/usePredictNavigation';
import type { PredictMarket } from '../../../../../../UI/Predict/types';
import {
  PREDICT_EMPTY_STATE_CTA_NAMES,
  type PredictEmptyStateCtaName,
} from '../../../../abTestConfig';
import {
  HOMEPAGE_PREDICT_EVENT_SLOTS,
  HOMEPAGE_PREDICT_SERIES_SLOT,
} from '../../constants/homepagePredictMarketSlots';
import type { UseHomepagePredictMarketSlotsResult } from '../../hooks/useHomepagePredictMarketSlots';
import type { TransactionActiveAbTestEntry } from '../../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import HomepagePredictDiscovery, {
  type HomepagePredictDiscoveryProps,
} from '.';
import type { ChampionshipRowState } from './ChampionshipRow';

const mockNavigate = jest.fn();
const mockNavigateToMarketDetails = jest.fn();
const mockPredictEntryPointProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => <>{children}</>;
interface MockSectionHeaderProps {
  title: string;
  onPress: () => void;
  testID: string;
}
const mockSectionHeader = jest.fn((_props: MockSectionHeaderProps) => null);

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => ({
  Box: ({ children }: { children: React.ReactNode }) => children,
  SectionDivider: () => null,
  SectionHeader: (props: MockSectionHeaderProps) => mockSectionHeader(props),
}));

jest.mock('../../../../../../UI/Predict/contexts', () => ({
  PredictEntryPointProvider: (props: { children: React.ReactNode }) =>
    mockPredictEntryPointProvider(props),
}));

jest.mock('../../../../../../UI/Predict/hooks/usePredictNavigation', () => ({
  usePredictNavigation: jest.fn(),
}));

interface MockBtcLiveRowProps {
  onPress: (
    marketId: string | undefined,
    market: PredictMarket | undefined,
  ) => void;
}

const mockBtcLiveRow = jest.fn((_props: MockBtcLiveRowProps) => null);

jest.mock('./BtcLiveRow', () => ({
  __esModule: true,
  default: (props: MockBtcLiveRowProps) => mockBtcLiveRow(props),
}));

interface MockChampionshipRowProps {
  state: ChampionshipRowState;
  onPress?: () => void;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  testID?: string;
}

const mockChampionshipRow = jest.fn((_props: MockChampionshipRowProps) => null);

jest.mock('./ChampionshipRow', () => ({
  __esModule: true,
  default: (props: MockChampionshipRowProps) => mockChampionshipRow(props),
}));

const transactionActiveAbTests: TransactionActiveAbTestEntry[] = [
  {
    key: 'predictHomepageDiscovery',
    value: 'treatment',
    key_value_pair: 'predictHomepageDiscovery=treatment',
  },
];

const createMarket = (
  id: string,
  slug: string,
  overrides: Partial<PredictMarket> = {},
): PredictMarket =>
  ({
    id,
    slug,
    title: 'Championship market',
    image: 'https://example.com/market.png',
    ...overrides,
  }) as PredictMarket;

const createMarketSlots = (
  marketData: PredictMarket[] = [],
  isFetching = false,
): UseHomepagePredictMarketSlotsResult => ({
  marketData,
  isFetching,
  isFetchingMore: false,
  error: null,
  hasMore: false,
  refetch: jest.fn(),
  fetchMore: jest.fn(),
});

const defaultProps: HomepagePredictDiscoveryProps = {
  title: 'Predictions',
  onViewAll: jest.fn(),
  headerTestIdKey: 'predictions',
  marketSlots: createMarketSlots(),
};

const renderComponent = (
  overrides: Partial<HomepagePredictDiscoveryProps> = {},
) => render(<HomepagePredictDiscovery {...defaultProps} {...overrides} />);

const getBtcLiveRowProps = (): MockBtcLiveRowProps =>
  mockBtcLiveRow.mock.calls[0][0];

const getChampionshipRowProps = (): MockChampionshipRowProps[] =>
  mockChampionshipRow.mock.calls.map(([props]) => props);

const getSectionHeaderProps = (): MockSectionHeaderProps =>
  mockSectionHeader.mock.calls[0][0];

describe('HomepagePredictDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useNavigation).mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);
    jest.mocked(usePredictNavigation).mockReturnValue({
      navigateToBuyPreview: jest.fn(),
      navigateToMarketDetails: mockNavigateToMarketDetails,
    });
  });

  describe('event slots', () => {
    it('passes matching markets to their configured championship rows', () => {
      const markets = HOMEPAGE_PREDICT_EVENT_SLOTS.map(({ id, slug }) =>
        createMarket(id, slug),
      );

      renderComponent({
        marketSlots: createMarketSlots(markets),
        transactionActiveAbTests,
      });

      expect(getChampionshipRowProps()).toEqual([
        expect.objectContaining({
          state: {
            kind: 'market',
            market: markets[0],
            detailsTitle: undefined,
          },
          transactionActiveAbTests,
          testID: 'homepage-predict-discovery-market-slot-2',
        }),
        expect.objectContaining({
          state: {
            kind: 'market',
            market: markets[1],
            detailsTitle: undefined,
          },
          transactionActiveAbTests,
          testID: 'homepage-predict-discovery-market-slot-3',
        }),
      ]);
    });

    it('rejects a market whose slug does not match its configured slot', () => {
      const [{ id }] = HOMEPAGE_PREDICT_EVENT_SLOTS;
      const market = createMarket(id, 'different-slug');

      renderComponent({ marketSlots: createMarketSlots([market]) });

      expect(getChampionshipRowProps()[0].state).toEqual({ kind: 'empty' });
    });

    it('renders loading states for missing markets during fetching', () => {
      renderComponent({ marketSlots: createMarketSlots([], true) });

      expect(getChampionshipRowProps().map(({ state }) => state)).toEqual([
        { kind: 'loading' },
        { kind: 'loading' },
      ]);
    });

    it('renders empty states for missing markets after fetching', () => {
      renderComponent({ marketSlots: createMarketSlots() });

      expect(getChampionshipRowProps().map(({ state }) => state)).toEqual([
        { kind: 'empty' },
        { kind: 'empty' },
      ]);
    });
  });

  describe('BTC row navigation', () => {
    it('opens market details for an available BTC market', () => {
      const market = createMarket('btc-market', 'btc-up-down', {
        title: 'Bitcoin Up or Down',
      });
      renderComponent({ transactionActiveAbTests });

      getBtcLiveRowProps().onPress(market.id, market);

      expect(mockNavigateToMarketDetails).toHaveBeenCalledWith(
        {
          marketId: market.id,
          entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
          title: market.title,
          image: market.image,
          transactionActiveAbTests,
        },
        { throughRoot: true },
      );
    });

    it('uses the configured series title when BTC market data is missing', () => {
      renderComponent();

      getBtcLiveRowProps().onPress('btc-market', undefined);

      expect(mockNavigateToMarketDetails).toHaveBeenCalledWith(
        {
          marketId: 'btc-market',
          entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
          title: HOMEPAGE_PREDICT_SERIES_SLOT.series.title,
          image: undefined,
        },
        { throughRoot: true },
      );
    });

    it('opens the crypto market list when no BTC market is available', () => {
      renderComponent({ transactionActiveAbTests });

      getBtcLiveRowProps().onPress(undefined, undefined);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
          tab: 'crypto',
          transactionActiveAbTests,
        },
      });
    });

    it('tracks the crypto category CTA when the BTC row is pressed', () => {
      const onTreatmentCtaClick = jest.fn<
        void,
        [PredictEmptyStateCtaName, string?]
      >();
      renderComponent({ onTreatmentCtaClick });

      getBtcLiveRowProps().onPress(undefined, undefined);

      expect(onTreatmentCtaClick).toHaveBeenCalledWith(
        PREDICT_EMPTY_STATE_CTA_NAMES.BROWSE_CATEGORY,
        'crypto',
      );
    });
  });

  describe('section actions', () => {
    it('passes active A/B tests when the section header is pressed', () => {
      const onViewAll = jest.fn();
      renderComponent({ onViewAll, transactionActiveAbTests });

      getSectionHeaderProps().onPress();

      expect(onViewAll).toHaveBeenCalledWith(transactionActiveAbTests);
    });

    it('tracks the featured CTA when the section header is pressed', () => {
      const onTreatmentCtaClick = jest.fn();
      renderComponent({ onTreatmentCtaClick });

      getSectionHeaderProps().onPress();

      expect(onTreatmentCtaClick).toHaveBeenCalledWith(
        PREDICT_EMPTY_STATE_CTA_NAMES.EXPLORE_FEATURED,
      );
    });

    it('tracks the sports category CTA when a championship row is pressed', () => {
      const onTreatmentCtaClick = jest.fn();
      renderComponent({ onTreatmentCtaClick });

      getChampionshipRowProps()[0].onPress?.();

      expect(onTreatmentCtaClick).toHaveBeenCalledWith(
        PREDICT_EMPTY_STATE_CTA_NAMES.BROWSE_CATEGORY,
        'sports',
      );
    });
  });
});
