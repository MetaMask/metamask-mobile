import { GasFeeController } from '@metamask/gas-fee-controller';
import { swapsUtils } from '@metamask/swaps-controller';
import { NetworkController } from '@metamask/network-controller';

import { addHexPrefix } from '../../../../util/number/legacy';
import { isMainnetByChainId } from '../../../../util/networks';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import AppConstants from '../../../AppConstants';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import type { GasFeeControllerMessenger } from '../../messengers/gas-fee-controller-messenger/gas-fee-controller-messenger';
import { ControllerInitRequest } from '../../types';
import { GasFeeControllerInit } from './gas-fee-controller-init';

jest.mock('@metamask/gas-fee-controller');
jest.mock('../../../../util/networks');
jest.mock('../../../../util/number/legacy');

/**
 * Build a mock NetworkController.
 *
 * @param partialMock - A partial mock object for the NetworkController, merged
 * with the default mock.
 * @returns A mock NetworkController.
 */
function buildControllerMock(
  partialMock?: Partial<NetworkController>,
): NetworkController {
  const defaultControllerMocks = {
    getProviderAndBlockTracker: jest.fn().mockReturnValue({ provider: {} }),
    getEIP1559Compatibility: jest.fn().mockResolvedValue(true),
  };

  // @ts-expect-error Incomplete mock, just includes properties used by code-under-test.
  return {
    ...defaultControllerMocks,
    ...partialMock,
  };
}

function buildInitRequestMock(
  initRequestProperties: Record<string, unknown> = {},
): jest.Mocked<ControllerInitRequest<GasFeeControllerMessenger>> {
  const baseControllerMessenger = new ExtendedControllerMessenger();
  const requestMock = {
    ...buildControllerInitRequestMock(baseControllerMessenger),
    controllerMessenger:
      baseControllerMessenger as unknown as GasFeeControllerMessenger,
    getGlobalChainId: jest.fn().mockReturnValue('0x1'),
    ...initRequestProperties,
  };

  if (!initRequestProperties.getController) {
    requestMock.getController = jest
      .fn()
      .mockReturnValue(buildControllerMock());
  }

  return requestMock;
}

describe('GasFeeController Init', () => {
  const gasFeeControllerClassMock = jest.mocked(GasFeeController);
  const isMainnetByChainIdMock = jest.mocked(isMainnetByChainId);
  const addHexPrefixMock = jest.mocked(addHexPrefix);

  beforeEach(() => {
    jest.resetAllMocks();
    isMainnetByChainIdMock.mockReturnValue(true);
    addHexPrefixMock.mockImplementation((value) => `0x${value}`);
  });

  it('returns controller instance', () => {
    const requestMock = buildInitRequestMock();
    expect(GasFeeControllerInit(requestMock).controller).toBeInstanceOf(
      GasFeeController,
    );
  });

  it('throws error if requested controller is not found', () => {
    const requestMock = buildInitRequestMock({
      getController: () => {
        throw new Error('Controller not found');
      },
    });
    expect(() => GasFeeControllerInit(requestMock)).toThrow(
      'Controller not found',
    );
  });

  it('throws error if controller initialization fails', () => {
    gasFeeControllerClassMock.mockImplementationOnce(() => {
      throw new Error('Controller initialization failed');
    });
    const requestMock = buildInitRequestMock();

    expect(() => GasFeeControllerInit(requestMock)).toThrow(
      'Controller initialization failed',
    );
  });

  describe('GasFeeController constructor options', () => {
    it('correctly sets up getProvider option', () => {
      const MOCK_PROVIDER = { someProvider: true };
      const requestMock = buildInitRequestMock({
        getController: () =>
          buildControllerMock({
            getProviderAndBlockTracker: jest
              .fn()
              .mockReturnValue({ provider: MOCK_PROVIDER }),
          }),
      });

      GasFeeControllerInit(requestMock);

      const getProviderFn =
        gasFeeControllerClassMock.mock.calls[0][0].getProvider;
      expect(getProviderFn()).toEqual(MOCK_PROVIDER);
    });

    it('correctly sets up getCurrentNetworkEIP1559Compatibility option', async () => {
      const requestMock = buildInitRequestMock({
        getController: () =>
          buildControllerMock({
            getEIP1559Compatibility: jest.fn().mockResolvedValue(true),
          }),
      });

      GasFeeControllerInit(requestMock);

      const getCurrentNetworkEIP1559CompatibilityFn =
        gasFeeControllerClassMock.mock.calls[0][0]
          .getCurrentNetworkEIP1559Compatibility;
      expect(await getCurrentNetworkEIP1559CompatibilityFn()).toBe(true);
    });

    it('handles undefined EIP1559 compatibility', async () => {
      const requestMock = buildInitRequestMock({
        getController: () =>
          buildControllerMock({
            getEIP1559Compatibility: jest.fn().mockResolvedValue(undefined),
          }),
      });

      GasFeeControllerInit(requestMock);

      const getCurrentNetworkEIP1559CompatibilityFn =
        gasFeeControllerClassMock.mock.calls[0][0]
          .getCurrentNetworkEIP1559Compatibility;
      expect(await getCurrentNetworkEIP1559CompatibilityFn()).toBe(false);
    });

    describe('getCurrentNetworkLegacyGasAPICompatibility', () => {
      it('returns true for mainnet', () => {
        const requestMock = buildInitRequestMock({
          getGlobalChainId: jest.fn().mockReturnValue('0x1'),
        });
        isMainnetByChainIdMock.mockReturnValue(true);

        GasFeeControllerInit(requestMock);

        const getCurrentNetworkLegacyGasAPICompatibilityFn =
          gasFeeControllerClassMock.mock.calls[0][0]
            .getCurrentNetworkLegacyGasAPICompatibility;
        expect(getCurrentNetworkLegacyGasAPICompatibilityFn()).toBe(true);
      });

      it('returns true for BSC', () => {
        const requestMock = buildInitRequestMock({
          getGlobalChainId: jest
            .fn()
            .mockReturnValue(`0x${swapsUtils.BSC_CHAIN_ID}`),
        });
        isMainnetByChainIdMock.mockReturnValue(false);

        GasFeeControllerInit(requestMock);

        const getCurrentNetworkLegacyGasAPICompatibilityFn =
          gasFeeControllerClassMock.mock.calls[0][0]
            .getCurrentNetworkLegacyGasAPICompatibility;
        expect(getCurrentNetworkLegacyGasAPICompatibilityFn()).toBe(true);
      });

      it('returns true for Polygon', () => {
        const requestMock = buildInitRequestMock({
          getGlobalChainId: jest
            .fn()
            .mockReturnValue(`0x${swapsUtils.POLYGON_CHAIN_ID}`),
        });
        isMainnetByChainIdMock.mockReturnValue(false);

        GasFeeControllerInit(requestMock);

        const getCurrentNetworkLegacyGasAPICompatibilityFn =
          gasFeeControllerClassMock.mock.calls[0][0]
            .getCurrentNetworkLegacyGasAPICompatibility;
        expect(getCurrentNetworkLegacyGasAPICompatibilityFn()).toBe(true);
      });

      it('returns false for other networks', () => {
        const requestMock = buildInitRequestMock({
          getGlobalChainId: jest.fn().mockReturnValue('0x5'),
        });
        isMainnetByChainIdMock.mockReturnValue(false);

        GasFeeControllerInit(requestMock);

        const getCurrentNetworkLegacyGasAPICompatibilityFn =
          gasFeeControllerClassMock.mock.calls[0][0]
            .getCurrentNetworkLegacyGasAPICompatibility;
        expect(getCurrentNetworkLegacyGasAPICompatibilityFn()).toBe(false);
      });
    });

    it('sets correct API endpoints and client ID', () => {
      const requestMock = buildInitRequestMock();

      GasFeeControllerInit(requestMock);

      const constructorOptions = gasFeeControllerClassMock.mock.calls[0][0];
      expect(constructorOptions.clientId).toBe(AppConstants.SWAPS.CLIENT_ID);
      expect(constructorOptions.legacyAPIEndpoint).toBe(
        'https://gas.api.cx.metamask.io/networks/<chain_id>/gasPrices',
      );
      expect(constructorOptions.EIP1559APIEndpoint).toBe(
        'https://gas.api.cx.metamask.io/networks/<chain_id>/suggestedGasFees',
      );
    });
  });
});
