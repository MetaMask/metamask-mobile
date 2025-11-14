import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PredictActivity from './PredictActivity';
import { PredictActivityType, type PredictActivityItem } from '../../types';
import Routes from '../../../../../constants/navigation/Routes';

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

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const baseItem: PredictActivityItem = {
  id: '1',
  type: PredictActivityType.BUY,
  marketTitle: 'Will ETF be approved?',
  detail: '$123.45 on Yes • 34¢',
  amountUsd: 1234.5,
  percentChange: 1.5,
  icon: undefined,
  outcome: 'Yes',
  entry: {
    type: 'buy',
    timestamp: 0,
    marketId: 'market-1',
    outcomeId: 'outcome-1',
    outcomeTokenId: 0,
    amount: 1234.5,
    price: 0.34,
  },
};

const renderComponent = (overrides?: Partial<PredictActivityItem>) => {
  const item: PredictActivityItem = {
    ...baseItem,
    ...overrides,
    entry: {
      ...baseItem.entry,
      ...(overrides?.entry ?? {}),
    },
  };
  render(<PredictActivity item={item} />);
  return { item };
};

describe('PredictActivity', () => {
  it('renders BUY activity with title, market, amount and percent', () => {
    renderComponent();

    expect(screen.getByText('Buy')).toBeOnTheScreen();
    expect(screen.getByText(baseItem.marketTitle)).toBeOnTheScreen();
    expect(screen.getByText('-$1,234.50')).toBeOnTheScreen();
    expect(screen.getByText('2%')).toBeOnTheScreen();
  });

  it('renders SELL activity with plus-signed amount and negative percent', () => {
    renderComponent({
      type: PredictActivityType.SELL,
      percentChange: -3,
      entry: {
        type: 'sell',
        timestamp: 0,
        marketId: 'market-1',
        outcomeId: 'outcome-1',
        outcomeTokenId: 0,
        amount: 1234.5,
        price: 0.34,
      },
    });

    expect(screen.getByText('Sell')).toBeOnTheScreen();
    expect(screen.getByText('+$1,234.50')).toBeOnTheScreen();
    expect(screen.getByText('-3%')).toBeOnTheScreen();
  });

  it('renders CLAIM activity without detail', () => {
    renderComponent({
      type: PredictActivityType.CLAIM,
      entry: {
        type: 'claimWinnings',
        timestamp: 0,
        amount: 1234.5,
      },
    });

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
    const { item } = renderComponent({ icon: undefined });

    // Press a child inside the touchable to trigger parent onPress
    const pressTarget = screen.getByText('Icon:Activity');
    fireEvent.press(pressTarget);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.ACTIVITY_DETAIL,
      params: { activity: item },
    });
  });
});
