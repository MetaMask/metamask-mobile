import React from 'react';
import { render } from '@testing-library/react-native';
import LendingReceiveSection, {
  LENDING_RECEIVE_SECTION_TEST_ID,
} from './lending-receive-section';

const mockUseLendingDepositDetails = jest.fn();

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

// Mock AvatarSize before imports that use it
jest.mock(
  '../../../../../../component-library/components/Avatars/Avatar',
  () => ({
    AvatarSize: { Xs: 'xs', Sm: 'sm', Md: 'md', Lg: 'lg', Xl: 'xl' },
  }),
);

jest.mock('./useLendingDepositDetails', () => ({
  useLendingDepositDetails: () => mockUseLendingDepositDetails(),
}));

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      infoSectionContent: {},
      receiveRow: {},
      receiptTokenRow: {},
      receiptTokenRowLeft: {},
      receiptTokenRowRight: {},
      receiveTokenIcon: {},
    },
  }),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'earn.receive': 'Receive',
      'earn.tooltip_content.receive': 'You will receive this token',
    };
    return translations[key] || key;
  },
}));

// Mock InfoSection
jest.mock(
  '../../UI/info-row/info-section/info-section',
  () =>
    ({ children, testID }: { children: React.ReactNode; testID: string }) =>
      mockView({ testID, children }),
);

// Mock Tooltip
jest.mock(
  '../../UI/Tooltip/Tooltip',
  () =>
    ({
      title,
      content,
    }: {
      title: string;
      content: string;
      iconColor: string;
    }) =>
      mockView({
        testID: 'tooltip',
        children: [
          mockText({ key: 'title', testID: 'tooltip-title', children: title }),
          mockText({
            key: 'content',
            testID: 'tooltip-content',
            children: content,
          }),
        ],
      }),
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
  TextColor: { Alternative: 'alternative' },
  TextVariant: { BodyMDMedium: 'BodyMDMedium', BodyMD: 'BodyMD' },
}));

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
      testID?: string;
    }) =>
      mockView({
        testID: testID || 'avatar-token',
        children: mockText({ children: name }),
      }),
);

jest.mock('../../../../../../component-library/components/Icons/Icon', () => ({
  IconColor: { Alternative: 'alternative' },
}));

describe('LendingReceiveSection', () => {
  const createMockDetails = (overrides = {}) => ({
    receiptTokenName: 'Aave Ethereum USDC',
    receiptTokenAmount: '1.5 aEthUSDC',
    receiptTokenAmountFiat: '$1.50',
    receiptTokenImage: 'https://example.com/ausdc.png',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLendingDepositDetails.mockReturnValue(null);
  });

  it('returns null when no details available', () => {
    mockUseLendingDepositDetails.mockReturnValue(null);

    const { toJSON } = render(<LendingReceiveSection />);

    expect(toJSON()).toBeNull();
  });

  it('renders info section with correct testID', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId } = render(<LendingReceiveSection />);

    expect(getByTestId(LENDING_RECEIVE_SECTION_TEST_ID)).toBeDefined();
  });

  it('displays "Receive" label', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getAllByText } = render(<LendingReceiveSection />);

    // "Receive" appears as label and in tooltip
    const receiveElements = getAllByText('Receive');
    expect(receiveElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders tooltip with title and content', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId, getByText } = render(<LendingReceiveSection />);

    expect(getByTestId('tooltip')).toBeDefined();
    expect(getByTestId('tooltip-title')).toBeDefined();
    expect(getByText('You will receive this token')).toBeDefined();
  });

  it('displays receipt token name', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getAllByText } = render(<LendingReceiveSection />);

    // Token name appears twice - in avatar and as label
    const tokenNameElements = getAllByText('Aave Ethereum USDC');
    expect(tokenNameElements.length).toBeGreaterThanOrEqual(1);
  });

  it('displays receipt token amount', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByText } = render(<LendingReceiveSection />);

    expect(getByText('1.5 aEthUSDC')).toBeDefined();
  });

  it('displays receipt token fiat amount', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByText } = render(<LendingReceiveSection />);

    expect(getByText('$1.50')).toBeDefined();
  });

  it('renders avatar token with receipt token image', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId } = render(<LendingReceiveSection />);

    expect(getByTestId('avatar-token')).toBeDefined();
  });

  it('displays different token amounts correctly', () => {
    mockUseLendingDepositDetails.mockReturnValue(
      createMockDetails({
        receiptTokenAmount: '100 aUSDT',
        receiptTokenAmountFiat: '$100.00',
      }),
    );

    const { getByText } = render(<LendingReceiveSection />);

    expect(getByText('100 aUSDT')).toBeDefined();
    expect(getByText('$100.00')).toBeDefined();
  });
});
