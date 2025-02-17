import {
  MultichainNetworkController,
  MultichainNetworkControllerMessenger,
  MultichainNetworkControllerState,
  getDefaultMultichainNetworkControllerState,
} from '@metamask/multichain-network-controller';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { createMultichainNetworkController } from '.';
import { BtcScope } from '@metamask/keyring-api';

jest.mock('@metamask/multichain-network-controller');

describe('multichain network controller', () => {
  const multichainNetworkControllerClassMock = jest.mocked(
    MultichainNetworkController,
  );

  let multichainNetworkControllerMessenger: MultichainNetworkControllerMessenger;

  beforeEach(() => {
    jest.resetAllMocks();
    const messenger = new ExtendedControllerMessenger();
    multichainNetworkControllerMessenger = messenger.getRestricted({
      name: 'MultichainNetworkController',
      allowedActions: [
        'NetworkController:setActiveNetwork',
        'NetworkController:getState',
      ],
      allowedEvents: ['AccountsController:selectedAccountChange'],
    });
  });

  it('returns controller instance', () => {
    expect(
      createMultichainNetworkController({
        messenger: multichainNetworkControllerMessenger,
      }),
    ).toBeInstanceOf(MultichainNetworkController);
  });

  it('it has default state when no initial state is passed in', () => {
    createMultichainNetworkController({
      messenger: multichainNetworkControllerMessenger,
    });
    const multichainNetworkControllerState =
      multichainNetworkControllerClassMock.mock.calls[0][0].state;

    expect(multichainNetworkControllerState).toEqual(
      getDefaultMultichainNetworkControllerState(),
    );
  });

  it('it has initial state when initial state is passed in', () => {
    const initialMultichainNetworkControllerState: MultichainNetworkControllerState =
      {
        multichainNetworkConfigurationsByChainId: {},
        selectedMultichainNetworkChainId: BtcScope.Mainnet,
        isEvmSelected: false,
      };

    createMultichainNetworkController({
      messenger: multichainNetworkControllerMessenger,
      initialState: initialMultichainNetworkControllerState,
    });

    const multichainNetworkControllerState =
      multichainNetworkControllerClassMock.mock.calls[0][0].state;
    expect(multichainNetworkControllerState).toEqual(
      initialMultichainNetworkControllerState,
    );
  });

  it('throws and logs an error when controller creation fails', () => {
    const mockError = new Error('Test error');
    jest.spyOn(console, 'error').mockImplementation();
    multichainNetworkControllerClassMock.mockImplementation(() => {
      throw mockError;
    });

    expect(() =>
      createMultichainNetworkController({
        messenger: multichainNetworkControllerMessenger,
      }),
    ).toThrow(mockError);
  });
});
