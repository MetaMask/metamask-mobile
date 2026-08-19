import '../../../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../../../core/Engine';
import { strings } from '../../../../../../../../locales/i18n';
import { formatPrice } from '../../../../../../UI/Predict/utils/format';
import { describeForPlatforms } from '../../../../../../../../tests/component-view/platform';
import {
  BTC_MARKET,
  renderHomepagePredictBtcRowView,
} from '../../../../../../../../tests/component-view/renderers/homepagePredictDiscovery';
import { BtcLiveRowTestIds } from './BtcLiveRow.testIds';

const predictController = Engine.context.PredictController;

const formatBtc = (value: number | undefined) =>
  value === undefined ? '\u2014' : formatPrice(value, { maximumDecimals: 0 });

beforeEach(() => {
  jest.clearAllMocks();
});

describeForPlatforms('BtcLiveRow', () => {
  it('loads the homepage BTC row data and forwards the active market on press', async () => {
    const onPress = jest.fn();
    const { findByText, getByTestId } = renderHomepagePredictBtcRowView({
      onPress,
    });

    expect(
      await findByText(
        strings('predict.homepage_discovery.btc_title', {
          price: formatBtc(93025),
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      await findByText(
        strings('predict.homepage_discovery.btc_price_to_beat', {
          price: formatBtc(93000),
        }),
      ),
    ).toBeOnTheScreen();

    await waitFor(() =>
      expect(predictController.subscribeToCryptoPrices).toHaveBeenCalledWith(
        ['btc/usd'],
        expect.any(Function),
        { twapWindowSeconds: undefined },
      ),
    );

    fireEvent.press(getByTestId(BtcLiveRowTestIds.Row));

    expect(onPress).toHaveBeenCalledWith(
      BTC_MARKET.id,
      expect.objectContaining({ id: BTC_MARKET.id }),
    );
  });

  it('unsubscribes the live price stream when the row becomes offscreen', async () => {
    const unsubscribe = jest.fn();
    predictController.subscribeToCryptoPrices.mockImplementation(
      () => unsubscribe,
    );

    const { findByText, rerenderBtcLiveRow } = renderHomepagePredictBtcRowView({
      isVisible: true,
    });

    await findByText(
      strings('predict.homepage_discovery.btc_title', {
        price: formatBtc(93025),
      }),
    );
    await waitFor(() =>
      expect(predictController.subscribeToCryptoPrices).toHaveBeenCalledTimes(
        1,
      ),
    );

    rerenderBtcLiveRow({ isVisible: false });

    await waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1));
    expect(predictController.getCryptoPriceHistory).toHaveBeenCalledTimes(1);
  });

  it('falls back to an empty BTC row contract when no live market resolves', async () => {
    predictController.getMarketSeries.mockResolvedValue([]);
    const onPress = jest.fn();
    const { findByText, getByTestId } = renderHomepagePredictBtcRowView({
      onPress,
    });

    expect(
      await findByText(
        strings('predict.homepage_discovery.btc_title', {
          price: formatBtc(undefined),
        }),
      ),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(BtcLiveRowTestIds.Row));

    expect(onPress).toHaveBeenCalledWith(undefined, undefined);
  });
});
