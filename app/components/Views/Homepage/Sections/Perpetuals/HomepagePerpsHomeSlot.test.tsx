import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
  HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS,
  HomepagePerpsPillsEmptyVariant,
} from '../../abTestConfig';
import HomepagePerpsHomeSlot from './HomepagePerpsHomeSlot';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

const mockUseABTest = jest.fn();
jest.mock('../../../../../hooks', () => ({
  useABTest: (...args: unknown[]) =>
    Reflect.apply(mockUseABTest, undefined, args),
}));

jest.mock('../../../../UI/Perps/hooks', () => ({
  usePerpsLivePositions: jest.fn(),
  usePerpsLiveOrders: jest.fn(),
}));

jest.mock('../../../../UI/Perps/hooks/usePerpsConnection', () => ({
  usePerpsConnection: jest.fn(),
}));

jest.mock('./PerpsSection', () => {
  const ReactLib = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ReactLib.forwardRef((_props: unknown, _ref: unknown) =>
      ReactLib.createElement(RN.Text, null, 'PerpsSection'),
    ),
  };
});

jest.mock('./HomepagePerpsMoversSection', () => {
  const ReactLib = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ReactLib.forwardRef((_props: unknown, _ref: unknown) =>
      ReactLib.createElement(RN.Text, null, 'HomepagePerpsMoversSection'),
    ),
  };
});

const mockUsePerpsLivePositions = jest.mocked(
  jest.requireMock('../../../../UI/Perps/hooks').usePerpsLivePositions,
);
const mockUsePerpsLiveOrders = jest.mocked(
  jest.requireMock('../../../../UI/Perps/hooks').usePerpsLiveOrders,
);
const mockUsePerpsConnection = jest.mocked(
  jest.requireMock('../../../../UI/Perps/hooks/usePerpsConnection')
    .usePerpsConnection,
);

describe('HomepagePerpsHomeSlot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [],
      isInitialLoading: false,
    });
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isConnecting: false,
      isInitialized: true,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });
  });

  it('renders PerpsSection when experiment is control', () => {
    mockUseABTest.mockImplementation((key: string) => {
      if (key === HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY) {
        return {
          variant:
            HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS[
              HomepagePerpsPillsEmptyVariant.Control
            ],
          variantName: HomepagePerpsPillsEmptyVariant.Control,
          isActive: true,
        };
      }
      return {
        variant: {},
        variantName: 'control',
        isActive: false,
      };
    });

    renderWithProvider(
      <HomepagePerpsHomeSlot sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(screen.getByText('PerpsSection')).toBeOnTheScreen();
    expect(screen.queryByText('HomepagePerpsMoversSection')).toBeNull();
    expect(mockUsePerpsLivePositions).not.toHaveBeenCalled();
    expect(mockUsePerpsLiveOrders).not.toHaveBeenCalled();
  });

  it('renders HomepagePerpsMoversSection when experiment is treatment and user has no positions or orders', () => {
    mockUseABTest.mockImplementation((key: string) => {
      if (key === HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY) {
        return {
          variant:
            HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS[
              HomepagePerpsPillsEmptyVariant.Treatment
            ],
          variantName: HomepagePerpsPillsEmptyVariant.Treatment,
          isActive: true,
        };
      }
      return {
        variant: {},
        variantName: 'control',
        isActive: false,
      };
    });

    renderWithProvider(
      <HomepagePerpsHomeSlot sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(screen.getByText('HomepagePerpsMoversSection')).toBeOnTheScreen();
    expect(screen.queryByText('PerpsSection')).toBeNull();
    expect(mockUsePerpsLivePositions).toHaveBeenCalled();
    expect(mockUsePerpsLiveOrders).toHaveBeenCalled();
  });

  it('renders PerpsSection when treatment user is empty and connection is errored', () => {
    mockUseABTest.mockImplementation((key: string) => {
      if (key === HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY) {
        return {
          variant:
            HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS[
              HomepagePerpsPillsEmptyVariant.Treatment
            ],
          variantName: HomepagePerpsPillsEmptyVariant.Treatment,
          isActive: true,
        };
      }
      return {
        variant: {},
        variantName: 'control',
        isActive: false,
      };
    });
    mockUsePerpsConnection.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      error: 'CONNECTION_TIMEOUT',
      connect: jest.fn(),
      disconnect: jest.fn(),
      resetError: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    });

    renderWithProvider(
      <HomepagePerpsHomeSlot sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(screen.getByText('PerpsSection')).toBeOnTheScreen();
    expect(screen.queryByText('HomepagePerpsMoversSection')).toBeNull();
  });

  it('renders PerpsSection when mode is positions-only even in treatment', () => {
    mockUseABTest.mockImplementation((key: string) => {
      if (key === HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY) {
        return {
          variant:
            HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS[
              HomepagePerpsPillsEmptyVariant.Treatment
            ],
          variantName: HomepagePerpsPillsEmptyVariant.Treatment,
          isActive: true,
        };
      }
      return {
        variant: {},
        variantName: 'control',
        isActive: false,
      };
    });

    renderWithProvider(
      <HomepagePerpsHomeSlot
        sectionIndex={1}
        totalSectionsLoaded={5}
        mode="positions-only"
      />,
    );

    expect(screen.getByText('PerpsSection')).toBeOnTheScreen();
    expect(mockUsePerpsLivePositions).not.toHaveBeenCalled();
    expect(mockUsePerpsLiveOrders).not.toHaveBeenCalled();
  });

  it('renders PerpsSection when user has open positions', () => {
    mockUseABTest.mockImplementation((key: string) => {
      if (key === HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY) {
        return {
          variant:
            HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS[
              HomepagePerpsPillsEmptyVariant.Treatment
            ],
          variantName: HomepagePerpsPillsEmptyVariant.Treatment,
          isActive: true,
        };
      }
      return {
        variant: {},
        variantName: 'control',
        isActive: false,
      };
    });
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [{ symbol: 'ETH-PERP' } as never],
      isInitialLoading: false,
    });

    renderWithProvider(
      <HomepagePerpsHomeSlot sectionIndex={1} totalSectionsLoaded={5} />,
    );

    expect(screen.getByText('PerpsSection')).toBeOnTheScreen();
    expect(mockUsePerpsLivePositions).toHaveBeenCalled();
  });
});
