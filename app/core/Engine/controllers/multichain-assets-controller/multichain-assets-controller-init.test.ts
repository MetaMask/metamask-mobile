import {
  MultichainAssetsController,
  type MultichainAssetsControllerMessenger,
  MultichainAssetsControllerState,
} from '@metamask/assets-controllers';
import type { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { multichainAssetsControllerInit } from './multichain-assets-controller-init';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

jest.mock('@metamask/assets-controllers');

describe('multichain assets controller init', () => {
  const multichainAssetsControllerClassMock = jest.mocked(
    MultichainAssetsController,
  );
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<MultichainAssetsControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    expect(
      multichainAssetsControllerInit(initRequestMock).controller,
    ).toBeInstanceOf(MultichainAssetsController);
  });

  it('controller state should be default state when no initial state is passed in', () => {
    multichainAssetsControllerInit(initRequestMock);
    const multichainAssetsControllerState =
      multichainAssetsControllerClassMock.mock.calls[0][0].state;
    expect(multichainAssetsControllerState).toBeUndefined();
  });

  it('controller state should be initial state when initial state is passed in', () => {
    const initialMultichainAssetsControllerState: MultichainAssetsControllerState =
      {
        accountsAssets: {
          '0x1': ['erc20:1/erc20:0x456' as const],
        },
        assetsMetadata: {
          'erc20:1/erc20:0x456': {
            symbol: 'TEST',
            name: 'Test Token',
            fungible: true as const,
            iconUrl: 'https://example.com/icon.png',
            units: [
              {
                symbol: 'TEST',
                name: 'Test Token',
                decimals: 18,
              },
            ],
          },
        },
      };

    // Update mock with initial state
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      MultichainAssetsController: initialMultichainAssetsControllerState,
    };

    multichainAssetsControllerInit(initRequestMock);

    const multichainAssetsControllerState =
      multichainAssetsControllerClassMock.mock.calls[0][0].state;
    expect(multichainAssetsControllerState).toEqual(
      initialMultichainAssetsControllerState,
    );
  });

  it('should throw when controller creation fails', () => {
    const mockError = new Error('Test error');
    jest.spyOn(console, 'error').mockImplementation();
    multichainAssetsControllerClassMock.mockImplementation(() => {
      throw mockError;
    });

    expect(() => multichainAssetsControllerInit(initRequestMock)).toThrow(
      mockError,
    );
  });
});
