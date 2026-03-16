import migrate, { migrationVersion } from './121';
import { captureException } from '@sentry/react-native';
import { StateNECWithNativeAssetIdentifiers } from './121_utils';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);
describe(`migration #${migrationVersion}`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('DOES NOT modify the controller + exception if NetworkEnablementController is missing', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          OtherRandomController: {},
        },
      },
    };

    const newStorage = migrate(
      oldStorage,
    ) as StateNECWithNativeAssetIdentifiers;

    expect(newStorage.engine.backgroundState).toStrictEqual({
      OtherRandomController: {},
    });
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${migrationVersion}: NetworkEnablementController not found.`,
      ),
    );
  });

  it('DOES NOT modify the controller + exception if NetworkEnablementController has changed type', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          NetworkEnablementController: [
            {
              foo: 'bar',
            },
          ],
        },
      },
    };

    const newStorage = migrate(
      oldStorage,
    ) as StateNECWithNativeAssetIdentifiers;

    expect(newStorage.engine.backgroundState).toStrictEqual({
      NetworkEnablementController: [
        {
          foo: 'bar',
        },
      ],
    });
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${migrationVersion}: NetworkEnablementController is not an object: object`,
      ),
    );
  });

  it('DOES NOT modify the controller + exception if NetworkEnablementController.nativeAssetIdentifiers is missing', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          NetworkEnablementController: {
            anotherFieldThatIsNotNativeAssetIdentifiers: {},
          },
        },
      },
    };

    const newStorage = migrate(
      oldStorage,
    ) as StateNECWithNativeAssetIdentifiers;

    expect(newStorage.engine.backgroundState).toStrictEqual({
      NetworkEnablementController: {
        anotherFieldThatIsNotNativeAssetIdentifiers: {},
      },
    });
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${migrationVersion}: NetworkEnablementController missing property nativeAssetIdentifiers.`,
      ),
    );
  });

  it('DOES NOT modify the controller + exception if NetworkEnablementController.nativeAssetIdentifiers has changed type', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          NetworkEnablementController: {
            // Not the correct type, should be an object.
            nativeAssetIdentifiers: [
              'eip155:1/slip44:60',
              'eip155:999/slip44:2457',
            ],
          },
        },
      },
    };

    const newStorage = migrate(
      oldStorage,
    ) as StateNECWithNativeAssetIdentifiers;

    expect(newStorage.engine.backgroundState).toStrictEqual({
      NetworkEnablementController: {
        nativeAssetIdentifiers: [
          'eip155:1/slip44:60',
          'eip155:999/slip44:2457',
        ],
      },
    });
    expect(mockedCaptureException).toHaveBeenCalledWith(
      new Error(
        `Migration ${migrationVersion}: NetworkEnablementController.nativeAssetIdentifiers is not an object: object.`,
      ),
    );
  });

  it('DOES NOT modify the controller if a HYPE entry with correct value already exists', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          NetworkEnablementController: {
            nativeAssetIdentifiers: {
              'eip155:1': 'eip155:1/slip44:60',
              'eip155:999': 'eip155:999/slip44:2457',
            },
          },
        },
      },
    };

    const newStorage = migrate(
      oldStorage,
    ) as StateNECWithNativeAssetIdentifiers;

    expect(newStorage.engine.backgroundState).toStrictEqual({
      NetworkEnablementController: {
        nativeAssetIdentifiers: {
          'eip155:1': 'eip155:1/slip44:60',
          'eip155:999': 'eip155:999/slip44:2457',
        },
      },
    });
  });

  it('DOES NOT modify the controller if no HYPE entry already exist', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          NetworkEnablementController: {
            nativeAssetIdentifiers: {
              'eip155:1': 'eip155:1/slip44:60',
            },
          },
        },
      },
    };

    const newStorage = migrate(
      oldStorage,
    ) as StateNECWithNativeAssetIdentifiers;

    expect(newStorage.engine.backgroundState).toStrictEqual({
      NetworkEnablementController: {
        nativeAssetIdentifiers: {
          'eip155:1': 'eip155:1/slip44:60',
        },
      },
    });
  });

  it('SUCCESSFULY transforms incorrect HYPE slip44 value to correct value', () => {
    const oldStorage = {
      engine: {
        backgroundState: {
          NetworkEnablementController: {
            nativeAssetIdentifiers: {
              'eip155:1': 'eip155:1/slip44:60',
              'eip155:999': 'eip155:999/slip44:1',
            },
          },
        },
      },
    };

    const newStorage = migrate(
      oldStorage,
    ) as StateNECWithNativeAssetIdentifiers;

    expect(newStorage.engine.backgroundState).toStrictEqual({
      NetworkEnablementController: {
        nativeAssetIdentifiers: {
          'eip155:1': 'eip155:1/slip44:60',
          'eip155:999': 'eip155:999/slip44:2457',
        },
      },
    });
  });
});
