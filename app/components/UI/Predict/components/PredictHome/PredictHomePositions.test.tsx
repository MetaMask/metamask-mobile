import React from 'react';
import { render, act } from '@testing-library/react-native';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import PredictHomePositions, {
  PredictHomePositionsHandle,
} from './PredictHomePositions';
import { PredictPosition, PredictPositionStatus } from '../../types';

jest.mock('../../hooks/usePredictPositions');

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackPositionViewed: jest.fn(),
    },
  },
}));

jest.mock('./PredictHomeSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="predict-home-skeleton" />,
  };
});

jest.mock('./PredictHomeFeatured', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="predict-home-featured" />,
  };
});

jest.mock('./PredictHomeAccountState', () => {
  const ReactLib = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ReactLib.forwardRef(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_props: unknown, ref: any) => {
        ReactLib.useImperativeHandle(ref, () => ({
          refresh: jest.fn(),
        }));
        return <View testID="predict-home-account-state" />;
      },
    ),
  };
});

jest.mock('./PredictHomePositionList', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="predict-home-position-list" />,
  };
});

jest.mock('./PredictHomeFeaturedSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ variant }: { variant: string }) => (
      <View testID={`predict-home-featured-skeleton-${variant}`} />
    ),
  };
});

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'carousel'),
}));

const mockUsePredictPositions = usePredictPositions as jest.MockedFunction<
  typeof usePredictPositions
>;

describe('PredictHomePositions', () => {
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

  const defaultMockReturn = {
    positions: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    loadPositions: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictPositions.mockReturnValue(defaultMockReturn);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders skeleton when loading active positions', () => {
    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockReturn,
        isLoading: true,
      })
      .mockReturnValueOnce(defaultMockReturn);

    const { getByTestId, queryByTestId } = render(<PredictHomePositions />);

    expect(getByTestId('predict-home-skeleton')).toBeOnTheScreen();
    expect(queryByTestId('predict-home-featured')).not.toBeOnTheScreen();
    expect(queryByTestId('predict-home-account-state')).not.toBeOnTheScreen();
  });

  it('renders skeleton when loading claimable positions', () => {
    mockUsePredictPositions
      .mockReturnValueOnce(defaultMockReturn)
      .mockReturnValueOnce({
        ...defaultMockReturn,
        isLoading: true,
      });

    const { getByTestId, queryByTestId } = render(<PredictHomePositions />);

    expect(getByTestId('predict-home-skeleton')).toBeOnTheScreen();
    expect(queryByTestId('predict-home-featured')).not.toBeOnTheScreen();
    expect(queryByTestId('predict-home-account-state')).not.toBeOnTheScreen();
  });

  it('renders featured carousel when no positions exist', () => {
    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockReturn,
        positions: [],
      })
      .mockReturnValueOnce({
        ...defaultMockReturn,
        positions: [],
      });

    const { getByTestId, queryByTestId } = render(<PredictHomePositions />);

    expect(getByTestId('predict-home-featured')).toBeOnTheScreen();
    expect(queryByTestId('predict-home-skeleton')).not.toBeOnTheScreen();
    expect(queryByTestId('predict-home-account-state')).not.toBeOnTheScreen();
  });

  it('renders account state and position list when active positions exist', () => {
    const positions = [createMockPosition()];
    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockReturn,
        positions,
      })
      .mockReturnValueOnce({
        ...defaultMockReturn,
        positions: [],
      });

    const { getByTestId, queryByTestId } = render(<PredictHomePositions />);

    expect(getByTestId('predict-home-account-state')).toBeOnTheScreen();
    expect(getByTestId('predict-home-position-list')).toBeOnTheScreen();
    expect(queryByTestId('predict-home-skeleton')).not.toBeOnTheScreen();
    expect(queryByTestId('predict-home-featured')).not.toBeOnTheScreen();
  });

  it('renders account state and position list when claimable positions exist', () => {
    const claimablePosition = createMockPosition({
      claimable: true,
      status: PredictPositionStatus.REDEEMABLE,
    });
    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockReturn,
        positions: [],
      })
      .mockReturnValueOnce({
        ...defaultMockReturn,
        positions: [claimablePosition],
      });

    const { getByTestId, queryByTestId } = render(<PredictHomePositions />);

    expect(getByTestId('predict-home-account-state')).toBeOnTheScreen();
    expect(getByTestId('predict-home-position-list')).toBeOnTheScreen();
    expect(queryByTestId('predict-home-skeleton')).not.toBeOnTheScreen();
    expect(queryByTestId('predict-home-featured')).not.toBeOnTheScreen();
  });

  it('invokes loadPositions refresh when ref refresh is called', async () => {
    const mockLoadPositions = jest.fn().mockResolvedValue(undefined);
    const mockLoadClaimable = jest.fn().mockResolvedValue(undefined);
    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockReturn,
        positions: [createMockPosition()],
        loadPositions: mockLoadPositions,
      })
      .mockReturnValueOnce({
        ...defaultMockReturn,
        positions: [],
        loadPositions: mockLoadClaimable,
      });

    const ref = React.createRef<PredictHomePositionsHandle>();
    render(<PredictHomePositions ref={ref} />);

    await act(async () => {
      await ref.current?.refresh();
    });

    expect(mockLoadPositions).toHaveBeenCalledWith({ isRefresh: true });
    expect(mockLoadClaimable).toHaveBeenCalledWith({ isRefresh: true });
  });

  it('calls onError when active positions error occurs', () => {
    const mockOnError = jest.fn();
    mockUsePredictPositions
      .mockReturnValueOnce({
        ...defaultMockReturn,
        error: 'Active positions error',
      })
      .mockReturnValueOnce(defaultMockReturn);

    render(<PredictHomePositions onError={mockOnError} />);

    expect(mockOnError).toHaveBeenCalledWith('Active positions error');
  });

  it('calls onError when claimable positions error occurs', () => {
    const mockOnError = jest.fn();
    mockUsePredictPositions
      .mockReturnValueOnce(defaultMockReturn)
      .mockReturnValueOnce({
        ...defaultMockReturn,
        error: 'Claimable positions error',
      });

    render(<PredictHomePositions onError={mockOnError} />);

    expect(mockOnError).toHaveBeenCalledWith('Claimable positions error');
  });
});
