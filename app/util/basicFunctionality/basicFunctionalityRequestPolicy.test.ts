import type { RootState } from '../../reducers';
import {
  isBasicFunctionalityRequestBlocked,
  readBasicFunctionalityGateState,
  requestMatchesSelectedRpc,
} from './basicFunctionalityRequestPolicy';

const SELECTED_INFURA_URL = 'https://mainnet.infura.io/v3/{infuraProjectId}';
const RESOLVED_INFURA_URL = 'https://mainnet.infura.io/v3/project-id';
const SELECTED_CUSTOM_RPC_URL = 'https://eth.llamarpc.com';

const BLOCKED_SERVICE_URLS = [
  'https://tokens.api.cx.metamask.io/v3/assets?assetIds=eip155:1/slip44:60',
  'https://token.api.cx.metamask.io/tokens/1',
  'https://price.api.cx.metamask.io/v2/chains/1/spot-prices',
  'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
  'https://phishing-detection.api.cx.metamask.io/v1/stalelist',
  'https://client-config.api.cx.metamask.io/v1/flags?client=mobile',
  'https://client-config.api.cx.metamask.io/v1/config/networks',
  'https://accounts.api.cx.metamask.io/v4/multiaccount/transactions',
];

describe('basic functionality request policy', () => {
  describe('when basic functionality is off', () => {
    it.each(BLOCKED_SERVICE_URLS)(
      'blocks %s while the selected RPC stays open',
      (url) => {
        const blocked = isBasicFunctionalityRequestBlocked(url, [
          SELECTED_INFURA_URL,
        ]);

        expect(blocked).toBe(true);
      },
    );

    it('allows the selected Infura URL used for eth_chainId, eth_blockNumber, eth_getBalance, and fee methods', () => {
      const blocked = isBasicFunctionalityRequestBlocked(RESOLVED_INFURA_URL, [
        SELECTED_INFURA_URL,
      ]);

      expect(blocked).toBe(false);
    });

    it('blocks an Infura host that is not the selected RPC', () => {
      const blocked = isBasicFunctionalityRequestBlocked(
        'https://linea-mainnet.infura.io/v3/project-id',
        [SELECTED_INFURA_URL],
      );

      expect(blocked).toBe(true);
    });

    it('blocks a host that is not the selected RPC', () => {
      const blocked = isBasicFunctionalityRequestBlocked(
        'https://api.etherscan.io/api',
        [SELECTED_INFURA_URL],
      );

      expect(blocked).toBe(true);
    });

    it('blocks a MetaMask service hidden inside the E2E proxy URL', () => {
      const proxiedPriceUrl =
        'http://127.0.0.1:8080/proxy?url=' +
        encodeURIComponent(
          'https://price.api.cx.metamask.io/v2/chains/1/spot-prices',
        );

      const blocked = isBasicFunctionalityRequestBlocked(proxiedPriceUrl, [
        SELECTED_INFURA_URL,
      ]);

      expect(blocked).toBe(true);
    });

    it('allows the local test harness', () => {
      const blocked = isBasicFunctionalityRequestBlocked(
        'http://127.0.0.1:8080/health-check',
        [SELECTED_INFURA_URL],
      );

      expect(blocked).toBe(false);
    });

    it('allows a selected custom RPC', () => {
      const blocked = isBasicFunctionalityRequestBlocked(
        SELECTED_CUSTOM_RPC_URL,
        [SELECTED_CUSTOM_RPC_URL],
      );

      expect(blocked).toBe(false);
    });

    it('reads the selected RPC from network state when basic functionality is off', () => {
      const state = {
        settings: { basicFunctionalityEnabled: false },
        engine: {
          backgroundState: {
            NetworkController: {
              selectedNetworkClientId: 'mainnet',
              networkConfigurationsByChainId: {
                '0x1': {
                  rpcEndpoints: [
                    {
                      networkClientId: 'mainnet',
                      url: SELECTED_INFURA_URL,
                    },
                    {
                      networkClientId: 'linea-mainnet',
                      url: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
                    },
                  ],
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const gateState = readBasicFunctionalityGateState(state);

      expect(gateState.enabled).toBe(false);
      expect(gateState.selectedRpcUrls).toEqual([SELECTED_INFURA_URL]);
      expect(
        requestMatchesSelectedRpc(
          RESOLVED_INFURA_URL,
          gateState.selectedRpcUrls,
        ),
      ).toBe(true);
    });
  });

  describe('when basic functionality is on', () => {
    it('treats a missing setting as enabled', () => {
      const gateState = readBasicFunctionalityGateState({
        settings: {},
        engine: { backgroundState: {} },
      } as unknown as RootState);

      expect(gateState.enabled).toBe(true);
    });
  });
});
