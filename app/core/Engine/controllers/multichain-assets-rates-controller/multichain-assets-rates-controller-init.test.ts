import {
  MultichainAssetsRatesController,
  type MultichainAssetsRatesControllerMessenger,
  MultichainAssetsRatesControllerState,
} from '@metamask/assets-controllers';
import type { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { multichainAssetsRatesControllerInit } from './multichain-assets-rates-controller-init';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

jest.mock('@metamask/assets-controllers');

describe('multichain assets rates controller init', () => {
  const multichainAssetsRatesControllerClassMock = jest.mocked(
    MultichainAssetsRatesController,
  );
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<MultichainAssetsRatesControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    expect(
      multichainAssetsRatesControllerInit(initRequestMock).controller,
    ).toBeInstanceOf(MultichainAssetsRatesController);
  });

  it('controller state should be default state when no initial state is passed in', () => {
    multichainAssetsRatesControllerInit(initRequestMock);
    const multichainAssetsRatesControllerState =
      multichainAssetsRatesControllerClassMock.mock.calls[0][0].state;
    expect(multichainAssetsRatesControllerState).toBeUndefined();
  });

  it('controller state should be initial state when initial state is passed in', () => {
    const initialMultichainAssetsRatesControllerState: MultichainAssetsRatesControllerState =
      {
        conversionRates: {
          'erc20:1/erc20:0x456': {
            rate: '100',
            conversionTime: Date.now(),
            expirationTime: Date.now() + 3600000, // 1 hour from now
          },
        },
        historicalPrices: {},
      };

    // Update mock with initial state
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      MultichainAssetsRatesController:
        initialMultichainAssetsRatesControllerState,
    };

    multichainAssetsRatesControllerInit(initRequestMock);

    const multichainAssetsRatesControllerState =
      multichainAssetsRatesControllerClassMock.mock.calls[0][0].state;
    expect(multichainAssetsRatesControllerState).toEqual(
      initialMultichainAssetsRatesControllerState,
    );
  });

  it('should throw when controller creation fails', () => {
    const mockError = new Error('Test error');
    jest.spyOn(console, 'error').mockImplementation();
    multichainAssetsRatesControllerClassMock.mockImplementation(() => {
      throw mockError;
    });

    expect(() => multichainAssetsRatesControllerInit(initRequestMock)).toThrow(
      mockError,
    );
  });
});
