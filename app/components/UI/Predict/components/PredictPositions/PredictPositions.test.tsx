import { screen, act, fireEvent } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { usePredictPrices } from '../../hooks/usePredictPrices';
import { PredictPosition, PredictPositionStatus } from '../../types';
import PredictPositions, { PredictPositionsHandle } from './PredictPositions';
import PredictPositionComponent from '../PredictPosition/PredictPosition';

// Mock FlashList to manually render items for proper test rendering
jest.mock('@shopify/flash-list', () => {
  const ReactActual = jest.requireActual('react');
  const ReactNativeActual = jest.requireActual('react-native');

  return {
    FlashList: ReactActual.forwardRef(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (
        {
          data,
          renderItem,
          ListEmptyComponent,
          ListFooterComponent,
          testID,
        }: // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any,
        ref: unknown,
      ) => (
        <ReactNativeActual.ScrollView testID={testID} ref={ref}>
          {data && data.length > 0 ? (
            <>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.map((item: any, index: number) => (
                <ReactActual.Fragment key={index}>
                  {renderItem({ item, index })}
                </ReactActual.Fragment>
              ))}
              {ListFooterComponent && ListFooterComponent}
            </>
          ) : (
            <>
              {ListEmptyComponent && ListEmptyComponent}
              {ListFooterComponent && ListFooterComponent}
            </>
          )}
        </ReactNativeActual.ScrollView>
      ),
    ),
  };
});

jest.mock('../../hooks/usePredictPositions');
jest.mock('../../hooks/usePredictPrices');

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

const mockOnPress = jest.fn();
jest.mock('../PredictPosition/PredictPosition', () => {
  const ReactNative = jest.requireActual('react-native');
  return jest.fn(
    ({ onPress }: { onPress: () => void; position: PredictPosition }) => (
      <ReactNative.TouchableOpacity
        testID="predict-position"
        onPress={() => {
          mockOnPress();
          onPress();
        }}
      >
        <ReactNative.Text>Position</ReactNative.Text>
      </ReactNative.TouchableOpacity>
    ),
  );
});

jest.mock('../PredictPositionEmpty', () => {
  const ReactNative = jest.requireActual('react-native');
  return jest.fn(() => <ReactNative.View testID="predict-position-empty" />);
});

const mockResolvedOnPress = jest.fn();
jest.mock('../PredictPositionResolved/PredictPositionResolved', () => {
  const ReactNative = jest.requireActual('react-native');
  return jest.fn(
    ({ onPress }: { onPress: () => void; position: PredictPosition }) => (
      <ReactNative.TouchableOpacity
        testID="predict-position-resolved"
        onPress={() => {
          mockResolvedOnPress();
          onPress();
        }}
      >
        <ReactNative.Text>Resolved Position</ReactNative.Text>
      </ReactNative.TouchableOpacity>
    ),
  );
});

jest.mock('../PredictNewButton', () => 'PredictNewButton');

const mockUsePredictPositions = usePredictPositions as jest.MockedFunction<
  typeof usePredictPositions
>;
const mockUsePredictPrices = usePredictPrices as jest.MockedFunction<
  typeof usePredictPrices
>;

const mockPredictPositionComponent =
  PredictPositionComponent as unknown as jest.Mock;

const mockNavigation = {
  navigate: jest.fn(),
};

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

describe('PredictPositions', () => {
  const createMockPosition = (overrides = {}): PredictPosition => ({
    id: '1',
    providerId: 'provider1',
    marketId: 'market1',
    outcomeId: 'outcome1',
    outcome: 'Yes',
    outcomeTokenId: 'token1',
    currentValue: 100,
    title: 'Test Market 1',
    icon: 'icon1',
    amount: 10,
    price: 1.5,
    status: PredictPositionStatus.OPEN,
    size: 10,
    outcomeIndex: 0,
    realizedPnl: 5,
    percentPnl: 50,
    cashPnl: 5,
    claimable: false,
    initialValue: 10,
    avgPrice: 1.0,
    endDate: '2024-01-01T00:00:00Z',
    negRisk: false,
    ...overrides,
  });

  const createClaimablePosition = (overrides = {}): PredictPosition =>
    createMockPosition({
      id: '3',
      claimable: true,
      status: PredictPositionStatus.REDEEMABLE,
      ...overrides,
    });

  const mockPositions: PredictPosition[] = [
    createMockPosition(),
    createMockPosition({
      id: '2',
      marketId: 'market2',
      outcomeId: 'outcome2',
      outcome: 'No',
      outcomeTokenId: 'token2',
      currentValue: 200,
      amount: 20,
      price: 2.0,
      size: 20,
      outcomeIndex: 1,
      realizedPnl: 10,
      percentPnl: 25,
      cashPnl: 10,
      initialValue: 20,
      endDate: '2024-01-02T00:00:00Z',
    }),
  ];

  const defaultMockHookReturn = {
    positions: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadPositions: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to default return value for each test
    mockUsePredictPositions.mockReturnValue(defaultMockHookReturn);
    mockUsePredictPrices.mockReturnValue({
      prices: { providerId: 'polymarket', results: [] },
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when isLoading is true', () => {
    // Arrange
    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        isLoading: true,
        positions: [],
      })
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        positions: [],
      });

    // Act
    renderWithProvider(<PredictPositions />);

    // Assert - Check for skeleton loaders instead of activity indicator
    expect(screen.getByTestId('predict-position-skeleton-1')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-position-skeleton-2')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-position-skeleton-3')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-position-skeleton-4')).toBeOnTheScreen();
  });

  it('renders loading state when isRefreshing and no positions', () => {
    // Arrange
    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        isRefreshing: true,
        positions: [],
      })
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        positions: [],
      });

    // Act
    renderWithProvider(<PredictPositions />);

    // Assert - Check for skeleton loaders instead of activity indicator
    expect(screen.getByTestId('predict-position-skeleton-1')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-position-skeleton-2')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-position-skeleton-3')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-position-skeleton-4')).toBeOnTheScreen();
  });

  it('renders active positions list when no positions and not loading', () => {
    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        positions: [],
      })
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        positions: [],
      });

    renderWithProvider(<PredictPositions />);

    expect(
      screen.getByTestId('predict-active-positions-list'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('predict-claimable-positions-list'),
    ).not.toBeOnTheScreen();
  });

  it('renders active positions list when positions exist', () => {
    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        positions: mockPositions,
      })
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        positions: [],
      });

    renderWithProvider(<PredictPositions />);

    expect(
      screen.getByTestId('predict-active-positions-list'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('predict-claimable-positions-list'),
    ).not.toBeOnTheScreen();
  });

  it('renders both active and claimable positions lists when claimable positions exist', () => {
    const claimablePosition = createClaimablePosition();
    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        positions: mockPositions,
      })
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        positions: [claimablePosition],
      });

    renderWithProvider(<PredictPositions />);

    expect(
      screen.getByTestId('predict-active-positions-list'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('predict-claimable-positions-list'),
    ).toBeOnTheScreen();
  });

  it('calls loadPositions for both hooks when refresh is invoked', () => {
    const mockLoadPositions = jest.fn();
    const mockLoadClaimablePositions = jest.fn();
    const ref = React.createRef<PredictPositionsHandle>();
    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        loadPositions: mockLoadPositions,
      })
      .mockReturnValueOnce({
        ...defaultMockHookReturn,
        loadPositions: mockLoadClaimablePositions,
      });

    renderWithProvider(<PredictPositions ref={ref} />);

    act(() => {
      ref.current?.refresh();
    });

    expect(mockLoadPositions).toHaveBeenCalledWith({ isRefresh: true });
    expect(mockLoadClaimablePositions).toHaveBeenCalledWith({
      isRefresh: true,
    });
  });

  describe('Error Handling', () => {
    it('invokes onError with positions error message', () => {
      const onError = jest.fn();
      const errorMessage = 'Failed to load positions';

      mockUsePredictPositions
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          error: errorMessage,
        })
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
        });

      renderWithProvider(<PredictPositions onError={onError} />);

      expect(onError).toHaveBeenCalledWith(errorMessage);
    });

    it('invokes onError with claimable positions error message', () => {
      const onError = jest.fn();
      const errorMessage = 'Failed to load claimable positions';

      mockUsePredictPositions
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
        })
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          error: errorMessage,
        });

      renderWithProvider(<PredictPositions onError={onError} />);

      expect(onError).toHaveBeenCalledWith(errorMessage);
    });

    it('invokes onError with first error when both hooks fail', () => {
      const onError = jest.fn();
      const positionsError = 'Failed to load positions';
      const claimableError = 'Failed to load claimable';

      mockUsePredictPositions
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          error: positionsError,
        })
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          error: claimableError,
        });

      renderWithProvider(<PredictPositions onError={onError} />);

      expect(onError).toHaveBeenCalledWith(positionsError);
    });

    it('invokes onError with null when no errors occur', () => {
      const onError = jest.fn();

      mockUsePredictPositions
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
        })
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
        });

      renderWithProvider(<PredictPositions onError={onError} />);

      expect(onError).toHaveBeenCalledWith(null);
    });
  });

  describe('Navigation', () => {
    it('navigates to market details screen when active position is pressed', () => {
      mockUsePredictPositions
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: mockPositions,
        })
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: [],
        });

      renderWithProvider(<PredictPositions />);
      const positionElement = screen.getAllByTestId('predict-position')[0];
      fireEvent.press(positionElement);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Predict', {
        screen: 'PredictMarketDetails',
        params: {
          marketId: mockPositions[0].marketId,
          headerShown: false,
          entryPoint: 'homepage_positions',
        },
      });
    });

    it('navigates to market details screen when resolved position is pressed', () => {
      const claimablePosition = createClaimablePosition();

      mockUsePredictPositions
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: [],
        })
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: [claimablePosition],
        });

      renderWithProvider(<PredictPositions />);
      const resolvedPositionElement = screen.getByTestId(
        'predict-position-resolved',
      );
      fireEvent.press(resolvedPositionElement);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Predict', {
        screen: 'PredictMarketDetails',
        params: {
          marketId: claimablePosition.marketId,
          headerShown: false,
          entryPoint: 'homepage_positions',
        },
      });
    });
  });

  describe('Empty State Rendering', () => {
    it('displays empty state when no positions exist', () => {
      mockUsePredictPositions
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: [],
        })
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: [],
        });

      renderWithProvider(<PredictPositions />);

      expect(screen.getByTestId('predict-position-empty')).toBeOnTheScreen();
    });

    it('hides empty state when active positions exist', () => {
      mockUsePredictPositions
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: mockPositions,
        })
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: [],
        });

      renderWithProvider(<PredictPositions />);

      expect(
        screen.queryByTestId('predict-position-empty'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-active-positions-list'),
      ).toBeOnTheScreen();
    });

    it('hides empty state when claimable positions exist', () => {
      const claimablePosition = createClaimablePosition();

      mockUsePredictPositions
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: [],
        })
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: [claimablePosition],
        });

      renderWithProvider(<PredictPositions />);

      expect(
        screen.queryByTestId('predict-position-empty'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-claimable-positions-list'),
      ).toBeOnTheScreen();
    });

    it('hides empty state when both position types exist', () => {
      const claimablePosition = createClaimablePosition();

      mockUsePredictPositions
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: mockPositions,
        })
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: [claimablePosition],
        });

      renderWithProvider(<PredictPositions />);

      expect(
        screen.queryByTestId('predict-position-empty'),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-active-positions-list'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-claimable-positions-list'),
      ).toBeOnTheScreen();
    });
  });

  describe('Homepage Redesign V1 Features', () => {
    const mockLoadPositions = jest.fn();
    const mockLoadClaimablePositions = jest.fn();

    it('calculates correct activePositionsHeight when isHomepageRedesignV1Enabled is true', () => {
      const positions = [createMockPosition(), createMockPosition()];
      mockUsePredictPositions
        .mockReturnValueOnce({
          positions,
          isRefreshing: false,
          loadPositions: mockLoadPositions,
          isLoading: false,
          error: null,
        })
        .mockReturnValueOnce({
          positions: [],
          isRefreshing: false,
          loadPositions: mockLoadClaimablePositions,
          isLoading: false,
          error: null,
        });

      renderWithProvider(<PredictPositions />, {
        state: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  homepageRedesignV1: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        },
      });

      expect(
        screen.getByTestId('predict-active-positions-list'),
      ).toBeOnTheScreen();
    });

    it('calculates correct claimablePositionsHeight when isHomepageRedesignV1Enabled is true', () => {
      const claimablePosition = createClaimablePosition();
      mockUsePredictPositions
        .mockReturnValueOnce({
          positions: [],
          isRefreshing: false,
          loadPositions: mockLoadPositions,
          isLoading: false,
          error: null,
        })
        .mockReturnValueOnce({
          positions: [claimablePosition],
          isRefreshing: false,
          loadPositions: mockLoadClaimablePositions,
          isLoading: false,
          error: null,
        });

      renderWithProvider(<PredictPositions />, {
        state: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  homepageRedesignV1: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        },
      });

      expect(
        screen.getByTestId('predict-claimable-positions-list'),
      ).toBeOnTheScreen();
    });

    it('returns undefined activePositionsHeight when positions are empty', () => {
      mockUsePredictPositions
        .mockReturnValueOnce({
          positions: [],
          isRefreshing: false,
          loadPositions: mockLoadPositions,
          isLoading: false,
          error: null,
        })
        .mockReturnValueOnce({
          positions: [],
          isRefreshing: false,
          loadPositions: mockLoadClaimablePositions,
          isLoading: false,
          error: null,
        });

      renderWithProvider(<PredictPositions />, {
        state: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  homepageRedesignV1: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        },
      });

      expect(screen.getByTestId('predict-position-empty')).toBeOnTheScreen();
    });

    it('does not calculate fixed heights when isHomepageRedesignV1Enabled is false', () => {
      const position = createMockPosition();
      mockUsePredictPositions
        .mockReturnValueOnce({
          positions: [position],
          isRefreshing: false,
          loadPositions: mockLoadPositions,
          isLoading: false,
          error: null,
        })
        .mockReturnValueOnce({
          positions: [],
          isRefreshing: false,
          loadPositions: mockLoadClaimablePositions,
          isLoading: false,
          error: null,
        });

      renderWithProvider(<PredictPositions />, {
        state: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  homepageRedesignV1: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        },
      });

      expect(
        screen.getByTestId('predict-active-positions-list'),
      ).toBeOnTheScreen();
    });
  });

  describe('Loading State Styling', () => {
    const mockLoadPositions = jest.fn();
    const mockLoadClaimablePositions = jest.fn();

    it('applies correct styles for loading state when isHomepageRedesignV1Enabled is true', () => {
      mockUsePredictPositions
        .mockReturnValueOnce({
          positions: [],
          isRefreshing: false,
          loadPositions: mockLoadPositions,
          isLoading: true,
          error: null,
        })
        .mockReturnValueOnce({
          positions: [],
          isRefreshing: false,
          loadPositions: mockLoadClaimablePositions,
          isLoading: false,
          error: null,
        });

      renderWithProvider(<PredictPositions />, {
        state: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  homepageRedesignV1: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        },
      });

      // Check for skeleton loaders instead of activity indicator
      expect(
        screen.getByTestId('predict-position-skeleton-1'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-position-skeleton-2'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-position-skeleton-3'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-position-skeleton-4'),
      ).toBeOnTheScreen();
    });

    it('applies correct styles for loading state when isHomepageRedesignV1Enabled is false', () => {
      mockUsePredictPositions
        .mockReturnValueOnce({
          positions: [],
          isRefreshing: false,
          loadPositions: mockLoadPositions,
          isLoading: true,
          error: null,
        })
        .mockReturnValueOnce({
          positions: [],
          isRefreshing: false,
          loadPositions: mockLoadClaimablePositions,
          isLoading: false,
          error: null,
        });

      renderWithProvider(<PredictPositions />, {
        state: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  homepageRedesignV1: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        },
      });

      // Check for skeleton loaders instead of activity indicator
      expect(
        screen.getByTestId('predict-position-skeleton-1'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-position-skeleton-2'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-position-skeleton-3'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-position-skeleton-4'),
      ).toBeOnTheScreen();
    });
  });

  describe('Fixed Height Wrapping', () => {
    const mockLoadPositions = jest.fn();
    const mockLoadClaimablePositions = jest.fn();

    it('wraps active positions FlashList with fixed height when homepage redesign is enabled', () => {
      const positions = [
        createMockPosition(),
        createMockPosition({ id: '2' }),
        createMockPosition({ id: '3' }),
      ];
      mockUsePredictPositions
        .mockReturnValueOnce({
          positions,
          isRefreshing: false,
          loadPositions: mockLoadPositions,
          isLoading: false,
          error: null,
        })
        .mockReturnValueOnce({
          positions: [],
          isRefreshing: false,
          loadPositions: mockLoadClaimablePositions,
          isLoading: false,
          error: null,
        });

      renderWithProvider(<PredictPositions />, {
        state: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  homepageRedesignV1: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        },
      });

      expect(
        screen.getByTestId('predict-active-positions-list'),
      ).toBeOnTheScreen();
    });

    it('wraps claimable positions FlashList with fixed height when homepage redesign is enabled', () => {
      const claimablePositions = [
        createClaimablePosition(),
        createClaimablePosition({ id: '4' }),
      ];
      mockUsePredictPositions
        .mockReturnValueOnce({
          positions: [],
          isRefreshing: false,
          loadPositions: mockLoadPositions,
          isLoading: false,
          error: null,
        })
        .mockReturnValueOnce({
          positions: claimablePositions,
          isRefreshing: false,
          loadPositions: mockLoadClaimablePositions,
          isLoading: false,
          error: null,
        });

      renderWithProvider(<PredictPositions />, {
        state: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  homepageRedesignV1: {
                    enabled: true,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        },
      });

      expect(
        screen.getByTestId('predict-claimable-positions-list'),
      ).toBeOnTheScreen();
    });

    it('does not wrap FlashLists when homepage redesign is disabled', () => {
      const position = createMockPosition();
      const claimablePosition = createClaimablePosition();
      mockUsePredictPositions
        .mockReturnValueOnce({
          positions: [position],
          isRefreshing: false,
          loadPositions: mockLoadPositions,
          isLoading: false,
          error: null,
        })
        .mockReturnValueOnce({
          positions: [claimablePosition],
          isRefreshing: false,
          loadPositions: mockLoadClaimablePositions,
          isLoading: false,
          error: null,
        });

      renderWithProvider(<PredictPositions />, {
        state: {
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  homepageRedesignV1: {
                    enabled: false,
                    minimumVersion: '1.0.0',
                  },
                },
                cacheTimestamp: 0,
              },
            },
          },
        },
      });

      expect(
        screen.getByTestId('predict-active-positions-list'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('predict-claimable-positions-list'),
      ).toBeOnTheScreen();
    });
  });

  describe('Real-time prices', () => {
    it('requests CLOB prices for each active position', () => {
      // Arrange
      mockUsePredictPositions
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: mockPositions,
          isLoading: false,
        })
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: [],
          isLoading: false,
        });

      // Act
      renderWithProvider(<PredictPositions />);

      // Assert
      expect(mockUsePredictPrices).toHaveBeenCalledWith({
        queries: [
          {
            marketId: mockPositions[0].marketId,
            outcomeId: mockPositions[0].outcomeId,
            outcomeTokenId: mockPositions[0].outcomeTokenId,
          },
          {
            marketId: mockPositions[1].marketId,
            outcomeId: mockPositions[1].outcomeId,
            outcomeTokenId: mockPositions[1].outcomeTokenId,
          },
        ],
        providerId: 'polymarket',
        enabled: true,
        pollingInterval: 5000,
      });
    });

    it('passes updated currentValue and percentPnl to PredictPosition when prices are returned', () => {
      // Arrange
      const positions: PredictPosition[] = [
        createMockPosition({
          id: 'p-1',
          marketId: 'm-1',
          outcomeId: 'o-1',
          outcomeTokenId: 't-1',
          size: 10,
          initialValue: 10,
          currentValue: 999,
          percentPnl: 999,
        }),
      ];

      mockUsePredictPositions
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions,
          isLoading: false,
        })
        .mockReturnValueOnce({
          ...defaultMockHookReturn,
          positions: [],
          isLoading: false,
        });

      mockUsePredictPrices.mockReturnValue({
        prices: {
          providerId: 'polymarket',
          results: [
            {
              marketId: 'm-1',
              outcomeId: 'o-1',
              outcomeTokenId: 't-1',
              entry: { buy: 0.2, sell: 0.19 },
            },
          ],
        },
        isFetching: false,
        error: null,
        refetch: jest.fn(),
      });

      // Act
      renderWithProvider(<PredictPositions />);

      // Assert
      const firstCallProps = mockPredictPositionComponent.mock.calls[0][0] as {
        position: PredictPosition;
        skipOptimisticRefresh?: boolean;
      };

      expect(firstCallProps.skipOptimisticRefresh).toBe(true);
      expect(firstCallProps.position.currentValue).toBe(2);
      expect(firstCallProps.position.percentPnl).toBe(-80);
    });
  });
});
