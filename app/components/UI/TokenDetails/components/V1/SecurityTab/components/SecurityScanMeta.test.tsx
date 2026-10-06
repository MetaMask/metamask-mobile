import React from 'react';
import { render } from '@testing-library/react-native';
import { SecurityTabSelectors } from '../SecurityTab.testIds';
import SecurityScanMeta from './SecurityScanMeta';

describe('SecurityScanMeta', () => {
  it('names the provider', () => {
    const { getByTestId } = render(
      <SecurityScanMeta checkedMinutesAgo={null} />,
    );

    expect(getByTestId(SecurityTabSelectors.SCAN_META)).toHaveTextContent(
      /Blockaid/,
    );
  });

  it.each([
    [1, /checked 1 minute ago/],
    [12, /checked 12 minutes ago/],
  ])('reports a scan age of %i', (minutes, expected) => {
    const { getByTestId } = render(
      <SecurityScanMeta checkedMinutesAgo={minutes} />,
    );

    expect(getByTestId(SecurityTabSelectors.SCAN_META)).toHaveTextContent(
      expected,
    );
  });

  // The payload carries no scan timestamp today, so null is the expected
  // production value. Guessing at a time would overstate how fresh the checks
  // above are.
  it('omits the freshness clause when the scan age is unknown', () => {
    const { getByTestId } = render(
      <SecurityScanMeta checkedMinutesAgo={null} />,
    );

    expect(getByTestId(SecurityTabSelectors.SCAN_META)).not.toHaveTextContent(
      /checked/,
    );
  });
});
