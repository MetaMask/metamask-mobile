import React from 'react';
import NetworkVerificationInfo from './NetworkVerificationInfo';
import { render } from '@testing-library/react-native';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { strings } from '../../../../locales/i18n';

const mockNetworkInfo = {
  chainName: 'Test Chain',
  chainId: '1',
  rpcUrl: 'http://test.com',
  ticker: 'TEST',
  blockExplorerUrl: 'http://explorer.test.com',
  alerts: [
    {
      alertError: strings('add_custom_network.unrecognized_chain_name'),
      alertSeverity: BannerAlertSeverity.Warning,
      alertOrigin: 'chain_name',
    },
  ],
  icon: 'test-icon',
};

describe('NetworkVerificationInfo', () => {
  it('renders correctly', () => {
    const { toJSON } = render(
      <NetworkVerificationInfo customNetworkInformation={mockNetworkInfo} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
  it('renders one alert', () => {
    const { getByText } = render(
      <NetworkVerificationInfo customNetworkInformation={mockNetworkInfo} />,
    );
    expect(
      getByText(strings('add_custom_network.unrecognized_chain_name')),
    ).toBeDefined();
  });
});
