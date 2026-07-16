import React, { createRef } from 'react';
import { screen, act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import DeFiSection from './DeFiSection';
import { SectionRefreshHandle } from '../../types';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockExecutePoll = jest.fn().mockResolvedValue(undefined);
const mockFetchDeFiPositions = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === 'function' ? cleanup : undefined;
        // Intentionally run once on mount to mirror initial screen focus in tests.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
    },
  };
});

jest.mock('../../../../../core/Engine', () => ({
  context: {
    DeFiPositionsController: {
      _executePoll: (...args: unknown[]) => mockExecutePoll(...args),
    },
    DeFiPositionsControllerV2: {
      fetchDeFiPositions: (...args: unknown[]) =>
        mockFetchDeFiPositions(...args),
    },
  },
}));

jest.mock('../../../../../selectors/deFiPositionsSectionEnabled', () => ({
  selectDeFiPositionsSectionEnabled: jest.fn(() => true),
}));

jest.mock('../../../../../selectors/deFiPositionsV2SectionEnabled', () => ({
  selectDeFiPositionsV2SectionEnabled: jest.fn(() => false),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: jest.fn(() => false),
}));

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(() => ({ onLayout: jest.fn() })),
  HomeSectionNames: {
    TOKENS: 'tokens',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
  },
}));

jest.mock('../../hooks/useSectionViewportVisible', () => ({
  __esModule: true,
  default: jest.fn(() => ({ isVisible: false, onLayout: jest.fn() })),
}));

const mockUseDeFiPositionsForHomepage = jest.fn();
const mockUseDeFiPositionsV2 = jest.fn();

jest.mock('./hooks', () => ({
  useDeFiPositionsForHomepage: (...args: unknown[]) =>
    mockUseDeFiPositionsForHomepage(...args),
  useDeFiPositionsV2: (...args: unknown[]) => mockUseDeFiPositionsV2(...args),
  DeFiPositionEntry: {},
}));

jest.mock('../../../../UI/DeFiPositions/DeFiPositionsListItem', () => {
  const { Text } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const MockComponent = ({
    protocolAggregate,
  }: {
    protocolAggregate: { protocolDetails: { name: string } };
  }) =>
    ReactActual.createElement(
      Text,
      null,
      protocolAggregate.protocolDetails.name,
    );
  MockComponent.displayName = 'DeFiPositionsListItem';
  return MockComponent;
});

jest.mock('../../../../UI/DeFiPositions/DeFiPositionsListItemV2', () => {
  const { Text } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const MockComponent = ({ position }: { position: { protocolId: string } }) =>
    ReactActual.createElement(Text, null, position.protocolId);
  MockComponent.displayName = 'DeFiPositionsListItemV2';
  return MockComponent;
});

const createMockPosition = (name: string) => ({
  chainId: '0x1',
  protocolId: name.toLowerCase(),
  protocolAggregate: {
    protocolDetails: {
      name,
      iconUrl: `https://example.com/${name}.png`,
    },
    aggregatedMarketValue: 1000,
    positionTypes: {},
  },
});

const createMockV2Position = (protocolId: string) => ({
  protocolId,
  productName: protocolId,
  protocolIconUrl: `https://example.com/${protocolId}.png`,
  chainId: 'eip155:1',
  marketValue: 1000,
  iconGroup: [],
  sections: [],
});

describe('DeFiSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .requireMock('../../../../../selectors/deFiPositionsSectionEnabled')
      .selectDeFiPositionsSectionEnabled.mockReturnValue(true);
    jest
      .requireMock('../../../../../selectors/deFiPositionsV2SectionEnabled')
      .selectDeFiPositionsV2SectionEnabled.mockReturnValue(false);

    mockUseDeFiPositionsForHomepage.mockReturnValue({
      positions: [],
      isLoading: false,
      hasError: false,
      isEmpty: true,
    });

    mockUseDeFiPositionsV2.mockReturnValue({
      positions: [],
      isLoading: false,
      isError: false,
      hasFetched: false,
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    jest
      .requireMock('../../hooks/useSectionViewportVisible')
      .default.mockReturnValue({ isVisible: false, onLayout: jest.fn() });
  });

  describe('V1 path', () => {
    it('renders section title when enabled with positions', () => {
      mockUseDeFiPositionsForHomepage.mockReturnValue({
        positions: [createMockPosition('Aave')],
        isLoading: false,
        hasError: false,
        isEmpty: false,
      });

      renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.getByText('DeFi')).toBeOnTheScreen();
    });

    it('returns null when DeFi is disabled', () => {
      jest
        .requireMock('../../../../../selectors/deFiPositionsSectionEnabled')
        .selectDeFiPositionsSectionEnabled.mockReturnValue(false);

      const { toJSON } = renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(toJSON()).toBeNull();
    });

    it('returns null when positions are empty and not loading', () => {
      mockUseDeFiPositionsForHomepage.mockReturnValue({
        positions: [],
        isLoading: false,
        hasError: false,
        isEmpty: true,
      });

      const { toJSON } = renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders error state with retry when there is an error and not loading', () => {
      mockUseDeFiPositionsForHomepage.mockReturnValue({
        positions: [],
        isLoading: false,
        hasError: true,
        isEmpty: false,
      });

      renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.getByText('DeFi')).toBeOnTheScreen();
      expect(screen.getByText(/unable to load/i)).toBeOnTheScreen();
      expect(screen.getByText(/retry/i)).toBeOnTheScreen();
    });

    it('calls _executePoll on retry button press', async () => {
      mockUseDeFiPositionsForHomepage.mockReturnValue({
        positions: [],
        isLoading: false,
        hasError: true,
        isEmpty: false,
      });

      renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await act(async () => {
        fireEvent.press(screen.getByText(/retry/i));
      });

      expect(mockExecutePoll).toHaveBeenCalled();
    });

    it('renders skeleton when loading', () => {
      mockUseDeFiPositionsForHomepage.mockReturnValue({
        positions: [],
        isLoading: true,
        hasError: false,
        isEmpty: false,
      });

      renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.getByText('DeFi')).toBeOnTheScreen();
    });

    it('renders DeFi positions list items', () => {
      mockUseDeFiPositionsForHomepage.mockReturnValue({
        positions: [createMockPosition('Aave'), createMockPosition('Uniswap')],
        isLoading: false,
        hasError: false,
        isEmpty: false,
      });

      renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.getByText('Aave')).toBeOnTheScreen();
      expect(screen.getByText('Uniswap')).toBeOnTheScreen();
    });

    it('navigates to DeFi full view when title is pressed', () => {
      mockUseDeFiPositionsForHomepage.mockReturnValue({
        positions: [createMockPosition('Aave')],
        isLoading: false,
        hasError: false,
        isEmpty: false,
      });

      renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      fireEvent.press(screen.getByText('DeFi'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.DEFI_FULL_VIEW);
    });

    it('exposes refresh function via ref', async () => {
      mockUseDeFiPositionsForHomepage.mockReturnValue({
        positions: [createMockPosition('Aave')],
        isLoading: false,
        hasError: false,
        isEmpty: false,
      });

      const ref = createRef<SectionRefreshHandle>();

      renderWithProvider(
        <DeFiSection ref={ref} sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(ref.current).not.toBeNull();
      expect(typeof ref.current?.refresh).toBe('function');

      await act(async () => {
        await ref.current?.refresh();
      });

      expect(mockExecutePoll).toHaveBeenCalled();
    });

    it('calls _executePoll on focus when V1 is enabled', () => {
      mockUseDeFiPositionsForHomepage.mockReturnValue({
        positions: [createMockPosition('Aave')],
        isLoading: false,
        hasError: false,
        isEmpty: false,
      });

      renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(mockExecutePoll).toHaveBeenCalled();
    });
  });

  describe('V2 path', () => {
    beforeEach(() => {
      jest
        .requireMock('../../../../../selectors/deFiPositionsV2SectionEnabled')
        .selectDeFiPositionsV2SectionEnabled.mockReturnValue(true);
      jest
        .requireMock('../../../../../selectors/deFiPositionsSectionEnabled')
        .selectDeFiPositionsSectionEnabled.mockReturnValue(false);
    });

    it('renders a measurable placeholder while idle (not yet fetched)', () => {
      mockUseDeFiPositionsV2.mockReturnValue({
        positions: [],
        isLoading: false,
        isError: false,
        hasFetched: false,
        refresh: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.getByText('DeFi')).toBeOnTheScreen();
    });

    it('collapses to null only after a completed empty fetch', () => {
      mockUseDeFiPositionsV2.mockReturnValue({
        positions: [],
        isLoading: false,
        isError: false,
        hasFetched: true,
        refresh: jest.fn().mockResolvedValue(undefined),
      });

      const { toJSON } = renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders V2 positions when loaded', () => {
      mockUseDeFiPositionsV2.mockReturnValue({
        positions: [
          createMockV2Position('aave'),
          createMockV2Position('uniswap'),
        ],
        isLoading: false,
        isError: false,
        hasFetched: true,
        refresh: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.getByText('aave')).toBeOnTheScreen();
      expect(screen.getByText('uniswap')).toBeOnTheScreen();
    });

    it('does not call V1 _executePoll on focus when V2 is enabled', () => {
      mockUseDeFiPositionsV2.mockReturnValue({
        positions: [createMockV2Position('aave')],
        isLoading: false,
        isError: false,
        hasFetched: true,
        refresh: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(mockExecutePoll).not.toHaveBeenCalled();
    });

    it('passes isVisible into useDeFiPositionsV2 when section is visible', () => {
      jest
        .requireMock('../../hooks/useSectionViewportVisible')
        .default.mockReturnValue({ isVisible: true, onLayout: jest.fn() });

      mockUseDeFiPositionsV2.mockReturnValue({
        positions: [],
        isLoading: false,
        isError: false,
        hasFetched: false,
        refresh: jest.fn().mockResolvedValue(undefined),
      });

      renderWithProvider(
        <DeFiSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(mockUseDeFiPositionsV2).toHaveBeenCalledWith({
        enabled: true,
        isVisible: true,
      });
    });

    it('refresh via ref calls V2 refresh', async () => {
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      mockUseDeFiPositionsV2.mockReturnValue({
        positions: [createMockV2Position('aave')],
        isLoading: false,
        isError: false,
        hasFetched: true,
        refresh: mockRefresh,
      });

      const ref = createRef<SectionRefreshHandle>();

      renderWithProvider(
        <DeFiSection ref={ref} sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await act(async () => {
        await ref.current?.refresh();
      });

      expect(mockRefresh).toHaveBeenCalled();
      expect(mockExecutePoll).not.toHaveBeenCalled();
    });
  });
});
