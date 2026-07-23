import { CHAIN_IDS } from '@metamask/transaction-controller';

import AppConstants from '../../../AppConstants';
import { getGlobalChainId } from '../../../../util/networks/global-network';
import { isMainnetByChainId } from '../../../../util/networks';
import { getGasFeeControllerInstanceOptions } from './gas-fee-controller';

jest.mock('../../../../util/networks');
jest.mock('../../../../util/networks/global-network');

describe('getGasFeeControllerInstanceOptions', () => {
  const getGlobalChainIdMock = jest.mocked(getGlobalChainId);
  const isMainnetByChainIdMock = jest.mocked(isMainnetByChainId);

  beforeEach(() => {
    jest.resetAllMocks();
    getGlobalChainIdMock.mockReturnValue('0x1');
    isMainnetByChainIdMock.mockReturnValue(true);
  });

  it('sets the client ID and API endpoints', () => {
    const options = getGasFeeControllerInstanceOptions();

    expect(options.clientId).toBe(AppConstants.SWAPS.CLIENT_ID);
    expect(options.legacyAPIEndpoint).toBe(
      'https://gas.api.cx.metamask.io/networks/<chain_id>/gasPrices',
    );
    expect(options.EIP1559APIEndpoint).toBe(
      'https://gas.api.cx.metamask.io/networks/<chain_id>/suggestedGasFees',
    );
  });

  describe('getCurrentNetworkLegacyGasAPICompatibility', () => {
    it('returns true for mainnet', () => {
      getGlobalChainIdMock.mockReturnValue('0x1');
      isMainnetByChainIdMock.mockReturnValue(true);

      const options = getGasFeeControllerInstanceOptions();

      expect(options.getCurrentNetworkLegacyGasAPICompatibility?.()).toBe(true);
    });

    it('returns true for BSC', () => {
      getGlobalChainIdMock.mockReturnValue(CHAIN_IDS.BSC);
      isMainnetByChainIdMock.mockReturnValue(false);

      const options = getGasFeeControllerInstanceOptions();

      expect(options.getCurrentNetworkLegacyGasAPICompatibility?.()).toBe(true);
    });

    it('returns true for Polygon', () => {
      getGlobalChainIdMock.mockReturnValue(CHAIN_IDS.POLYGON);
      isMainnetByChainIdMock.mockReturnValue(false);

      const options = getGasFeeControllerInstanceOptions();

      expect(options.getCurrentNetworkLegacyGasAPICompatibility?.()).toBe(true);
    });

    it('returns false for other networks', () => {
      getGlobalChainIdMock.mockReturnValue('0x5');
      isMainnetByChainIdMock.mockReturnValue(false);

      const options = getGasFeeControllerInstanceOptions();

      expect(options.getCurrentNetworkLegacyGasAPICompatibility?.()).toBe(
        false,
      );
    });
  });
});
