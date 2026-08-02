import { isHyperLiquidMultiSigRequiredError } from '@metamask/perps-controller/utils/errorUtils';

describe('isHyperLiquidMultiSigRequiredError', () => {
  it('detects ApiRequestError multi-sig required messages', () => {
    expect(
      isHyperLiquidMultiSigRequiredError(
        new Error('ApiRequestError: Multi-sig required'),
      ),
    ).toBe(true);
  });

  it('ignores unrelated connection errors', () => {
    expect(isHyperLiquidMultiSigRequiredError(new Error('Network error'))).toBe(
      false,
    );
  });
});
