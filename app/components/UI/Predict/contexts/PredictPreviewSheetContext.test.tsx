/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  PredictPreviewSheetProvider,
  usePredictPreviewSheet,
} from './PredictPreviewSheetContext';
import type {
  PredictBuyPreviewParams,
  PredictSellPreviewParams,
} from '../types/navigation';
import Routes from '../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: mockNavigate,
    addListener: jest.fn(() => jest.fn()),
  })),
  useRoute: jest.fn(() => ({
    params: {},
  })),
}));

let mockBottomSheetEnabled = true;
let mockPayWithAnyTokenEnabled = false;

const mockSelectPredictBottomSheetEnabledFlag = jest.fn();
const mockSelectPredictWithAnyTokenEnabledFlag = jest.fn();

jest.mock('../selectors/featureFlags', () => ({
  selectPredictBottomSheetEnabledFlag: (...args: unknown[]) =>
    mockSelectPredictBottomSheetEnabledFlag(...args),
  selectPredictWithAnyTokenEnabledFlag: (...args: unknown[]) =>
    mockSelectPredictWithAnyTokenEnabledFlag(...args),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((selector: (state: unknown) => unknown) => selector({})),
}));

jest.mock('../components/PredictPreviewSheet/PredictPreviewSheet', () => {
  const ReactMock = require('react');
  return {
    __esModule: true,
    default: ReactMock.forwardRef(
      (_props: { testID?: string }, _ref: unknown) => {
        const { View: RNView } = require('react-native');
        return <RNView testID={_props.testID ?? 'preview-sheet'} />;
      },
    ),
  };
});

jest.mock('../views/PredictBuyPreview/PredictBuyPreview', () => {
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: () => <RNView testID="buy-preview" />,
  };
});

jest.mock('../views/PredictBuyWithAnyToken/PredictBuyWithAnyToken', () => {
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: () => <RNView testID="buy-with-any-token" />,
  };
});

jest.mock('../views/PredictSellPreview/PredictSellPreview', () => {
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: () => <RNView testID="sell-preview" />,
  };
});

const buyParams: PredictBuyPreviewParams = {
  market: { id: 'market-1' } as PredictBuyPreviewParams['market'],
  outcome: {
    id: 'outcome-1',
    title: 'Yes',
    image: 'https://img.png',
  } as PredictBuyPreviewParams['outcome'],
  outcomeToken: {
    id: 'token-1',
    title: 'Yes',
    price: 51,
  } as PredictBuyPreviewParams['outcomeToken'],
};

const sellParams: PredictSellPreviewParams = {
  market: { id: 'market-1' } as PredictSellPreviewParams['market'],
  position: {
    id: 'pos-1',
    title: 'Position',
    icon: 'https://icon.png',
    outcome: 'Yes',
    price: 51,
  } as PredictSellPreviewParams['position'],
  outcome: { id: 'outcome-1' } as PredictSellPreviewParams['outcome'],
};

const TestConsumer: React.FC = () => {
  const { openBuySheet, openSellSheet } = usePredictPreviewSheet();

  return (
    <View>
      <TouchableOpacity
        testID="open-buy"
        onPress={() => openBuySheet(buyParams)}
      >
        <Text>Open Buy</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="open-sell"
        onPress={() => openSellSheet(sellParams)}
      >
        <Text>Open Sell</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('PredictPreviewSheetContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBottomSheetEnabled = true;
    mockPayWithAnyTokenEnabled = false;
    mockSelectPredictBottomSheetEnabledFlag.mockImplementation(
      () => mockBottomSheetEnabled,
    );
    mockSelectPredictWithAnyTokenEnabledFlag.mockImplementation(
      () => mockPayWithAnyTokenEnabled,
    );
  });

  it('provides openBuySheet and openSellSheet to consumers', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    expect(screen.getByTestId('open-buy')).toBeOnTheScreen();
    expect(screen.getByTestId('open-sell')).toBeOnTheScreen();
  });

  it('renders buy preview sheet when openBuySheet is called and flag is ON', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-buy'));

    expect(screen.getByTestId('predict-buy-preview-sheet')).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders sell preview sheet when openSellSheet is called and flag is ON', () => {
    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-sell'));

    expect(screen.getByTestId('predict-sell-preview-sheet')).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to BUY_PREVIEW route when flag is OFF', () => {
    mockBottomSheetEnabled = false;

    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-buy'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
      params: buyParams,
    });
    expect(screen.queryByTestId('predict-buy-preview-sheet')).toBeNull();
  });

  it('navigates to SELL_PREVIEW route when flag is OFF', () => {
    mockBottomSheetEnabled = false;

    render(
      <PredictPreviewSheetProvider>
        <TestConsumer />
      </PredictPreviewSheetProvider>,
    );

    fireEvent.press(screen.getByTestId('open-sell'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MODALS.SELL_PREVIEW,
      params: sellParams,
    });
    expect(screen.queryByTestId('predict-sell-preview-sheet')).toBeNull();
  });

  it('throws when usePredictPreviewSheet is used outside provider', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      // eslint-disable-next-line no-empty-function
      .mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      'usePredictPreviewSheet must be used within a PredictPreviewSheetProvider',
    );

    consoleError.mockRestore();
  });
});
