import { NetworkController, Provider } from '@metamask/network-controller';
import Engine from '../../core/Engine';
import {
  getGlobalChainId,
  getGlobalEthQuery,
  getGlobalNetworkClientId,
} from './global-network';
import { Hex } from '@metamask/utils';
import EthQuery from '@metamask/eth-query';

jest.mock('../../core/Engine');
jest.mock('@metamask/eth-query');

const NETWORK_CLIENT_ID_MOCK = 'testNetworkClientId';
const NETWORK_CLIENT_ID_MOCK_2 = 'testNetworkClientId2';
const CHAIN_ID_MOCK = '0x123';
const CHAIN_ID_MOCK_2 = '0x456';
const PROVIDER_MOCK = {} as Provider;
const PROVIDER_MOCK_2 = {} as Provider;

function createNetworkClientMock({
  chainId,
  provider,
}: { chainId?: Hex; provider?: Provider } = {}) {
  return {
    configuration: { chainId },
    provider,
  } as ReturnType<NetworkController['getNetworkClientById']>;
}

function createNetworkControllerMock({
  chainId,
  provider,
  selectedNetworkClientId,
}: {
  chainId?: Hex;
  provider?: Provider;
  selectedNetworkClientId?: string;
} = {}) {
  return {
    getNetworkClientById: jest.fn(() =>
      createNetworkClientMock({ chainId, provider }),
    ),
    getSelectedNetworkClient: jest.fn(() =>
      createNetworkClientMock({ chainId, provider }),
    ),
    state: { selectedNetworkClientId },
  } as unknown as NetworkController;
}

describe('Global Network Utils', () => {
  const engineMock = jest.mocked(Engine);
  const ethQueryClassMock = jest.mocked(EthQuery);

  beforeEach(() => {
    jest.resetAllMocks();

    engineMock.context = {
      // @ts-expect-error - Test Data
      NetworkController: createNetworkControllerMock({
        chainId: CHAIN_ID_MOCK,
        provider: PROVIDER_MOCK,
        selectedNetworkClientId: NETWORK_CLIENT_ID_MOCK,
      }),
    };
  });

  describe('getGlobalNetworkClientId', () => {
    it('returns selected network client ID from engine instance', () => {
      expect(getGlobalNetworkClientId()).toBe(NETWORK_CLIENT_ID_MOCK);
    });

    it('returns selected network client ID from provided controller', () => {
      expect(
        getGlobalNetworkClientId(
          createNetworkControllerMock({
            selectedNetworkClientId: NETWORK_CLIENT_ID_MOCK_2,
          }),
        ),
      ).toBe(NETWORK_CLIENT_ID_MOCK_2);
    });
  });

  describe('getGlobalChainId', () => {
    it('returns chain ID from engine instance', () => {
      expect(getGlobalChainId()).toBe(CHAIN_ID_MOCK);
    });

    it('returns chain ID from provided controller', () => {
      expect(
        getGlobalChainId(
          createNetworkControllerMock({ chainId: CHAIN_ID_MOCK_2 }),
        ),
      ).toBe(CHAIN_ID_MOCK_2);
    });
  });

  describe('getGlobalEthQuery', () => {
    it('returns EthQuery instance with provider from engine instance', () => {
      expect(getGlobalEthQuery()).toBeInstanceOf(EthQuery);
      expect(ethQueryClassMock).toHaveBeenCalledWith(PROVIDER_MOCK);
    });

    it('returns EthQuery instance with provider from provided controller', () => {
      expect(
        getGlobalEthQuery(
          createNetworkControllerMock({ provider: PROVIDER_MOCK_2 }),
        ),
      ).toBeInstanceOf(EthQuery);
      expect(ethQueryClassMock).toHaveBeenCalledWith(PROVIDER_MOCK_2);
    });

    it('throws error if no provider is found', () => {
      engineMock.context.NetworkController.getSelectedNetworkClient.mockReturnValueOnce(
        undefined,
      );

      expect(() => getGlobalEthQuery()).toThrowError(
        'No selected network client',
      );
    });
  });
});
