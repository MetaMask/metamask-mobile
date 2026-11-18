import { selectQuickBuyPostTradeShareHintEnabled } from './index';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('selectQuickBuyPostTradeShareHintEnabled', () => {
  it('returns true when the remote flag is enabled', () => {
    const result = selectQuickBuyPostTradeShareHintEnabled.resultFunc({
      quickBuyPostTradeShareHintEnabled: {
        enabled: true,
        minimumVersion: '0.0.0',
      },
    });

    expect(result).toBe(true);
  });

  it('returns false when the remote flag is disabled', () => {
    const result = selectQuickBuyPostTradeShareHintEnabled.resultFunc({
      quickBuyPostTradeShareHintEnabled: {
        enabled: false,
        minimumVersion: '0.0.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when the remote flag is missing', () => {
    expect(selectQuickBuyPostTradeShareHintEnabled.resultFunc({})).toBe(false);
  });
});
