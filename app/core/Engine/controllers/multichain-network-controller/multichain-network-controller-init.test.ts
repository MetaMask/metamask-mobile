import {
  MultichainNetworkController,
  MultichainNetworkControllerMessenger,
  MultichainNetworkControllerState,
  getDefaultMultichainNetworkControllerState,
} from '@metamask/multichain-network-controller';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { multichainNetworkControllerInit } from './multichain-network-controller-init';
import { BtcScope } from '@metamask/keyring-api';
import type { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';

jest.mock('@metamask/multichain-network-controller');

describe('multichain network controller init', () => {
  const multichainNetworkControllerClassMock = jest.mocked(
    MultichainNetworkController,
  );
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<MultichainNetworkControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    expect(
      multichainNetworkControllerInit(initRequestMock).controller,
    ).toBeInstanceOf(MultichainNetworkController);
  });

  it('controller state defaults to getDefaultMultichainNetworkControllerState when no initial state is passed in', () => {
    multichainNetworkControllerInit(initRequestMock);
    const multichainNetworkControllerState =
      multichainNetworkControllerClassMock.mock.calls[0][0].state;

    expect(multichainNetworkControllerState).toEqual(
      getDefaultMultichainNetworkControllerState(),
    );
  });

  it('controller state is initial state when initial state is passed in', () => {
    // Create initial state with the correct structure
    const initialMultichainNetworkState: MultichainNetworkControllerState = {
      multichainNetworkConfigurationsByChainId: {},
      selectedMultichainNetworkChainId: BtcScope.Mainnet,
      isEvmSelected: false,
    };

    // Update mock with initial state
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      MultichainNetworkController: initialMultichainNetworkState,
    };

    multichainNetworkControllerInit(initRequestMock);
    const multichainNetworkControllerState =
      multichainNetworkControllerClassMock.mock.calls[0][0].state;

    // Check that the initial state is used
    expect(multichainNetworkControllerState).toEqual(
      initialMultichainNetworkState,
    );
  });
});
