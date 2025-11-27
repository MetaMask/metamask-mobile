import React from 'react';
import NetworkVerificationInfo from './NetworkVerificationInfo';
import { render, fireEvent } from '@testing-library/react-native';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { PopularList } from '../../../util/networks/customNetworks';

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
        onReject={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders updated details when isNetworkRpcUpdate is true', () => {
    (useSelector as jest.Mock).mockReturnValue(true);

    const networkWithCustomRpcUrl = {
      ...PopularList[0],
      chainName: 'Test Chain',
      rpcUrl: 'https://custom-rpc-url.io',
      pageMeta: { url: 'http://metamask.github.io/test-dapp' },
      alerts: [],
    };

    const { toJSON, getByText } = render(
      <NetworkVerificationInfo
        // @ts-expect-error - The CustomNetworkInformation type is missing the pageMeta property
        customNetworkInformation={networkWithCustomRpcUrl}
        onReject={() => undefined}
        onConfirm={() => undefined}
        isNetworkRpcUpdate
      />,
    );

    expect(toJSON()).toMatchSnapshot();
    expect(
      getByText(
        strings(
          'switch_custom_network.update_network_and_give_dapp_permission_warning',
          {
            dapp_origin: 'metamask.github.io',
          },
        ),
      ),
    ).toBeDefined();
    expect(
      getByText(
        strings('networks.update_network', {
          network_name: networkWithCustomRpcUrl.chainName,
        }),
      ),
    ).toBeDefined();
  });

  it('renders one alert', () => {
    (useSelector as jest.Mock).mockReturnValue(true);
    const { getByText } = render(
      <NetworkVerificationInfo
        customNetworkInformation={mockNetworkInfo}
        onReject={() => undefined}
        onConfirm={() => undefined}
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
        onReject={() => undefined}
        onConfirm={() => undefined}
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
        onReject={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(() =>
      getByText(strings('add_custom_network.unrecognized_chain_name')),
    ).toThrow('Unable to find an element with text');
  });

  it('should render chainId as a decimal', () => {
    (useSelector as jest.Mock).mockReturnValue(true);
    const { getByText } = render(
      <NetworkVerificationInfo
        customNetworkInformation={mockNetworkInfo}
        onReject={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    // Accordion content is hidden by default, so we need to expand it
    const accordionButton = getByText(
      strings('spend_limit_edition.view_details'),
    );
    fireEvent.press(accordionButton);

    expect(getByText('10')).toBeTruthy();
  });

  it('should not render Network URL warning banner when the custom rpc url has all ascii characters', () => {
    (useSelector as jest.Mock).mockReturnValue(true);
    const { getByText } = render(
      <NetworkVerificationInfo
        customNetworkInformation={mockNetworkInfo}
        onReject={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(() =>
      getByText(
        "Attackers sometimes mimic sites by making small changes to the site address. Make sure you're interacting with the intended Network URL before you continue. Punycode version: https://xn--ifura-dig.io/gnosis",
      ),
    ).toThrow('Unable to find an element with text');
  });

  describe('when the custom rpc url has non-ascii characters', () => {
    it('should render Network URL warning banner and display punycode encoded version', () => {
      (useSelector as jest.Mock).mockReturnValue(true);
      const { getByText } = render(
        <NetworkVerificationInfo
          customNetworkInformation={{
            ...mockNetworkInfo,
            rpcUrl: 'https://iոfura.io/gnosis',
          }}
          onReject={() => undefined}
          onConfirm={() => undefined}
        />,
      );

      expect(
        getByText(
          "Attackers sometimes mimic sites by making small changes to the site address. Make sure you're interacting with the intended Network URL before you continue. Punycode version: https://xn--ifura-dig.io/gnosis",
        ),
      ).toBeTruthy();
    });
  });
});
