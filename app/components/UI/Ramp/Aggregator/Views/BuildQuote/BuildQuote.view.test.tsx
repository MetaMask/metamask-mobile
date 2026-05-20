import '../../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { RampType } from '../../types';
import {
  renderBuildQuoteView,
  renderBuildQuoteWithRoutes,
} from '../../../../../../../tests/component-view/renderers/ramps';
import {
  setupRampSdkApiMock,
  clearRampSdkApiMocks,
} from '../../../../../../../tests/component-view/api-mocking/ramp';
import { selectTokenSelectors } from '../../components/TokenSelectModal/SelectToken.testIds';

const ETH_MAINNET_ASSET_ID = 'eip155:1/slip44:.';

describe('Aggregator BuildQuote', () => {
  beforeEach(() => {
    setupRampSdkApiMock();
  });

  afterEach(() => {
    clearRampSdkApiMocks();
  });

  describe('sell mode', () => {
    /**
     * Corresponds to deeplink-to-sell-flow.failing.ts:
     * "metamask://sell?chainId=1&amount=50" → BuildQuote displays "50 ETH".
     * The OS deeplink launch stays E2E; this verifies the view consumes the
     * parsed intent amount through real RampSDKProvider state.
     */
    it('initializes sell amount from deeplink intent params', async () => {
      const { findByText } = renderBuildQuoteView({
        rampType: RampType.SELL,
        initialParams: { amount: '50', assetId: ETH_MAINNET_ASSET_ID },
      });

      expect(await findByText('50 ETH')).toBeOnTheScreen();
    });
  });

  describe('buy mode', () => {
    /**
     * Corresponds to deeplink-to-buy-flow.spec.ts:
     * "metamask://buy?chainId=1&amount=275" → BuildQuote displays "$275" USD.
     * Route parsing is covered by handleRampUrl tests; this verifies the
     * BuildQuote surface reacts to the parsed intent.
     */
    it('initializes buy amount from deeplink intent params', async () => {
      const { findByText } = renderBuildQuoteView({
        rampType: RampType.BUY,
        initialParams: { amount: '275', assetId: ETH_MAINNET_ASSET_ID },
      });

      expect(await findByText('$275')).toBeOnTheScreen();
      expect(await findByText('USD')).toBeOnTheScreen();
      expect(await findByText('Ethereum')).toBeOnTheScreen();
    });

    /**
     * Corresponds to onramp-parameters.spec.ts:
     * Apple Pay → PaymentSelectionModal → Debit or Credit.
     */
    it('changes the selected payment method from Apple Pay to Debit or Credit', async () => {
      const { findByText, queryByText } = renderBuildQuoteWithRoutes({
        rampType: RampType.BUY,
      });

      fireEvent.press(await findByText('Apple Pay'));
      fireEvent.press(await findByText('Debit or Credit'));

      await waitFor(() => {
        expect(queryByText('Apple Pay')).not.toBeOnTheScreen();
      });
      expect(await findByText('Debit or Credit')).toBeOnTheScreen();
    });

    /**
     * Corresponds to onramp-parameters.spec.ts:
     * Ethereum token selector → select DAI → BuildQuote displays Dai Stablecoin.
     */
    it('changes the selected token from Ethereum to Dai Stablecoin', async () => {
      const { findByText, findByTestId, queryByTestId } =
        renderBuildQuoteWithRoutes({
          rampType: RampType.BUY,
        });

      fireEvent.press(await findByText('Ethereum'));
      fireEvent.changeText(
        await findByTestId(
          selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT,
        ),
        'DAI',
      );
      fireEvent.press(await findByText('Dai Stablecoin'));

      await waitFor(() => {
        expect(
          queryByTestId(selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT),
        ).not.toBeOnTheScreen();
      });
      expect(await findByText('Dai Stablecoin')).toBeOnTheScreen();
    });
  });
});
