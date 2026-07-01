import { getPreferencesControllerInitialState } from './preferences-controller';
import AppConstants from '../../../AppConstants';

describe('getPreferencesControllerInitialState', () => {
  it('seeds mobile defaults when there is no persisted state', () => {
    const state = getPreferencesControllerInitialState({});

    expect(state).toEqual({
      ipfsGateway: AppConstants.IPFS_DEFAULT_GATEWAY_URL,
      useTokenDetection: true,
      useNftDetection: true,
      displayNftMedia: true,
      securityAlertsEnabled: true,
      smartTransactionsOptInStatus: true,
      tokenSortConfig: {
        key: 'tokenFiatAmount',
        order: 'dsc',
        sortCallback: 'stringNumeric',
      },
    });
  });

  it('lets persisted state win over the defaults and adds no unexpected keys', () => {
    const state = getPreferencesControllerInitialState({
      PreferencesController: {
        ipfsGateway: 'https://custom.gateway/ipfs/',
        useTokenDetection: false,
        smartTransactionsOptInStatus: false,
        privacyMode: true,
      },
    });

    expect(state).toEqual({
      ipfsGateway: 'https://custom.gateway/ipfs/',
      useTokenDetection: false,
      smartTransactionsOptInStatus: false,
      privacyMode: true,
      useNftDetection: true,
      displayNftMedia: true,
      securityAlertsEnabled: true,
      tokenSortConfig: {
        key: 'tokenFiatAmount',
        order: 'dsc',
        sortCallback: 'stringNumeric',
      },
    });
  });

  it('defaults useTokenDetection to true only when not persisted', () => {
    expect(
      getPreferencesControllerInitialState({
        PreferencesController: { useTokenDetection: false },
      }).useTokenDetection,
    ).toBe(false);

    expect(
      getPreferencesControllerInitialState({ PreferencesController: {} })
        .useTokenDetection,
    ).toBe(true);
  });
});
