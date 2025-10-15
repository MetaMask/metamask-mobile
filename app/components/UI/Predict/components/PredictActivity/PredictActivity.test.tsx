import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PredictActivity, {
  type PredictActivityItem,
  PredictActivityType,
} from './PredictActivity';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'predict.transactions.buy_title': 'Buy',
      'predict.transactions.sell_title': 'Sell',
      'predict.transactions.claim_title': 'Claim',
    };
    return mockStrings[key] || key;
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (className: string) => ({ className }),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    Box: 'Box',
    Text: 'Text',
    TextVariant: {
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
    },
    BoxAlignItems: { Start: 'start' },
    BoxJustifyContent: { Between: 'between' },
    BoxFlexDirection: { Row: 'row' },
    IconName: { Activity: 'Activity' },
    Icon: ({ name }: { name: string }) =>
      ReactActual.createElement(RNText, null, `Icon:${name}`),
  };
});

jest.mock('expo-image', () => ({
  Image: ({ accessibilityLabel }: { accessibilityLabel?: string }) => {
    const ReactActual = jest.requireActual('react');
    const { Text: RNText } = jest.requireActual('react-native');
    return ReactActual.createElement(RNText, { accessibilityLabel }, 'image');
  },
}));

const baseItem: PredictActivityItem = {
  id: '1',
  type: PredictActivityType.BUY,
  marketTitle: 'Will ETF be approved?',
  detail: '$123.45 on Yes • 34¢',
  amountUsd: 1234.5,
  percentChange: 1.5,
  icon: undefined,
};

const renderComponent = (overrides?: Partial<PredictActivityItem>) => {
  const item: PredictActivityItem = {
    ...baseItem,
    ...overrides,
  } as PredictActivityItem;
  const onPress = jest.fn();
  render(<PredictActivity item={item} onPress={onPress} />);
  return { item, onPress };
};

describe('PredictActivity', () => {
  it('renders BUY activity with title, market, detail, amount and percent', () => {
    renderComponent();

    expect(screen.getByText('Buy')).toBeOnTheScreen();
    expect(screen.getByText(baseItem.marketTitle)).toBeOnTheScreen();
    expect(screen.getByText(baseItem.detail)).toBeOnTheScreen();
    expect(screen.getByText('-$1,234.50')).toBeOnTheScreen();
    expect(screen.getByText('+1.50%')).toBeOnTheScreen();
  });

  it('renders SELL activity with plus-signed amount and negative percent', () => {
    renderComponent({ type: PredictActivityType.SELL, percentChange: -3 });

    expect(screen.getByText('Sell')).toBeOnTheScreen();
    expect(screen.getByText('+$1,234.50')).toBeOnTheScreen();
    expect(screen.getByText('-3%')).toBeOnTheScreen();
  });

  it('renders CLAIM activity without detail', () => {
    renderComponent({ type: PredictActivityType.CLAIM });

    expect(screen.getByText('Claim')).toBeOnTheScreen();
    expect(screen.queryByText(baseItem.detail)).toBeNull();
  });

  it('shows provided icon image when item.icon exists', () => {
    renderComponent({ icon: 'https://example.com/icon.png' });

    expect(screen.getByLabelText('activity icon')).toBeOnTheScreen();
  });

  it('falls back to Activity icon when no item.icon provided', () => {
    renderComponent({ icon: undefined });

    expect(screen.getByText('Icon:Activity')).toBeOnTheScreen();
  });

  it('calls onPress with item when pressed', () => {
    const { item, onPress } = renderComponent();

    const pressable = screen.getByRole('button');
    fireEvent.press(pressable);

    expect(onPress).toHaveBeenCalledWith(item);
  });
});
