import {
  MultichainBalancesController,
  MultichainBalancesControllerMessenger,
  MultichainBalancesControllerState,
} from '@metamask/assets-controllers';
import type { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { multichainBalancesControllerInit } from './multichain-balances-controller-init';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

jest.mock('@metamask/assets-controllers');

describe('multichain balances controller init', () => {
  const multichainBalancesControllerClassMock = jest.mocked(
    MultichainBalancesController,
  );
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<MultichainBalancesControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    expect(
      multichainBalancesControllerInit(initRequestMock).controller,
    ).toBeInstanceOf(MultichainBalancesController);
  });

  it('controller state is default state when no initial state is passed in', () => {
    multichainBalancesControllerInit(initRequestMock);
    const multichainBalancesControllerState =
      multichainBalancesControllerClassMock.mock.calls[0][0].state;

    // Check that the default state is used
    expect(multichainBalancesControllerState).toBeUndefined();
  });

  it('controller state is initial state when initial state is passed in', () => {
    // Create initial state with the correct structure
    const initialMultichainBalancesState: MultichainBalancesControllerState = {
      balances: {
        '0x1': {
          '0x2': {
            amount: '100',
            unit: 'wei',
          },
        },
      },
    };

    // Update mock with initial state
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      MultichainBalancesController: initialMultichainBalancesState,
    };

    multichainBalancesControllerInit(initRequestMock);
    const multichainBalancesControllerState =
      multichainBalancesControllerClassMock.mock.calls[0][0].state;

    // Check that the initial state is used
    expect(multichainBalancesControllerState).toEqual(
      initialMultichainBalancesState,
    );
  });
});
