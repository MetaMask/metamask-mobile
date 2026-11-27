import { createMockToken } from '../../testUtils/fixtures';
import {
  getBridgeTokenSelectorRowKey,
  isBridgeTokenSelectorRowSelected,
} from './bridgeTokenSelectorRow';

/**
 * FlashList keys and selected-row matching are list-identity contracts, not
 * screen UI. CV cannot cover them: keys never appear in the view tree, and
 * view tests cannot mock FlashList to inspect keyExtractor.
 */
describe('getBridgeTokenSelectorRowKey', () => {
  const listedMusd = createMockToken({
    symbol: 'MUSD',
    address: '0xmoney',
    chainId: '0x89',
  });
  const moneyToken = createMockToken({
    ...listedMusd,
    isMoneyToken: true,
  });

  it('appends -money so Money and listed mUSD do not share a FlashList key', () => {
    const listedKey = getBridgeTokenSelectorRowKey(listedMusd, 1);
    const moneyKey = getBridgeTokenSelectorRowKey(moneyToken, 0);

    expect(listedKey).toBe('0x89-0xmoney');
    expect(moneyKey).toBe('0x89-0xmoney-money');
  });

  it('keys skeleton rows by index', () => {
    const result = getBridgeTokenSelectorRowKey(null, 3);

    expect(result).toBe('skeleton-3');
  });
});

describe('isBridgeTokenSelectorRowSelected', () => {
  const listedMusd = createMockToken({
    symbol: 'MUSD',
    address: '0xmoney',
    chainId: '0x89',
  });
  const moneyToken = createMockToken({
    ...listedMusd,
    isMoneyToken: true,
  });

  it('returns true when the selected token is the Money row', () => {
    const result = isBridgeTokenSelectorRowSelected(moneyToken, moneyToken);

    expect(result).toBe(true);
  });

  it('returns false for listed mUSD when Money is selected', () => {
    const result = isBridgeTokenSelectorRowSelected(moneyToken, listedMusd);

    expect(result).toBe(false);
  });

  it('returns false for Money when listed mUSD is selected', () => {
    const result = isBridgeTokenSelectorRowSelected(listedMusd, moneyToken);

    expect(result).toBe(false);
  });
});
