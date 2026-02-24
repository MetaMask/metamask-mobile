import React from 'react';
import { render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';

import TronStakePreview from './TronStakePreview';
import {
  selectTronResourcesBySelectedAccountGroup,
  TronResourcesMap,
} from '../../../../../../selectors/assets/assets-list';
import type { ComputeFeeResult } from '../../../utils/tron-staking-snap';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockTw = jest.fn(() => ({}));
    Object.assign(mockTw, {
      style: jest.fn(() => ({})),
    });
    return mockTw;
  },
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'stake.tron.estimated_annual_reward': 'Est. annual reward',
      'stake.tron.trx_locked_for': 'TRX locked for',
      'stake.tron.trx_locked_for_minimum_time': 'minimum time',
      'stake.tron.fee': 'Fee',
      'stake.tron.trx_released_in': 'TRX released in',
      'stake.tron.trx_released_in_minimum_time': 'released in minimum time',
    };
    return map[key] ?? key;
  },
}));

const mockUseTronStakeApy = jest.fn();
jest.mock('../../../hooks/useTronStakeApy', () => ({
  __esModule: true,
  default: () => mockUseTronStakeApy(),
}));

const mockUseSelector = useSelector as jest.Mock;

const createMockResourcesMap = (totalStakedTrx: number): TronResourcesMap => ({
  energy: undefined,
  bandwidth: undefined,
  maxEnergy: undefined,
  maxBandwidth: undefined,
  stakedTrxForEnergy: undefined,
  stakedTrxForBandwidth: undefined,
  totalStakedTrx,
});

describe('TronStakePreview', () => {
  beforeEach(() => {
    // Default APY mock
    mockUseTronStakeApy.mockReturnValue({
      isLoading: false,
      errorMessage: null,
      apyDecimal: '2.44',
      apyPercent: '2.44%',
      refetch: jest.fn(),
    });

    // Default: 10 + 5 = 15 TRX staked
    const mockResourcesMap = createMockResourcesMap(15);

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectTronResourcesBySelectedAccountGroup) {
        return mockResourcesMap;
      }
      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('displays estimated annual reward based on staked balance and input amount', () => {
    // (15 staked + 5 input) * (2.44 / 100) APR = 0.488 TRX
    const { getByText } = render(<TronStakePreview stakeAmount="5" />);

    expect(getByText('Est. annual reward')).toBeOnTheScreen();
    expect(getByText(/0[,.]488 TRX/)).toBeOnTheScreen();
  });

  it('calculates annual reward from floating-point balances without precision errors', () => {
    const mockResourcesMap = createMockResourcesMap(130.96926);

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectTronResourcesBySelectedAccountGroup) {
        return mockResourcesMap;
      }
      return undefined;
    });

    // Stake amount of 10, total staked is 130.96926 + 10 = 140.96926
    // Annual reward = 140.96926 * (2.44 / 100) = 3.440 (rounded to 3 decimals)
    const { getByText } = render(<TronStakePreview stakeAmount="10" />);

    expect(getByText('Est. annual reward')).toBeOnTheScreen();
    expect(getByText(/3[,.]440 TRX/)).toBeOnTheScreen();
  });

  it('displays existing staked balance reward when stakeAmount is empty string', () => {
    // When user clears input, stakeAmount becomes ''.
    // new BigNumber('') returns NaN, which must not propagate to the UI.
    // With existing staked balance (15 TRX), reward = 15 * (2.44 / 100) = 0.366 TRX
    const { getByText, queryByText } = render(
      <TronStakePreview stakeAmount="" />,
    );

    expect(getByText('Est. annual reward')).toBeOnTheScreen();
    expect(getByText(/0[,.]366 TRX/)).toBeOnTheScreen();
    expect(queryByText(/NaN/)).toBeNull();
  });

  it('shows release information without annual reward when mode is unstake', () => {
    const { getByText, queryByText } = render(
      <TronStakePreview stakeAmount="5" mode="unstake" />,
    );

    expect(getByText('TRX released in')).toBeOnTheScreen();
    expect(getByText('released in minimum time')).toBeOnTheScreen();
    expect(queryByText('Est. annual reward')).toBeNull();
    expect(queryByText('TRX locked for')).toBeNull();
  });

  it('returns empty reward when apyDecimal is not available', () => {
    mockUseTronStakeApy.mockReturnValue({
      isLoading: true,
      errorMessage: null,
      apyDecimal: null,
      apyPercent: null,
      refetch: jest.fn(),
    });

    const { getByText, queryByText } = render(
      <TronStakePreview stakeAmount="5" />,
    );

    expect(getByText('Est. annual reward')).toBeOnTheScreen();
    // Reward value should be empty when APY is not available
    // Use specific pattern to match numeric reward format, not "TRX locked for" label
    expect(queryByText(/\d+[,.]?\d* TRX/)).toBeNull();
  });

  it('returns empty reward when stakeAmount is a non-numeric string', () => {
    const { getByText, queryByText } = render(
      <TronStakePreview stakeAmount="abc" />,
    );

    expect(getByText('Est. annual reward')).toBeOnTheScreen();
    // BigNumber('abc') is NaN, so reward should be empty
    expect(queryByText(/\d+[,.]?\d* TRX/)).toBeNull();
  });

  it('returns empty reward when unstaking more than total staked balance', () => {
    // With 15 TRX staked and unstaking 20, totalForRewards = max(15 - 20, 0) = 0
    const { queryByText } = render(
      <TronStakePreview stakeAmount="20" mode="unstake" />,
    );

    // In unstake mode, the annual reward row is not rendered,
    // but the useMemo still runs and returns '' for lte(0)
    expect(queryByText('Est. annual reward')).toBeNull();
  });

  it('returns empty reward when total staked balance is zero in stake mode', () => {
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectTronResourcesBySelectedAccountGroup) {
        return createMockResourcesMap(0);
      }
      return undefined;
    });

    const { getByText, queryByText } = render(
      <TronStakePreview stakeAmount="0" mode="stake" />,
    );

    expect(getByText('Est. annual reward')).toBeOnTheScreen();
    // totalForRewards = 0 + 0 = 0, lte(0) returns ''
    expect(queryByText(/\d+[,.]?\d* TRX/)).toBeNull();
  });

  it.each([
    [
      'array fee',
      [
        {
          type: 'network',
          asset: {
            unit: 'TRX',
            type: 'native',
            amount: '1.234',
            fungible: true,
          },
        },
      ] as ComputeFeeResult,
    ],
    [
      'single fee item',
      {
        type: 'network',
        asset: { unit: 'TRX', type: 'native', amount: '1.234', fungible: true },
      } as ComputeFeeResult[0],
    ],
  ])('renders fee row when %s is provided', (_label, feeProp) => {
    const { getByText } = render(<TronStakePreview fee={feeProp} />);

    expect(getByText('Fee')).toBeOnTheScreen();
    expect(getByText(/1[,.]234 TRX/)).toBeOnTheScreen();
  });
});
