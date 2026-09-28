import { MOCK_LIMIT_OPEN_ORDER } from '../../api/limitOrders/getLimitOrders/mock';
import { getLimitOrderTokens } from './getLimitOrderTokens';

describe('getLimitOrderTokens', () => {
  it('resolves the source and destination BridgeTokens from the order assets', () => {
    const { sourceToken, destinationToken } = getLimitOrderTokens(
      MOCK_LIMIT_OPEN_ORDER,
    );

    expect(sourceToken.symbol).toBe(MOCK_LIMIT_OPEN_ORDER.src.asset.symbol);
    expect(destinationToken.symbol).toBe(
      MOCK_LIMIT_OPEN_ORDER.dest.asset.symbol,
    );
    expect(destinationToken.chainId).toBe('0x1');
  });
});
