import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { markFirstPredictionOnUsOrderConfirmed } from '../../../../../reducers/rewards';
import { usePredictOrderPreview } from '../../../Predict/hooks/usePredictOrderPreview';
import { Recurrence, Side, type PredictMarket } from '../../../Predict/types';
import { useFirstPredictOnUsOrder } from '../../hooks/useFirstPredictOnUsOrder';
import FirstPredictOnUsOrderSheet, {
  type FirstPredictOnUsSelectedOrder,
} from './FirstPredictOnUsOrderSheet';

const mockSubmitOrder = jest.fn();
const mockDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn(() => ({ name: 'event' }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties.mockReturnValue({
    build: mockBuild,
  }),
  build: mockBuild,
}));

jest.mock('../../hooks/useFirstPredictOnUsOrder', () => ({
  useFirstPredictOnUsOrder: jest.fn(),
}));

jest.mock('../../../Predict/hooks/usePredictOrderPreview', () => ({
  usePredictOrderPreview: jest.fn(),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock(
  '../../../../../component-library/components-temp/Skeleton/Skeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    return function MockSkeleton(props: { testID?: string }) {
      return <View testID={props.testID ?? 'mock-skeleton'} />;
    };
  },
);

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

const mockGoBack = jest.fn();

interface OrderSheetRouteParams {
  confirmLabel: string;
  selectedOrder: FirstPredictOnUsSelectedOrder;
  tradeDescriptionTemplate: string;
  tradePlacedLabel: string;
  usdAmount: number;
}

const PREVIEW_TIMESTAMP_MS = 1_700_000_000_000;

const market: PredictMarket = {
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'market-1',
  title: 'France Stage of Elimination',
  description: 'France Stage of Elimination',
  image: 'https://example.com/market.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['world-cup'],
  outcomes: [],
  liquidity: 100,
  volume: 100,
};

const selectedOrder: FirstPredictOnUsSelectedOrder = {
  market,
  outcome: {
    id: 'condition-1',
    marketId: 'market-1',
    providerId: 'polymarket',
    title: 'Yes',
    description: 'Yes',
    image: '',
    status: 'open',
    tokens: [{ id: 'token-yes', title: 'Yes', price: 0.37 }],
    volume: 100,
    groupItemTitle: 'Yes',
  },
  outcomeToken: { id: 'token-yes', title: 'Yes', price: 0.37 },
};

const defaultRouteParams: OrderSheetRouteParams = {
  confirmLabel: 'Confirm',
  selectedOrder,
  tradeDescriptionTemplate: 'Bought {amount} of {outcome}',
  tradePlacedLabel: 'Trade placed',
  usdAmount: 5,
};

let mockRouteParams: OrderSheetRouteParams | undefined = defaultRouteParams;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

describe('FirstPredictOnUsOrderSheet', () => {
  const renderWithParams = (
    ...args: [] | [OrderSheetRouteParams | undefined]
  ) => {
    mockRouteParams = args.length === 0 ? defaultRouteParams : args[0];
    return render(<FirstPredictOnUsOrderSheet />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = defaultRouteParams;
    mockAddProperties.mockReturnValue({ build: mockBuild });
    jest.mocked(useAnalytics).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as never);
    jest.mocked(useFirstPredictOnUsOrder).mockReturnValue({
      error: null,
      isLoading: false,
      submitOrder: mockSubmitOrder,
    });
    jest.mocked(usePredictOrderPreview).mockReturnValue({
      preview: {
        marketId: 'market-1',
        outcomeId: 'condition-1',
        outcomeTokenId: 'token-yes',
        timestamp: PREVIEW_TIMESTAMP_MS,
        side: Side.BUY,
        sharePrice: 0.38,
        maxAmountSpent: 5,
        minAmountReceived: 11.82,
        slippage: 0.01,
        tickSize: 0.01,
        minOrderSize: 1,
        negRisk: false,
      },
      isCalculating: false,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    mockRouteParams = defaultRouteParams;
  });

  it('requests order preview for the fixed sponsored amount', () => {
    renderWithParams();

    expect(usePredictOrderPreview).toHaveBeenCalledWith({
      marketId: 'market-1',
      outcomeId: 'condition-1',
      outcomeTokenId: 'token-yes',
      side: Side.BUY,
      size: 5,
    });
  });

  it('renders fixed amount and existing Predict terms copy', () => {
    const { getByTestId, getByText } = renderWithParams();

    expect(getByTestId('first-predict-on-us-order-title')).toHaveTextContent(
      'France Stage of Elimination',
    );
    expect(getByText('$5')).toBeOnTheScreen();
    expect(getByTestId('first-predict-on-us-order-to-win')).toHaveTextContent(
      'To win $11.82',
    );
    expect(
      getByText(strings('predict.consent_sheet.disclaimer')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('predict.consent_sheet.learn_more')),
    ).toBeOnTheScreen();
  });

  it('shows a skeleton while the order preview is loading', () => {
    jest.mocked(usePredictOrderPreview).mockReturnValue({
      preview: null,
      isCalculating: true,
      isLoading: true,
      error: null,
    });

    const { getByTestId, queryByText } = renderWithParams();

    expect(getByTestId('first-predict-on-us-order-to-win')).toBeOnTheScreen();
    expect(getByTestId('mock-skeleton')).toBeOnTheScreen();
    expect(queryByText('To win $11.82')).toBeNull();
  });

  it('opens Polymarket terms when Learn more is pressed', () => {
    const { getByText } = renderWithParams();

    fireEvent.press(getByText(strings('predict.consent_sheet.learn_more')));

    expect(Linking.openURL).toHaveBeenCalledWith('https://polymarket.com/tos');
  });

  it('closes when the close icon is pressed', () => {
    const { getByTestId } = renderWithParams();

    fireEvent.press(getByTestId('first-predict-on-us-order-close'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders all outcome tokens and highlights the selected outcome', () => {
    const twoTokenOrder: FirstPredictOnUsSelectedOrder = {
      ...selectedOrder,
      outcome: {
        ...selectedOrder.outcome,
        tokens: [
          { id: 'token-yes', title: 'Spain', price: 0.37 },
          { id: 'token-no', title: 'England', price: 0.63 },
        ],
      },
      outcomeToken: { id: 'token-yes', title: 'Spain', price: 0.37 },
    };

    const { getByText, getByTestId } = renderWithParams({
      ...defaultRouteParams,
      selectedOrder: twoTokenOrder,
    });

    expect(getByText('Spain')).toBeOnTheScreen();
    expect(getByText('England')).toBeOnTheScreen();
    expect(
      getByTestId('first-predict-on-us-order-token-token-yes'),
    ).toHaveStyle({ backgroundColor: expect.any(String) });
    expect(
      getByTestId('first-predict-on-us-order-token-token-no'),
    ).toBeOnTheScreen();
  });

  it('tracks confirmed order, updates support state, and submits on confirm', async () => {
    mockSubmitOrder.mockResolvedValueOnce(undefined);
    const { getByTestId } = renderWithParams();

    await act(async () => {
      fireEvent.press(getByTestId('first-predict-on-us-order-confirm'));
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.FIRST_PREDICTION_ON_US_ORDER,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      market_id: 'market-1',
      outcome: 'Yes',
      status: 'confirmed',
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      markFirstPredictionOnUsOrderConfirmed({
        marketId: 'market-1',
        outcome: 'Yes',
      }),
    );

    await waitFor(() => {
      expect(mockSubmitOrder).toHaveBeenCalledWith({
        amountUsd: 5,
        market: selectedOrder.market,
        outcome: selectedOrder.outcome,
        outcomeToken: selectedOrder.outcomeToken,
        tradeDescriptionTemplate: 'Bought {amount} of {outcome}',
        tradePlacedLabel: 'Trade placed',
      });
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('renders nothing when route params are missing', () => {
    const { queryByTestId } = renderWithParams(undefined);

    expect(queryByTestId('first-predict-on-us-order-sheet')).toBeNull();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
