import { selectTokenListLayoutV2Enabled } from '.';

describe('selectTokenListLayoutV2Enabled', () => {
  it('returns true when tokenListItemV2Abtest is true', () => {
    const result = selectTokenListLayoutV2Enabled.resultFunc({
      tokenListItemV2Abtest: true,
    });
    expect(result).toBe(true);
  });

  it('returns false when tokenListItemV2Abtest is false', () => {
    const result = selectTokenListLayoutV2Enabled.resultFunc({
      tokenListItemV2Abtest: false,
    });
    expect(result).toBe(false);
  });

  it('returns false when tokenListItemV2Abtest is undefined', () => {
    const result = selectTokenListLayoutV2Enabled.resultFunc({});
    expect(result).toBe(false);
  });
});
