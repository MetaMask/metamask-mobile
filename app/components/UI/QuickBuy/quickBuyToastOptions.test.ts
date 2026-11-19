import {
  BannerBaseActionButtonLayout,
  ToastSeverity,
} from '@metamask/design-system-react-native';
import { buildQuickBuyToastOptions } from './quickBuyToastOptions';
import type { TrackedQuickBuyTrade } from './quickBuyTradeTracker';

const trade: TrackedQuickBuyTrade = {
  tradeMode: 'buy',
  tokenSymbol: 'ETH',
  counterTokenSymbol: 'USDC',
  fiatAmountLabel: '$50.00',
  rate: '1 ETH = 4,381.22 USDC',
};

describe('buildQuickBuyToastOptions', () => {
  it('places the action button at the trailing edge on the complete toast', () => {
    const onPress = jest.fn();

    const options = buildQuickBuyToastOptions('complete', {
      trade,
      linkButtonOptions: { label: 'Post to feed', onPress },
    });

    expect(options).toEqual(
      expect.objectContaining({
        severity: ToastSeverity.Success,
        actionButtonLabel: 'Post to feed',
        actionButtonOnPress: onPress,
        actionButtonLayout: BannerBaseActionButtonLayout.End,
      }),
    );
  });

  it('omits the action button and its layout when no action is given', () => {
    const options = buildQuickBuyToastOptions('complete', { trade });

    expect(options).not.toHaveProperty('actionButtonLabel');
    expect(options).not.toHaveProperty('actionButtonOnPress');
    expect(options).not.toHaveProperty('actionButtonLayout');
  });
});
