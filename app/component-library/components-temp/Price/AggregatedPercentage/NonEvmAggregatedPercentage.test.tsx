import React from 'react';
import { render } from '@testing-library/react-native';
import { mockTheme } from '../../../../util/theme';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import {
  FORMATTED_VALUE_PRICE_TEST_ID,
  FORMATTED_PERCENTAGE_TEST_ID,
} from './AggregatedPercentage.constants';
import NonEvmAggregatedPercentage from './NonEvmAggregatedPercentage';
// eslint-disable-next-line import/no-namespace
import * as multichain from '../../../../selectors/multichain/multichain';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain/multichain';

const mockGetMultichainNetworkAggregatedBalance = {
  balances: {
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
      amount: '1',
      unit: 'SOL',
    },
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv':
      {
        amount: '5',
        unit: 'PENGU',
      },
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
      {
        amount: '10',
        unit: 'USDC',
      },
  },
  fiatBalances: {
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': '1',
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv':
      '5.4',
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
      '10.',
  },
  totalBalanceFiat: 16.4,
  totalNativeTokenBalance: {
    amount: '1',
    unit: 'SOL',
  },
};

const mockMultichainAssetsRatesPositive = {
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
    marketData: {
      pricePercentChange: {
        P1D: +1.1,
      },
    },
    rate: '147.98',
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv':
    {
      marketData: {
        pricePercentChange: {
          P1D: +2.7,
        },
      },
      rate: '0.00624788',
    },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
    {
      marketData: {
        pricePercentChange: {
          P1D: +0.5,
        },
      },
      rate: '0.999998',
    },
};

const mockMultichainAssetsRatesNegative = {
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
    marketData: {
      pricePercentChange: {
        P1D: -1.1,
      },
    },
    rate: '147.98',
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv':
    {
      marketData: {
        pricePercentChange: {
          P1D: -2.7,
        },
      },
      rate: '0.00624788',
    },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
    {
      marketData: {
        pricePercentChange: {
          P1D: -0.5,
        },
      },
      rate: '0.999998',
    },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
describe('NonEvmAggregatedPercentage', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectCurrentCurrency) return 'USD';
    });
  });
  afterEach(() => {
    (useSelector as jest.Mock).mockClear();
  });

  it('renders positive percentage change correctly', () => {
    jest
      .spyOn(multichain, 'getMultichainNetworkAggregatedBalance')
      .mockReturnValue(mockGetMultichainNetworkAggregatedBalance);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectCurrentCurrency) return 'USD';
      if (selector === selectMultichainAssetsRates)
        return mockMultichainAssetsRatesPositive;
    });
    const { getByText } = render(<NonEvmAggregatedPercentage />);

    expect(getByText('(+1.25%)')).toBeTruthy();
    expect(getByText('+0.2 USD')).toBeTruthy();

    expect(getByText('(+1.25%)').props.style).toMatchObject({
      color: mockTheme.colors.success.default,
    });
  });

  it('renders negative percentage change correctly', () => {
    jest
      .spyOn(multichain, 'getMultichainNetworkAggregatedBalance')
      .mockReturnValue(mockGetMultichainNetworkAggregatedBalance);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectCurrentCurrency) return 'USD';
      if (selector === selectMultichainAssetsRates)
        return mockMultichainAssetsRatesNegative;
    });
    const { getByText } = render(<NonEvmAggregatedPercentage />);

    expect(getByText('(-1.27%)')).toBeTruthy();
    expect(getByText('-0.21 USD')).toBeTruthy();

    expect(getByText('(-1.27%)').props.style).toMatchObject({
      color: mockTheme.colors.error.default,
    });
  });

  it('renders correctly with privacy mode on', () => {
    jest
      .spyOn(multichain, 'getMultichainNetworkAggregatedBalance')
      .mockReturnValue(mockGetMultichainNetworkAggregatedBalance);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectCurrentCurrency) return 'USD';
      if (selector === selectMultichainAssetsRates)
        return mockMultichainAssetsRatesNegative;
    });
    const { getByTestId } = render(<NonEvmAggregatedPercentage privacyMode />);

    const formattedPercentage = getByTestId(FORMATTED_PERCENTAGE_TEST_ID);
    const formattedValuePrice = getByTestId(FORMATTED_VALUE_PRICE_TEST_ID);

    expect(formattedPercentage.props.children).toBe('••••••••••');
    expect(formattedValuePrice.props.children).toBe('••••••••••');
  });
});