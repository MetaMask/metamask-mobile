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
    const { getByText } = render(<TronStakePreview stakeAmount="5" />);

    expect(getByText('Est. annual reward')).toBeOnTheScreen();
    expect(getByText(/0[,.]670 TRX/)).toBeOnTheScreen();
  });

  it('calculates annual reward from floating-point balances without precision errors', () => {
    // This test verifies BigNumber is used for calculations.
    // totalStakedTrx is now pre-computed in the selector using BigNumber,
    // so floating-point errors like 65.48463 + 65.48463 = 130.96926000000002 are avoided.
    const mockResourcesMap = createMockResourcesMap(130.96926);

    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectTronResourcesBySelectedAccountGroup) {
        return mockResourcesMap;
      }
      return undefined;
    });

    // Stake amount of 10, total staked is 130.96926 + 10 = 140.96926
    // Annual reward = 140.96926 * 0.0335 = 4.722 (rounded to 3 decimals)
    const { getByText } = render(<TronStakePreview stakeAmount="10" />);

    expect(getByText('Est. annual reward')).toBeOnTheScreen();
    expect(getByText(/4[,.]722 TRX/)).toBeOnTheScreen();
  });

  it('displays existing staked balance reward when stakeAmount is empty string', () => {
    // When user clears input, stakeAmount becomes ''.
    // new BigNumber('') returns NaN, which must not propagate to the UI.
    // With existing staked balance (15 TRX), reward = 15 * 0.0335 = 0.503 TRX
    const { getByText, queryByText } = render(
      <TronStakePreview stakeAmount="" />,
    );

    expect(getByText('Est. annual reward')).toBeOnTheScreen();
    expect(getByText(/0[,.]503 TRX/)).toBeOnTheScreen();
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
