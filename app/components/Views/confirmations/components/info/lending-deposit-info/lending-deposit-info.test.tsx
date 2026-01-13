import React from 'react';
import { render } from '@testing-library/react-native';
import LendingDepositInfo, {
  LendingDepositInfoSkeleton,
} from './lending-deposit-info';
import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';

const mockUseLendingDepositDetails = jest.fn();
const mockUseClearConfirmationOnBackSwipe = jest.fn();
const mockUseNavbar = jest.fn();
const mockTrackPageViewedEvent = jest.fn();
const mockSetConfirmationMetric = jest.fn();

// Create mock components using jest.fn to avoid out-of-scope variable issues
const mockView = jest
  .fn()
  .mockImplementation(({ testID, children }) =>
    React.createElement('View', { testID }, children),
  );

const mockScrollView = jest
  .fn()
  .mockImplementation(({ testID, children }) =>
    React.createElement('ScrollView', { testID }, children),
  );

jest.mock('./useLendingDepositDetails', () => ({
  useLendingDepositDetails: () => mockUseLendingDepositDetails(),
}));

jest.mock('../../../hooks/ui/useClearConfirmationOnBackSwipe', () => ({
  __esModule: true,
  default: () => mockUseClearConfirmationOnBackSwipe(),
}));

jest.mock('../../../hooks/ui/useNavbar', () => ({
  __esModule: true,
  default: (title: string) => mockUseNavbar(title),
}));

jest.mock('../../../hooks/metrics/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: () => ({
    trackPageViewedEvent: mockTrackPageViewedEvent,
    setConfirmationMetric: mockSetConfirmationMetric,
  }),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'earn.supply': 'Supply',
    };
    return translations[key] || key;
  },
}));

// Mock child components
jest.mock('./lending-hero', () => ({
  __esModule: true,
  default: () => mockView({ testID: 'lending-hero' }),
}));

jest.mock('./lending-details', () => ({
  __esModule: true,
  default: () => mockView({ testID: 'lending-details' }),
}));

jest.mock('./lending-receive-section', () => ({
  __esModule: true,
  default: () => mockView({ testID: 'lending-receive-section' }),
}));

jest.mock('../../rows/transactions/gas-fee-details-row', () => ({
  __esModule: true,
  default: () => mockView({ testID: 'gas-fee-details-row' }),
}));

jest.mock(
  '../../rows/transactions/advanced-details-row/advanced-details-row',
  () => ({
    __esModule: true,
    default: () => mockView({ testID: 'advanced-details-row' }),
  }),
);

// Mock Skeleton
jest.mock('../../../../../../component-library/components/Skeleton', () => ({
  Skeleton: ({ testID }: { testID?: string }) =>
    mockView({ testID: testID || 'skeleton' }),
}));

// Mock ScrollView
jest.mock('react-native-gesture-handler', () => ({
  ScrollView: ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID: string;
  }) => mockScrollView({ testID, children }),
}));

describe('LendingDepositInfo', () => {
  const createMockDetails = (overrides = {}) => ({
    tokenSymbol: 'USDC',
    tokenAmount: '10',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLendingDepositDetails.mockReturnValue(null);
  });

  it('calls useClearConfirmationOnBackSwipe', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    render(<LendingDepositInfo />);

    expect(mockUseClearConfirmationOnBackSwipe).toHaveBeenCalled();
  });

  it('sets navbar title with token symbol', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    render(<LendingDepositInfo />);

    expect(mockUseNavbar).toHaveBeenCalledWith('Supply USDC');
  });

  it('sets navbar title without symbol when details not available', () => {
    mockUseLendingDepositDetails.mockReturnValue(null);

    render(<LendingDepositInfo />);

    expect(mockUseNavbar).toHaveBeenCalledWith('Supply ');
  });

  it('tracks page viewed event on mount', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    render(<LendingDepositInfo />);

    expect(mockTrackPageViewedEvent).toHaveBeenCalled();
  });

  it('sets confirmation metric when details available', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    render(<LendingDepositInfo />);

    expect(mockSetConfirmationMetric).toHaveBeenCalledWith({
      properties: {
        selected_provider: 'consensys',
        transaction_amount: '10',
        token: 'USDC',
        experience: 'STABLECOIN_LENDING',
      },
    });
  });

  it('does not set confirmation metric when tokenAmount is missing', () => {
    mockUseLendingDepositDetails.mockReturnValue(
      createMockDetails({ tokenAmount: undefined }),
    );

    render(<LendingDepositInfo />);

    expect(mockSetConfirmationMetric).not.toHaveBeenCalled();
  });

  it('renders ScrollView with correct testID', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId } = render(<LendingDepositInfo />);

    expect(
      getByTestId(ConfirmationInfoComponentIDs.LENDING_DEPOSIT),
    ).toBeDefined();
  });

  it('renders LendingHero component', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId } = render(<LendingDepositInfo />);

    expect(getByTestId('lending-hero')).toBeDefined();
  });

  it('renders LendingDetails component', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId } = render(<LendingDepositInfo />);

    expect(getByTestId('lending-details')).toBeDefined();
  });

  it('renders LendingReceiveSection component', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId } = render(<LendingDepositInfo />);

    expect(getByTestId('lending-receive-section')).toBeDefined();
  });

  it('renders GasFeesDetailsRow component', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId } = render(<LendingDepositInfo />);

    expect(getByTestId('gas-fee-details-row')).toBeDefined();
  });

  it('renders AdvancedDetailsRow component', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId } = render(<LendingDepositInfo />);

    expect(getByTestId('advanced-details-row')).toBeDefined();
  });
});

describe('LendingDepositInfoSkeleton', () => {
  it('renders skeleton with correct testID', () => {
    const { getByTestId } = render(<LendingDepositInfoSkeleton />);

    expect(
      getByTestId(ConfirmationInfoComponentIDs.LENDING_DEPOSIT),
    ).toBeDefined();
  });

  it('renders hero skeleton elements', () => {
    const { getAllByTestId } = render(<LendingDepositInfoSkeleton />);

    // Should have multiple skeleton elements for hero section
    const skeletons = getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
