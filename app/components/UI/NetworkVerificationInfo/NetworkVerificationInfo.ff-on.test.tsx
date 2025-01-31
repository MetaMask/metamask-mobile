/**
 * This separate test file was created to test the component with isMultichainVersion1Enabled=true.
 * Due to the way feature flags are imported and used, it's cleaner to mock them in a separate file.
 * When the feature flag is removed, these tests should be merged into the main NetworkVerificationInfo.test.tsx file.
 */
import React from 'react';
import NetworkVerificationInfo from './NetworkVerificationInfo';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { PopularList } from '../../../util/networks/customNetworks';
import { MISSMATCH_RPC_URL_TEST_ID } from './NetworkVerificationInfo.constants';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

// Mock feature flags
jest.mock('../../../util/networks/index.js', () => ({
  ...jest.requireActual('../../../util/networks/index.js'),
  isMultichainVersion1Enabled: true,
  isChainPermissionsFeatureEnabled: true,
}));

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

describe('NetworkVerificationInfo with Feature Flag ON', () => {
  // Setup and cleanup for PopularList mock
  const originalPopularList = [PopularList];

  beforeEach(() => {
    (useSelector as jest.Mock).mockClear();
  });

  afterEach(() => {
    // Restore original PopularList after each test
    PopularList.length = 0;
    PopularList.push(...originalPopularList[0]);
  });

  describe('RPC URL Mismatch Detection', () => {
    const createMockPopularNetwork = (rpcUrl: string) => ({
      chainId: '0xa' as `0x${string}`,
      rpcUrl,
      rpcPrefs: {
        imageSource: 'test-image',
        blockExplorerUrl: 'https://test-explorer.com',
        imageUrl: 'https://test-image.com',
      },
      nickname: 'Test Network',
      ticker: 'TEST',
      warning: false,
    });

    const createNetworkWithPageMeta = (url: string) => ({
      ...mockNetworkInfo,
      pageMeta: { url },
    });

    it('hides RPC mismatch UI for non-dapp requests', () => {
      const { queryByTestId } = renderWithProvider(
        <NetworkVerificationInfo
          customNetworkInformation={mockNetworkInfo}
          onReject={() => undefined}
          onConfirm={() => undefined}
          isCustomNetwork={false}
        />,
      );

      expect(queryByTestId(MISSMATCH_RPC_URL_TEST_ID)).toBeNull();
    });

    it('displays RPC mismatch UI when URLs differ', () => {
      const mockPopularNetwork = createMockPopularNetwork(
        'https://different.rpc.url',
      );
      PopularList.length = 0;
      PopularList.push(mockPopularNetwork);

      const networkInfoWithPageMeta = createNetworkWithPageMeta(
        'https://app.uniswap.org',
      );

      const { queryByTestId } = renderWithProvider(
        <NetworkVerificationInfo
          customNetworkInformation={networkInfoWithPageMeta}
          onReject={() => undefined}
          onConfirm={() => undefined}
          isCustomNetwork={false}
        />,
      );

      expect(queryByTestId(MISSMATCH_RPC_URL_TEST_ID)).toBeDefined();
    });

    it('hides RPC mismatch UI when URLs match', () => {
      const mockPopularNetwork = createMockPopularNetwork('http://test.com');
      PopularList.length = 0;
      PopularList.push(mockPopularNetwork);

      const networkInfoWithPageMeta = createNetworkWithPageMeta(
        'https://app.uniswap.org',
      );

      const { queryByTestId } = renderWithProvider(
        <NetworkVerificationInfo
          customNetworkInformation={networkInfoWithPageMeta}
          onReject={() => undefined}
          onConfirm={() => undefined}
          isCustomNetwork={false}
        />,
      );

      expect(queryByTestId(MISSMATCH_RPC_URL_TEST_ID)).toBeNull();
    });
  });
});
