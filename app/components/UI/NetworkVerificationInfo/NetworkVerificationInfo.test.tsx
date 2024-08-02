import React from 'react';
import NetworkVerificationInfo from './NetworkVerificationInfo';
import { render } from '@testing-library/react-native';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';

const mockNetworkInfo = {
  chainName: 'Test Chain',
  chainId: '0xa',
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

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('NetworkVerificationInfo', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockClear();
  });
  it('renders correctly', () => {
    (useSelector as jest.Mock).mockReturnValue(true);
    const { toJSON } = render(
      <NetworkVerificationInfo
        customNetworkInformation={mockNetworkInfo}
        onReject={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
  it('renders one alert', () => {
    (useSelector as jest.Mock).mockReturnValue(true);
    const { getByText } = render(
      <NetworkVerificationInfo
        customNetworkInformation={mockNetworkInfo}
        onReject={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(
      getByText(strings('add_custom_network.unrecognized_chain_name')),
    ).toBeDefined();
  });

  it('should render the banner', () => {
    (useSelector as jest.Mock).mockReturnValue(false);
    const { getByText } = render(
      <NetworkVerificationInfo
        customNetworkInformation={mockNetworkInfo}
        onReject={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(
      getByText(strings('wallet.turn_on_network_check_cta')),
    ).toBeDefined();
  });

  it('should not render alert', () => {
    (useSelector as jest.Mock).mockReturnValue(false);
    const { getByText } = render(
      <NetworkVerificationInfo
        customNetworkInformation={mockNetworkInfo}
        onReject={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(() =>
      getByText(strings('add_custom_network.unrecognized_chain_name')),
    ).toThrow('Unable to find an element with text');
  });

  it('should render chainId on decimal', () => {
    (useSelector as jest.Mock).mockReturnValue(true);
    const { getByText } = render(
      <NetworkVerificationInfo
        customNetworkInformation={mockNetworkInfo}
        onReject={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(getByText('10')).toBeTruthy();
  });
});
