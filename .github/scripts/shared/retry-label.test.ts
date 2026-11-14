import { hasRetryLabel, labelsPath, RETRY_LABEL } from './retry-label.mts';

describe('labelsPath', () => {
  it('requests the largest label page size for the PR', () => {
    const path = labelsPath('repos/MetaMask/metamask-mobile', '38441');

    expect(path).toBe(
      'repos/MetaMask/metamask-mobile/issues/38441/labels?per_page=100',
    );
  });
});

describe('hasRetryLabel', () => {
  it('finds retry-ci on the second page after thirty other labels', () => {
    const firstPage = Array.from({ length: 30 }, (_, index) => `label-${index}`);
    const paginatedOutput = [...firstPage, RETRY_LABEL].join('\n');

    const result = hasRetryLabel(paginatedOutput);

    expect(result).toBe(true);
  });

  it('returns false when retry-ci is absent from every page', () => {
    const output = ['bug', 'needs-review', 'size/M'].join('\n');

    const result = hasRetryLabel(output);

    expect(result).toBe(false);
  });

  it('does not match a label that only contains retry-ci as a substring', () => {
    const output = ['no-retry-ci', 'retry-ci-old'].join('\n');

    const result = hasRetryLabel(output);

    expect(result).toBe(false);
  });

  it('returns false for an empty label list', () => {
    const result = hasRetryLabel('');

    expect(result).toBe(false);
  });
});
