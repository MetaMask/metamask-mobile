import React from 'react';
import { render } from '@testing-library/react-native';
import LendingDetails from './lending-details';

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

jest.mock('./useLendingDepositDetails', () => ({
  useLendingDepositDetails: () => mockUseLendingDepositDetails(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'Identicon'),
}));

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: () => ({ styles: {} }),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'earn.apr': 'APR',
      'stake.estimated_annual_reward': 'Estimated Annual Reward',
      'stake.reward_frequency': 'Reward Frequency',
      'stake.withdrawal_time': 'Withdrawal Time',
      'earn.protocol': 'Protocol',
      'earn.tooltip_content.apr.part_one': 'APR tooltip part one',
      'earn.tooltip_content.apr.part_two': 'APR tooltip part two',
      'earn.tooltip_content.reward_frequency': 'Reward frequency tooltip',
      'earn.tooltip_content.withdrawal_time': 'Withdrawal time tooltip',
      'earn.tooltip_content.protocol': 'Protocol tooltip',
    };
    return translations[key] || key;
  },
}));

// Mock child components
jest.mock(
  '../../UI/info-row/info-section/info-section',
  () =>
    ({ children, testID }: { children: React.ReactNode; testID: string }) =>
      mockView({ testID, children }),
);

jest.mock(
  '../../UI/info-row',
  () =>
    ({
      label,
      children,
      tooltip,
    }: {
      label: string;
      children: React.ReactNode;
      tooltip?: React.ReactNode;
    }) =>
      mockView({
        testID: `info-row-${label}`,
        children: [
          mockText({ key: 'label', children: label }),
          mockView({
            key: 'content',
            testID: `info-row-${label}-content`,
            children:
              typeof children === 'string' ? mockText({ children }) : children,
          }),
          tooltip
            ? mockView({
                key: 'tooltip',
                testID: `tooltip-${label}`,
                children: tooltip,
              })
            : null,
        ],
      }),
);

jest.mock(
  '../../../../../UI/Stake/components/StakingConfirmation/ContractTag/ContractTag',
  () =>
    ({
      contractAddress,
      contractName,
    }: {
      contractAddress: string;
      contractName: string;
    }) =>
      mockText({
        testID: 'contract-tag',
        children: `${contractName} - ${contractAddress}`,
      }),
);

describe('LendingDetails', () => {
  const createMockDetails = (overrides = {}) => ({
    apr: '5.25',
    annualRewardsFiat: '$52.50',
    annualRewardsToken: '52.50 USDC',
    rewardFrequency: 'Every minute',
    withdrawalTime: 'Immediate',
    protocol: 'Aave',
    protocolContractAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLendingDepositDetails.mockReturnValue(null);
  });

  it('returns null when no details available', () => {
    mockUseLendingDepositDetails.mockReturnValue(null);

    const { toJSON } = render(<LendingDetails />);

    expect(toJSON()).toBeNull();
  });

  it('renders info section with correct testID', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId } = render(<LendingDetails />);

    expect(getByTestId('lending-details')).toBeDefined();
  });

  it('renders APR row with value', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId, getByText } = render(<LendingDetails />);

    expect(getByTestId('info-row-APR')).toBeDefined();
    expect(getByText('5.25%')).toBeDefined();
  });

  it('renders APR tooltip', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId } = render(<LendingDetails />);

    expect(getByTestId('tooltip-APR')).toBeDefined();
  });

  it('renders estimated annual reward row', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId, getByText } = render(<LendingDetails />);

    expect(getByTestId('info-row-Estimated Annual Reward')).toBeDefined();
    expect(getByText('$52.50')).toBeDefined();
    expect(getByText('52.50 USDC')).toBeDefined();
  });

  it('renders reward frequency row with tooltip', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId, getByText } = render(<LendingDetails />);

    expect(getByTestId('info-row-Reward Frequency')).toBeDefined();
    expect(getByText('Every minute')).toBeDefined();
    expect(getByTestId('tooltip-Reward Frequency')).toBeDefined();
  });

  it('renders withdrawal time row with tooltip', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId, getByText } = render(<LendingDetails />);

    expect(getByTestId('info-row-Withdrawal Time')).toBeDefined();
    expect(getByText('Immediate')).toBeDefined();
    expect(getByTestId('tooltip-Withdrawal Time')).toBeDefined();
  });

  it('renders protocol row with contract tag', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId, getByText } = render(<LendingDetails />);

    expect(getByTestId('info-row-Protocol')).toBeDefined();
    expect(getByTestId('contract-tag')).toBeDefined();
    expect(
      getByText('Aave - 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'),
    ).toBeDefined();
  });

  it('renders protocol tooltip', () => {
    mockUseLendingDepositDetails.mockReturnValue(createMockDetails());

    const { getByTestId } = render(<LendingDetails />);

    expect(getByTestId('tooltip-Protocol')).toBeDefined();
  });

  it('renders with different APR value', () => {
    mockUseLendingDepositDetails.mockReturnValue(
      createMockDetails({ apr: '12.75' }),
    );

    const { getByText } = render(<LendingDetails />);

    expect(getByText('12.75%')).toBeDefined();
  });
});
