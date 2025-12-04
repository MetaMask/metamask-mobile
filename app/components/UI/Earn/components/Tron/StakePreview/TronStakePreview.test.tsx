import React from 'react';
import { render } from '@testing-library/react-native';
import TronStakePreview from './TronStakePreview';
import type { ComputeFeeResult } from '../../../utils/tron-staking-snap';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => {
    const tw = jest.fn(() => ({}));
    (tw as unknown as { style: jest.Mock }).style = jest.fn(() => ({}));
    return tw;
  }),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('TronStakePreview', () => {
  it('renders fee row when fee data is provided', () => {
    const fee: ComputeFeeResult = [
      {
        type: 'network',
        asset: {
          unit: 'TRX',
          type: 'native',
          amount: '1.23',
          fungible: true,
        },
      },
    ];

    const { getByText } = render(<TronStakePreview fee={fee} />);

    expect(getByText('earn.tron.fee')).toBeTruthy();
    expect(getByText('1.23 TRX')).toBeTruthy();
  });
});
