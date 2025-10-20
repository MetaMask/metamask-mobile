import React from 'react';
import { render } from '@testing-library/react-native';
import { NetworkRow } from './NetworkRow';
import { strings } from '../../../../../locales/i18n';

describe('NetworkRow', () => {
  it('renders "No network fee" label when showNoNetworkFeeLabel is true', () => {
    const { getByText } = render(
      <NetworkRow
        chainId={'0x38'}
        chainName={'BNB Chain'}
        showNoNetworkFeeLabel
      />,
    );

    expect(getByText('BNB Chain')).toBeOnTheScreen();
    expect(getByText(strings('networks.no_network_fee'))).toBeOnTheScreen();
  });

  it('does not render "No network fee" label when showNoNetworkFeeLabel is false', () => {
    const { getByText, queryByText } = render(
      <NetworkRow
        chainId={'0xa4b1'}
        chainName={'Arbitrum'}
        showNoNetworkFeeLabel={false}
      />,
    );

    expect(getByText('Arbitrum')).toBeOnTheScreen();
    expect(queryByText(strings('networks.no_network_fee'))).toBeNull();
  });
});
