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
    const component = render(<LivePriceHeader symbol="ETH" currentPrice={0} />);
    expect(component).toBeDefined();
  });

  it('should show placeholders when price is invalid (zero)', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        symbol: 'ETH',
        price: '0',
        percentChange24h: '5',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(
      <LivePriceHeader symbol="ETH" currentPrice={0} />,
    );
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should show placeholders when price is invalid (negative)', () => {
    const { getByText } = render(
      <LivePriceHeader symbol="ETH" currentPrice={-1} />,
    );
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should show placeholders when price is invalid (NaN)', () => {
    const { getByText } = render(
      <LivePriceHeader symbol="ETH" currentPrice={Number.NaN} />,
    );
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  it('should render valid price and positive change', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        symbol: 'ETH',
        price: '3000',
        percentChange24h: '5.5',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(
      <LivePriceHeader symbol="ETH" currentPrice={3000} />,
    );
    expect(getByText('$3,000')).toBeTruthy(); // 4 sig figs, no trailing zeros
    expect(getByText('+5.50%')).toBeTruthy();
  });

  it('should render valid price and negative change', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        symbol: 'ETH',
        price: '2500',
        percentChange24h: '-3.2',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(
      <LivePriceHeader symbol="ETH" currentPrice={2500} />,
    );
    expect(getByText('$2,500')).toBeTruthy(); // 4 sig figs, no trailing zeros
    expect(getByText('-3.20%')).toBeTruthy();
  });

  it('should render valid price and zero change', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      ETH: {
        symbol: 'ETH',
        price: '2000',
        percentChange24h: '0',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(
      <LivePriceHeader symbol="ETH" currentPrice={2000} />,
    );
    expect(getByText('$2,000')).toBeTruthy(); // 4 sig figs, no trailing zeros
    expect(getByText('+0.00%')).toBeTruthy();
  });

  it('should handle different symbols', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      SOL: {
        symbol: 'SOL',
        price: '100',
        percentChange24h: '2.1',
        timestamp: Date.now(),
      },
    });
    const { getByText } = render(
      <LivePriceHeader symbol="SOL" currentPrice={100} />,
    );
    expect(getByText('$100')).toBeTruthy(); // 4 sig figs, no trailing zeros
    expect(getByText('+2.10%')).toBeTruthy();
  });

  it('should show placeholders when fallback price is invalid', () => {
    mockUsePerpsLivePrices.mockReturnValue({});
    const { getByText } = render(
      <LivePriceHeader symbol="ETH" currentPrice={0} />,
    );
    expect(getByText('$---')).toBeTruthy();
    expect(getByText('--%')).toBeTruthy();
  });

  describe('Color behavior for percentage change', () => {
    it('uses neutral color for loading state when percentChange is undefined', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          symbol: 'ETH',
          price: '3000',
          percentChange24h: undefined,
          timestamp: Date.now(),
        },
      });

      const { UNSAFE_getAllByType } = render(
        <LivePriceHeader currentPrice={0} symbol="ETH" />,
      );

      const textElements = UNSAFE_getAllByType(Text);
      const changeText = textElements.find((el) => el.props.children === '--%');
      expect(changeText).toBeDefined();
      expect(changeText?.props.color).toBe('Default');
    });

    it('uses neutral color for loading state when no live data exists', () => {
      mockUsePerpsLivePrices.mockReturnValue({});

      const { UNSAFE_getAllByType } = render(
        <LivePriceHeader symbol="ETH" currentPrice={0} />,
      );

      const textElements = UNSAFE_getAllByType(Text);
      const changeText = textElements.find((el) => el.props.children === '--%');
      expect(changeText).toBeDefined();
      expect(changeText?.props.color).toBe('Default');
    });

    it('uses success color for positive percentage change', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          symbol: 'ETH',
          price: '3000',
          percentChange24h: '5.5',
          timestamp: Date.now(),
        },
      });

      const { UNSAFE_getAllByType } = render(
        <LivePriceHeader symbol="ETH" currentPrice={3000} />,
      );

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
          symbol: 'ETH',
          price: '2500',
          percentChange24h: '-3.2',
          timestamp: Date.now(),
        },
      });

      const { UNSAFE_getAllByType } = render(
        <LivePriceHeader symbol="ETH" currentPrice={2500} />,
      );

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
          symbol: 'ETH',
          price: '2000',
          percentChange24h: '0',
          timestamp: Date.now(),
        },
      });

      const { UNSAFE_getAllByType } = render(
        <LivePriceHeader symbol="ETH" currentPrice={1} />,
      );

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
          symbol: 'ETH',
          price: '3000',
          percentChange24h: undefined,
          timestamp: Date.now(),
        },
      });

      const { getByText } = render(
        <LivePriceHeader symbol="ETH" currentPrice={3000} />,
      );

      expect(getByText('$3,000')).toBeTruthy();
      expect(getByText('--%')).toBeTruthy();
    });

    it('displays loading state when price is available but percentChange is missing', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          symbol: 'ETH',
          price: '2500',
          timestamp: Date.now(),
        } as PriceUpdate,
      });

      const { getByText } = render(
        <LivePriceHeader symbol="ETH" currentPrice={2500} />,
      );

      expect(getByText('$2,500')).toBeTruthy();
      expect(getByText('--%')).toBeTruthy();
    });

    it('displays formatted zero when percentChange is legitimately 0', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          symbol: 'ETH',
          price: '2000',
          percentChange24h: '0',
          timestamp: Date.now(),
        },
      });

      const { getByText, queryByText } = render(
        <LivePriceHeader symbol="ETH" currentPrice={2000} />,
      );

      expect(getByText('$2,000')).toBeTruthy();
      expect(getByText('+0.00%')).toBeTruthy();
      expect(queryByText('--%')).toBeNull();
    });

    it('displays loading state when no live data exists', () => {
      mockUsePerpsLivePrices.mockReturnValue({});

      const { getByText } = render(
        <LivePriceHeader symbol="ETH" currentPrice={1800} />,
      );

      expect(getByText('$1,800')).toBeTruthy();
      expect(getByText('--%')).toBeTruthy();
    });

    it('displays loading state when live price exists but percentChange is undefined', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          symbol: 'ETH',
          price: '3100',
          percentChange24h: undefined,
          timestamp: Date.now(),
        },
      });

      const { getByText } = render(
        <LivePriceHeader symbol="ETH" currentPrice={3100} />,
      );

      expect(getByText('$3,100')).toBeTruthy();
      expect(getByText('--%')).toBeTruthy();
    });
  });
});
