import React from 'react';
import { render } from '@testing-library/react-native';
import LendingHero from './lending-hero';

const mockUseLendingDepositDetails = jest.fn();
const mockUseFiatFormatter = jest.fn();

// Create mock components using jest.fn to avoid out-of-scope variable issues
const mockView = jest
  .fn()
  .mockImplementation(({ testID, children }) =>
    React.createElement('View', { testID }, children),
  );

const mockText = jest
  .fn()
  .mockImplementation(({ testID, children }) =>
    React.createElement('Text', { testID }, children),
  );

jest.mock('./useLendingDepositDetails', () => ({
  useLendingDepositDetails: () => mockUseLendingDepositDetails(),
}));

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      networkAndTokenContainer: {},
      assetAmountContainer: {},
      assetAmountText: {},
      assetFiatConversionText: {},
      networkAvatar: {},
    },
  }),
}));

jest.mock(
  '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter',
  () => ({
    __esModule: true,
    default: () => mockUseFiatFormatter,
  }),
);

// Mock BadgeWrapper
jest.mock(
  '../../../../../../component-library/components/Badges/BadgeWrapper',
  () => ({
    __esModule: true,
    default: ({
      children,
      badgeElement,
    }: {
      children: React.ReactNode;
      badgeElement: React.ReactNode;
    }) =>
      mockView({ testID: 'badge-wrapper', children: [children, badgeElement] }),
    BadgePosition: { BottomRight: 'bottomRight' },
  }),
);

// Mock Badge
jest.mock(
  '../../../../../../component-library/components/Badges/Badge',
  () => ({
    __esModule: true,
    default: () => mockView({ testID: 'network-badge' }),
    BadgeVariant: { Network: 'network' },
  }),
);

// Mock NetworkAssetLogo
jest.mock(
  '../../../../../UI/NetworkAssetLogo',
  () =>
    ({ ticker, testID }: { chainId: string; ticker: string; testID: string }) =>
      mockView({ testID, children: mockText({ children: ticker }) }),
);

// Mock AvatarToken
jest.mock(
  '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken',
  () =>
    ({
      name,
      testID,
    }: {
      name: string;
      imageSource?: { uri: string };
      testID: string;
    }) =>
      mockView({ testID, children: mockText({ children: name }) }),
);

// Mock Text component
jest.mock('../../../../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => mockText({ testID, children }),
  TextVariant: {
    HeadingLG: 'HeadingLG',
    BodyMD: 'BodyMD',
  },
}));

jest.mock('../../../../../../util/networks', () => ({
  getNetworkImageSource: () => ({ uri: 'https://network.png' }),
}));

describe('LendingHero', () => {
  const createMockDetails = (overrides = {}) => ({
    token: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      decimals: 6,
      image: 'https://example.com/usdc.png',
      name: 'USD Coin',
      chainId: '0x1',
      isNative: false,
    },
    amountMinimalUnit: '1000000',
    tokenDecimals: 6,
    tokenFiat: '1.00',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLendingDepositDetails.mockReturnValue(null);
    mockUseFiatFormatter.mockReturnValue('$1.00');
  });

  it('returns null when no details available', () => {
    mockUseLendingDepositDetails.mockReturnValue(null);

    const { toJSON } = render(<LendingHero />);

    expect(toJSON()).toBeNull();
  });

  it('renders token avatar for non-native token', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId } = render(<LendingHero />);

    expect(getByTestId('earn-token-selector-USDC-0x1')).toBeDefined();
  });

  it('renders network asset logo for native token', () => {
    mockUseLendingDepositDetails.mockReturnValue(
      createMockDetails({
        token: {
          address: '0x0',
          symbol: 'ETH',
          decimals: 18,
          chainId: '0x1',
          isNative: true,
        },
      }),
    );

    const { getByTestId, getByText } = render(<LendingHero />);

    expect(getByTestId('earn-token-selector-ETH-0x1')).toBeDefined();
    expect(getByText('ETH')).toBeDefined();
  });

  it('renders badge wrapper with network badge', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId } = render(<LendingHero />);

    expect(getByTestId('badge-wrapper')).toBeDefined();
    expect(getByTestId('network-badge')).toBeDefined();
  });

  it('displays formatted token amount with symbol', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByText } = render(<LendingHero />);

    expect(getByText('1 USDC')).toBeDefined();
  });

  it('displays formatted fiat value', () => {
    mockUseFiatFormatter.mockReturnValue('$10.50');
    mockUseLendingDepositDetails.mockReturnValue(
      createMockDetails({ tokenFiat: '10.50' }),
    );

    const { getByText } = render(<LendingHero />);

    expect(getByText('$10.50')).toBeDefined();
  });

  it('displays larger token amounts correctly', () => {
    mockUseLendingDepositDetails.mockReturnValue(
      createMockDetails({
        amountMinimalUnit: '100000000', // 100 USDC
        tokenDecimals: 6,
      }),
    );

    const { getByText } = render(<LendingHero />);

    expect(getByText('100 USDC')).toBeDefined();
  });

  it('calls fiat formatter with token fiat value', () => {
    mockUseLendingDepositDetails.mockReturnValue(
      createMockDetails({ tokenFiat: '25.50' }),
    );

    render(<LendingHero />);

    expect(mockUseFiatFormatter).toHaveBeenCalled();
  });
});
