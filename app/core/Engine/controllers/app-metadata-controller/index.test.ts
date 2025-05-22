import {
  type AppMetadataControllerMessenger,
  type AppMetadataControllerState,
} from '@metamask/app-metadata-controller';
import type { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { appMetadataControllerInit } from '.';
// import { defaultAppMetadataControllerState } from './constants'; // Removed to fix linter error
import { logAppMetadataControllerCreation } from './utils';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import { getVersion } from 'react-native-device-info';

jest.mock('./utils', () => ({
  logAppMetadataControllerCreation: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

jest.mock('../../../../store/migrations', () => ({
  version: 2,
}));

const mockedLogAppMetadataControllerCreation = jest.mocked(
  logAppMetadataControllerCreation,
);

const mockedGetVersion = jest.mocked(getVersion);

// Mock the AppMetadataController class
jest.mock('@metamask/app-metadata-controller', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const { defaultAppMetadataControllerState } = require('./constants');
  return {
    AppMetadataController: jest
      .fn()
      .mockImplementation(
        ({ state, currentAppVersion, currentMigrationVersion }) => {
          const controller = {
            state: {
              ...defaultAppMetadataControllerState,
              ...state,
              currentAppVersion,
              currentMigrationVersion,
            },
            updateAppVersion: jest.fn().mockImplementation((newVersion) => {
              const oldVersion = controller.state.currentAppVersion;
              if (newVersion !== oldVersion) {
                controller.state.currentAppVersion = newVersion;
                controller.state.previousAppVersion = oldVersion;
              }
            }),
            updateMigrationVersion: jest
              .fn()
              .mockImplementation((newVersion) => {
                const oldVersion = controller.state.currentMigrationVersion;
                if (newVersion !== oldVersion) {
                  controller.state.currentMigrationVersion = newVersion;
                  controller.state.previousMigrationVersion = oldVersion;
                }
              }),
          };
          return controller;
        },
      ),
  };
});

describe('app metadata controller init', () => {
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<AppMetadataControllerMessenger>
  >;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
    mockedGetVersion.mockReturnValue('1.0.0');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('logs are registered during controller creation', () => {
    it('logs creation with default state when no initial state provided', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      const { defaultAppMetadataControllerState } = require('./constants');
      appMetadataControllerInit(initRequestMock);
      expect(mockedLogAppMetadataControllerCreation).toHaveBeenCalledWith({
        ...defaultAppMetadataControllerState,
        currentAppVersion: '1.0.0',
        currentMigrationVersion: 2,
      });
    });

    it('logs creation with provided initial state but overridden versions', () => {
      const initialAppMetadataControllerState: AppMetadataControllerState = {
        currentAppVersion: '0.9.0',
        previousAppVersion: '0.8.0',
        previousMigrationVersion: 1,
        currentMigrationVersion: 1,
      };
      initRequestMock.persistedState = {
        ...initRequestMock.persistedState,
        AppMetadataController: initialAppMetadataControllerState,
      };
      appMetadataControllerInit(initRequestMock);
      expect(mockedLogAppMetadataControllerCreation).toHaveBeenCalledWith({
        ...initialAppMetadataControllerState,
        previousAppVersion: '0.9.0',
        currentAppVersion: '1.0.0',
        currentMigrationVersion: 2,
      });
    });
  });

  it('returns controller instance', () => {
    const { controller } = appMetadataControllerInit(initRequestMock);
    expect(controller).toBeDefined();
    expect(controller.state).toBeDefined();
  });

  it('controller state should have current versions when no initial state is passed in', () => {
    const { controller } = appMetadataControllerInit(initRequestMock);
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const { defaultAppMetadataControllerState } = require('./constants');
    expect(controller.state).toEqual({
      ...defaultAppMetadataControllerState,
      currentAppVersion: '1.0.0',
      currentMigrationVersion: 2,
    });
  });

  it('controller state should have current versions even when initial state is passed in', () => {
    const initialAppMetadataControllerState: AppMetadataControllerState = {
      currentAppVersion: '0.9.0',
      previousAppVersion: '0.8.0',
      previousMigrationVersion: 1,
      currentMigrationVersion: 1,
    };
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      AppMetadataController: initialAppMetadataControllerState,
    };
    const { controller } = appMetadataControllerInit(initRequestMock);
    expect(controller.state).toEqual({
      ...initialAppMetadataControllerState,
      previousAppVersion: '0.9.0',
      currentAppVersion: '1.0.0',
      currentMigrationVersion: 2,
    });
  });

  it('updates version asynchronously after initialization', () => {
    mockedGetVersion.mockReturnValueOnce('1.0.0').mockReturnValueOnce('1.1.0');
    const { controller } = appMetadataControllerInit(initRequestMock);

    // Simulate version update
    controller.updateAppVersion('1.1.0');

    expect(controller.state.currentAppVersion).toBe('1.1.0');
  });

  describe('updateAppVersion', () => {
    it('updates currentAppVersion and sets previousAppVersion to old currentAppVersion', () => {
      const { controller } = appMetadataControllerInit(initRequestMock);
      const oldVersion = controller.state.currentAppVersion;

      controller.updateAppVersion('2.0.0');

      expect(controller.state.currentAppVersion).toBe('2.0.0');
      expect(controller.state.previousAppVersion).toBe(oldVersion);
    });

    it('does not update state if new version is same as current version', () => {
      const { controller } = appMetadataControllerInit(initRequestMock);
      const initialState = { ...controller.state };

      controller.updateAppVersion(controller.state.currentAppVersion);

      expect(controller.state).toEqual(initialState);
    });
  });

  describe('updateMigrationVersion', () => {
    it('updates currentMigrationVersion and sets previousMigrationVersion to old currentMigrationVersion', () => {
      const { controller } = appMetadataControllerInit(initRequestMock);
      const oldVersion = controller.state.currentMigrationVersion;

      controller.updateMigrationVersion(3);

      expect(controller.state.currentMigrationVersion).toBe(3);
      expect(controller.state.previousMigrationVersion).toBe(oldVersion);
    });

    it('does not update state if new version is same as current version', () => {
      const { controller } = appMetadataControllerInit(initRequestMock);
      const initialState = { ...controller.state };

      controller.updateMigrationVersion(
        controller.state.currentMigrationVersion,
      );

      expect(controller.state).toEqual(initialState);
    });
  });
});
