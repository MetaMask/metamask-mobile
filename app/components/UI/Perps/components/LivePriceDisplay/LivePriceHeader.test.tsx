import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import LivePriceHeader from './LivePriceHeader';
import { PriceUpdate, usePerpsLivePrices } from '../../hooks/stream';

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
        isTradable: true,
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
        isTradable: true,
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
        isTradable: true,
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
        isTradable: true,
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
        isTradable: true,
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
          isTradable: true,
        },
      });

      const { UNSAFE_getAllByType } = render(
        <LivePriceHeader currentPrice={0} symbol="ETH" />,
      );

      const textElements = UNSAFE_getAllByType(Text);
      const changeText = textElements.find((el) => el.props.children === '--%');
      expect(changeText).toBeDefined();
      expect(changeText?.props.color).toBe(TextColor.TextDefault);
    });

    it('uses neutral color for loading state when no live data exists', () => {
      mockUsePerpsLivePrices.mockReturnValue({});

      const { UNSAFE_getAllByType } = render(
        <LivePriceHeader symbol="ETH" currentPrice={0} />,
      );

      const textElements = UNSAFE_getAllByType(Text);
      const changeText = textElements.find((el) => el.props.children === '--%');
      expect(changeText).toBeDefined();
      expect(changeText?.props.color).toBe(TextColor.TextDefault);
    });

    it('uses success color for positive percentage change', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          symbol: 'ETH',
          price: '3000',
          percentChange24h: '5.5',
          timestamp: Date.now(),
          isTradable: true,
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
      expect(changeText?.props.color).toBe(TextColor.SuccessDefault);
    });

    it('uses error color for negative percentage change', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          symbol: 'ETH',
          price: '2500',
          percentChange24h: '-3.2',
          timestamp: Date.now(),
          isTradable: true,
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
      expect(changeText?.props.color).toBe(TextColor.ErrorDefault);
    });

    it('uses success color for zero percentage change', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          symbol: 'ETH',
          price: '2000',
          percentChange24h: '0',
          timestamp: Date.now(),
          isTradable: true,
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
      expect(changeText?.props.color).toBe(TextColor.SuccessDefault);
    });
  });

  describe('size variant', () => {
    beforeEach(() => {
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          symbol: 'ETH',
          price: '3000',
          percentChange24h: '5.5',
          timestamp: Date.now(),
          isTradable: true,
        },
      });
    });

    it('renders the compact (default) variant', () => {
      const { UNSAFE_getAllByType } = render(
        <LivePriceHeader symbol="ETH" currentPrice={3000} />,
      );

      const textElements = UNSAFE_getAllByType(Text);
      const priceText = textElements.find(
        (el) => el.props.children === '$3,000',
      );
      const changeText = textElements.find(
        (el) => el.props.children === '+5.50%',
      );

      expect(priceText?.props.variant).toBe(TextVariant.BodySm);
      expect(priceText?.props.color).toBe(TextColor.TextAlternative);
      expect(changeText?.props.variant).toBe(TextVariant.BodySm);
    });

    it('renders a prominent price for the large variant', () => {
      const { UNSAFE_getAllByType } = render(
        <LivePriceHeader symbol="ETH" currentPrice={3000} size="large" />,
      );

      const textElements = UNSAFE_getAllByType(Text);
      const priceText = textElements.find(
        (el) => el.props.children === '$3,000',
      );
      const changeText = textElements.find(
        (el) =>
          typeof el.props.children === 'string' &&
          el.props.children.includes('(+5.50%)'),
      );

      expect(priceText?.props.variant).toBe(TextVariant.DisplayLg);
      expect(priceText?.props.color).toBe(TextColor.TextDefault);
      expect(changeText?.props.variant).toBe(TextVariant.BodySm);
      expect(changeText?.props.fontWeight).toBe(FontWeight.Medium);
      expect(changeText?.props.color).toBe(TextColor.SuccessDefault);
    });

    it('shows the absolute change and percentage for the large variant', () => {
      const { UNSAFE_getAllByType } = render(
        <LivePriceHeader symbol="ETH" currentPrice={3000} size="large" />,
      );

      const changeText = UNSAFE_getAllByType(Text).find(
        (el) =>
          typeof el.props.children === 'string' &&
          el.props.children.includes('(+5.50%)'),
      );

      // 3000 - 3000 / 1.055 ≈ 156.4
      expect(changeText?.props.children).toBe('+$156.4 (+5.50%)');
    });

    it('shows only the percentage for the compact (default) variant', () => {
      const { UNSAFE_getAllByType } = render(
        <LivePriceHeader symbol="ETH" currentPrice={3000} />,
      );

      const changeText = UNSAFE_getAllByType(Text).find(
        (el) => el.props.children === '+5.50%',
      );

      expect(changeText).toBeDefined();
    });

    it('stacks the change below the price for the large variant', () => {
      const tree = render(
        <LivePriceHeader symbol="ETH" currentPrice={3000} size="large" />,
      ).toJSON();
      const containerStyle = StyleSheet.flatten(
        (tree as { props: { style?: StyleProp<ViewStyle> } } | null)?.props
          .style,
      );

      expect(containerStyle.flexDirection).toBe('column');
    });

    it('keeps the change inline with the price for the default variant', () => {
      const tree = render(
        <LivePriceHeader symbol="ETH" currentPrice={3000} />,
      ).toJSON();
      const containerStyle = StyleSheet.flatten(
        (tree as { props: { style?: StyleProp<ViewStyle> } } | null)?.props
          .style,
      );

      expect(containerStyle.flexDirection).toBe('row');
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
          isTradable: true,
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
          isTradable: true,
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
          isTradable: true,
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
          isTradable: true,
        },
      });

      const { getByText } = render(
        <LivePriceHeader symbol="ETH" currentPrice={3100} />,
      );

      expect(getByText('$3,100')).toBeTruthy();
      expect(getByText('--%')).toBeTruthy();
    });
  });

  describe('percentChange24h override prop', () => {
    it('uses the override value instead of the internal subscription', () => {
      // Even though the internal subscription would resolve to +5.50%, the
      // explicit override takes precedence.
      mockUsePerpsLivePrices.mockReturnValue({
        ETH: {
          symbol: 'ETH',
          price: '3000',
          percentChange24h: '5.5',
          timestamp: Date.now(),
          isTradable: true,
        },
      });

      const { getByText, queryByText } = render(
        <LivePriceHeader
          symbol="ETH"
          currentPrice={3000}
          percentChange24h={-1.25}
        />,
      );

      expect(getByText('-1.25%')).toBeTruthy();
      expect(queryByText('+5.50%')).toBeNull();
    });

    it('does not subscribe to the price stream when an override is provided', () => {
      render(
        <LivePriceHeader
          symbol="ETH"
          currentPrice={3000}
          percentChange24h={2}
        />,
      );

      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
        expect.objectContaining({ symbols: [] }),
      );
    });

    it('subscribes to the price stream as usual when no override is provided (backward compatible)', () => {
      mockUsePerpsLivePrices.mockReturnValue({});

      render(<LivePriceHeader symbol="ETH" currentPrice={3000} />);

      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
        expect.objectContaining({ symbols: ['ETH'] }),
      );
    });

    it('shows the loading placeholder when the override is explicitly null', () => {
      const { getByText } = render(
        <LivePriceHeader
          symbol="ETH"
          currentPrice={3000}
          percentChange24h={null}
        />,
      );

      expect(getByText('--%')).toBeTruthy();
    });

    it('formats a zero override as a legitimate value, not a loading state', () => {
      const { getByText, queryByText } = render(
        <LivePriceHeader
          symbol="ETH"
          currentPrice={3000}
          percentChange24h={0}
        />,
      );

      expect(getByText('+0.00%')).toBeTruthy();
      expect(queryByText('--%')).toBeNull();
    });
  });
});
