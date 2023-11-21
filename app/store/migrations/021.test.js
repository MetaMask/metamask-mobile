import migrate from './021';
import { IPFS_DEFAULT_GATEWAY_URL } from '../../../app/constants/network';
import initialBackgroundState from '../../util/test/initial-background-state.json';

describe('Migration #21', () => {
  it('should not change state if ipfs gateway in use is not outdated', () => {
    const currentState = {
      engine: {
        backgroundState: initialBackgroundState,
      },
    };

    const newState = migrate(currentState);

    expect(newState).toStrictEqual(currentState);
  });

  it('should change outdated ipfs gateway to default one', () => {
    const stateWithIpfsGateway = (ipfsGateway) => ({
      engine: {
        backgroundState: {
          ...initialBackgroundState,
          PreferencesController: {
            ...initialBackgroundState.PreferencesController,
            ipfsGateway,
          },
        },
      },
    });

    // State with outdated ipfs gateway
    const currentState = stateWithIpfsGateway('https://hardbin.com/ipfs/');

    // State with default ipfs gateway
    const newStateExpectation = stateWithIpfsGateway(IPFS_DEFAULT_GATEWAY_URL);

    const newState = migrate(currentState);
    expect(newState).toStrictEqual(newStateExpectation);
  });

  it('should return same state if state objects are undefined', () => {
    const stateWithoutPreferencesController = {
      engine: {
        backgroundState: {},
      },
    };

    const newState = migrate(stateWithoutPreferencesController);

    expect(newState).toStrictEqual(stateWithoutPreferencesController);
  });
});
