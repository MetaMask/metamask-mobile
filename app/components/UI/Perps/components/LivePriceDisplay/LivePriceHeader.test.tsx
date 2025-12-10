import React from 'react';
import { render } from '@testing-library/react-native';
import LivePriceHeader from './LivePriceHeader';
import { PriceUpdate, usePerpsLivePrices } from '../../hooks/stream';
import Text from '../../../../../component-library/components/Texts/Text';

jest.mock('../../hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
      positionValue: { fontWeight: '700' },
      priceChange24h: { fontSize: 12 },
    },
    theme: {},
  })),
}));

const mockUsePerpsLivePrices = usePerpsLivePrices as jest.MockedFunction<
  typeof usePerpsLivePrices
>;

describe('LivePriceHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    mockUsePerpsLivePrices.mockReturnValue({});
    const component = render(<LivePriceHeader symbol="ETH" />);
    expect(component).toBeDefined();
  });

  it('should show placeholders when no price data available', () => {
    mockUsePerpsLivePrices.mockReturnValue({});
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should show placeholders when price data is undefined', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: undefined as unknown as PriceUpdate,
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should show placeholders when price is invalid (zero)', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        coin: 'ETH',
        price: '0',
        percentChange24h: '5',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should show placeholders when price is invalid (negative)', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        coin: 'ETH',
        price: '-100',
        percentChange24h: '5',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should show placeholders when price is invalid (NaN)', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        coin: 'ETH',
        price: 'invalid',
        percentChange24h: '5',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should render valid price and positive change', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        coin: 'ETH',
        price: '3000',
        percentChange24h: '5.5',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$3,000')).toBeTruthy(); // 4 sig figs, no trailing zeros
    expect(getByText('+5.50%')).toBeTruthy();
  });

  it('should render valid price and negative change', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        coin: 'ETH',
        price: '2500',
        percentChange24h: '-3.2',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$2,500')).toBeTruthy(); // 4 sig figs, no trailing zeros
    expect(getByText('-3.20%')).toBeTruthy();
  });

  it('should render valid price and zero change', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        coin: 'ETH',
        price: '2000',
        percentChange24h: '0',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="ETH" />);
    expect(getByText('$2,000')).toBeTruthy(); // 4 sig figs, no trailing zeros
    expect(getByText('+0.00%')).toBeTruthy();
  });

  it('should handle different symbols', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      SOL: {
        coin: 'SOL',
        price: '100',
        percentChange24h: '2.1',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(<LivePriceHeader symbol="SOL" />);
    expect(getByText('$100')).toBeTruthy(); // 4 sig figs, no trailing zeros
    expect(getByText('+2.10%')).toBeTruthy();
  });

  it('uses fallback price but shows loading state for change when no live data', () => {
    mockUsePerpsLivePrices.mockReturnValue({});
    const { getByText } = render(
      <LivePriceHeader symbol="ETH" fallbackPrice="1500" />,
    );
    expect(getByText('$1,500')).toBeTruthy(); // 4 sig figs, no trailing zeros
    expect(getByText('--%')).toBeTruthy();
  });

  it('should show placeholders when fallback price is invalid', () => {
    mockUsePerpsLivePrices.mockReturnValue({});
    const { getByText } = render(
      <LivePriceHeader symbol="ETH" fallbackPrice="0" />,
    );
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should prefer live data over fallback', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: {
        coin: 'BTC',
        price: '50000',
        percentChange24h: '3.0',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(
      <LivePriceHeader symbol="BTC" fallbackPrice="45000" />,
    );
    expect(getByText('$50,000')).toBeTruthy(); // 4 sig figs, no trailing zeros
    expect(getByText('+3.00%')).toBeTruthy();
  });

  describe('Color behavior for percentage change', () => {
    it('uses neutral color for loading state when percentChange is undefined', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          coin: 'ETH',
          price: '3000',
          percentChange24h: undefined,
          timestamp: Date.now(),
        },
      });

      const { UNSAFE_getAllByType } = render(<LivePriceHeader symbol="ETH" />);

      const textElements = UNSAFE_getAllByType(Text);
      const changeText = textElements.find((el) => el.props.children === '--%');
      expect(changeText).toBeDefined();
      expect(changeText?.props.color).toBe('Default');
    });

    it('uses neutral color for loading state when no live data exists', () => {
      mockUsePerpsLivePrices.mockReturnValue({});

      const { UNSAFE_getAllByType } = render(
        <LivePriceHeader symbol="ETH" fallbackPrice="1800" />,
      );

      const textElements = UNSAFE_getAllByType(Text);
      const changeText = textElements.find((el) => el.props.children === '--%');
      expect(changeText).toBeDefined();
      expect(changeText?.props.color).toBe('Default');
    });

    it('uses success color for positive percentage change', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          coin: 'ETH',
          price: '3000',
          percentChange24h: '5.5',
          timestamp: Date.now(),
        },
      });

      const { UNSAFE_getAllByType } = render(<LivePriceHeader symbol="ETH" />);

      const textElements = UNSAFE_getAllByType(Text);
      const changeText = textElements.find(
        (el) => el.props.children === '+5.50%',
      );
      expect(changeText).toBeDefined();
      expect(changeText?.props.color).toBe('Success');
    });

    it('uses error color for negative percentage change', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          coin: 'ETH',
          price: '2500',
          percentChange24h: '-3.2',
          timestamp: Date.now(),
        },
      });

      const { UNSAFE_getAllByType } = render(<LivePriceHeader symbol="ETH" />);

      const textElements = UNSAFE_getAllByType(Text);
      const changeText = textElements.find(
        (el) => el.props.children === '-3.20%',
      );
      expect(changeText).toBeDefined();
      expect(changeText?.props.color).toBe('Error');
    });

    it('uses success color for zero percentage change', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          coin: 'ETH',
          price: '2000',
          percentChange24h: '0',
          timestamp: Date.now(),
        },
      });

      const { UNSAFE_getAllByType } = render(<LivePriceHeader symbol="ETH" />);

      const textElements = UNSAFE_getAllByType(Text);
      const changeText = textElements.find(
        (el) => el.props.children === '+0.00%',
      );
      expect(changeText).toBeDefined();
      expect(changeText?.props.color).toBe('Success');
    });
  });

  describe('Loading state for percentage change', () => {
    it('displays loading state when price is available but percentChange is undefined', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          coin: 'ETH',
          price: '3000',
          percentChange24h: undefined,
          timestamp: Date.now(),
        },
      });

      const { getByText } = render(<LivePriceHeader symbol="ETH" />);

      expect(getByText('$3,000')).toBeTruthy();
      expect(getByText('--%')).toBeTruthy();
    });

    it('displays loading state when price is available but percentChange is missing', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          coin: 'ETH',
          price: '2500',
          timestamp: Date.now(),
        } as PriceUpdate,
      });

      const { getByText } = render(<LivePriceHeader symbol="ETH" />);

      expect(getByText('$2,500')).toBeTruthy();
      expect(getByText('--%')).toBeTruthy();
    });

    it('displays formatted zero when percentChange is legitimately 0', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          coin: 'ETH',
          price: '2000',
          percentChange24h: '0',
          timestamp: Date.now(),
        },
      });

      const { getByText, queryByText } = render(
        <LivePriceHeader symbol="ETH" />,
      );

      expect(getByText('$2,000')).toBeTruthy();
      expect(getByText('+0.00%')).toBeTruthy();
      expect(queryByText('--%')).toBeNull();
    });

    it('displays loading state when no live data exists', () => {
      mockUsePerpsLivePrices.mockReturnValue({});

      const { getByText } = render(
        <LivePriceHeader symbol="ETH" fallbackPrice="1800" />,
      );

      expect(getByText('$1,800')).toBeTruthy();
      expect(getByText('--%')).toBeTruthy();
    });

    it('uses live percentChange when available', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          coin: 'BTC',
          price: '55000',
          percentChange24h: '4.2',
          timestamp: Date.now(),
        },
      });

      const { getByText, queryByText } = render(
        <LivePriceHeader symbol="BTC" fallbackPrice="50000" />,
      );

      expect(getByText('$55,000')).toBeTruthy();
      expect(getByText('+4.20%')).toBeTruthy();
      expect(queryByText('--%')).toBeNull();
    });

    it('displays loading state when live price exists but percentChange is undefined', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          coin: 'ETH',
          price: '3100',
          percentChange24h: undefined,
          timestamp: Date.now(),
        },
      });

      const { getByText } = render(
        <LivePriceHeader symbol="ETH" fallbackPrice="3000" />,
      );

      expect(getByText('$3,100')).toBeTruthy();
      expect(getByText('--%')).toBeTruthy();
    });
  });
});
