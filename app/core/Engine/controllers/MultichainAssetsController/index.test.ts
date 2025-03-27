import {
  MultichainAssetsController,
  MultichainAssetsControllerMessenger,
  MultichainAssetsControllerState,
} from '@metamask/assets-controllers';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { createMultichainAssetsController } from '.';

jest.mock('@metamask/assets-controllers');

describe('multichain assets controller', () => {
  const multichainAssetsControllerClassMock = jest.mocked(
    MultichainAssetsController,
  );

  let multichainAssetsControllerMessenger: MultichainAssetsControllerMessenger;

  beforeEach(() => {
    jest.resetAllMocks();
    const messenger = new ExtendedControllerMessenger();
    multichainAssetsControllerMessenger = messenger.getRestricted({
      name: 'MultichainAssetsController',
      allowedEvents: [
        'AccountsController:accountAdded',
        'AccountsController:accountAdded',
        'AccountsController:accountAssetListUpdated',
      ],
      allowedActions: ['AccountsController:listMultichainAccounts'],
    });
  });

  it('returns controller instance', () => {
    expect(
      createMultichainAssetsController({
        messenger: multichainAssetsControllerMessenger,
      }),
    ).toBeInstanceOf(MultichainAssetsController);
  });

  it('controller state should be default state when no initial state is passed in', () => {
    createMultichainAssetsController({
      messenger: multichainAssetsControllerMessenger,
    });
    const multichainAssetsControllerState =
      multichainAssetsControllerClassMock.mock.calls[0][0].state;
    expect(multichainAssetsControllerState).toEqual({
      accountsAssets: {},
      assetsMetadata: {},
    });
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

    createMultichainAssetsController({
      messenger: multichainAssetsControllerMessenger,
      initialState: initialMultichainAssetsControllerState,
    });

    const multichainAssetsControllerState =
      multichainAssetsControllerClassMock.mock.calls[0][0].state;
    expect(multichainAssetsControllerState).toEqual(
      initialMultichainAssetsControllerState,
    );
  });

  it('should throw and log error when controller creation fails', () => {
    const mockError = new Error('Test error');
    jest.spyOn(console, 'error').mockImplementation();
    multichainAssetsControllerClassMock.mockImplementation(() => {
      throw mockError;
    });

    expect(() =>
      createMultichainAssetsController({
        messenger: multichainAssetsControllerMessenger,
      }),
    ).toThrow(mockError);
  });
});
