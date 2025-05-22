import {
  AppMetadataController,
  type AppMetadataControllerMessenger,
  type AppMetadataControllerState,
} from '@metamask/app-metadata-controller';
import type { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { appMetadataControllerInit } from '.';
import { defaultAppMetadataControllerState } from './constants';
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

jest.mock('@metamask/app-metadata-controller');

describe('app metadata controller init', () => {
  const appMetadataControllerClassMock = jest.mocked(AppMetadataController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<AppMetadataControllerMessenger>
  >;
  let mockController: { state: AppMetadataControllerState };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
    // Mock getVersion to return a test version
    mockedGetVersion.mockReturnValue('1.0.0');
    // Set up mock controller
    mockController = {
      state: {
        ...defaultAppMetadataControllerState,
        currentAppVersion: '1.0.0',
        currentMigrationVersion: 2,
      },
    };
    // Create a mock instance that extends AppMetadataController
    const mockInstance = Object.create(AppMetadataController.prototype);
    Object.assign(mockInstance, mockController);
    appMetadataControllerClassMock.mockImplementation(() => mockInstance);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('logs are registered during controller creation', () => {
    it('logs creation with default state when no initial state provided', () => {
      appMetadataControllerInit(initRequestMock);
      expect(mockedLogAppMetadataControllerCreation).toHaveBeenCalledWith({
        ...defaultAppMetadataControllerState,
        currentAppVersion: '1.0.0',
        currentMigrationVersion: 2,
      });
    });

    it('logs creation with provided initial state but overridden versions', () => {
      // Set initial state
      const initialAppMetadataControllerState: AppMetadataControllerState = {
        currentAppVersion: '0.9.0',
        previousAppVersion: '0.8.0',
        previousMigrationVersion: 1,
        currentMigrationVersion: 1,
      };
      // Update mock with initial state
      initRequestMock.persistedState = {
        ...initRequestMock.persistedState,
        AppMetadataController: initialAppMetadataControllerState,
      };
      appMetadataControllerInit(initRequestMock);
      expect(mockedLogAppMetadataControllerCreation).toHaveBeenCalledWith({
        ...initialAppMetadataControllerState,
        currentAppVersion: '1.0.0',
        currentMigrationVersion: 2,
      });
    });
  });

  it('returns controller instance', () => {
    expect(
      appMetadataControllerInit(initRequestMock).controller,
    ).toBeInstanceOf(AppMetadataController);
  });

  it('controller state should have current versions when no initial state is passed in', () => {
    appMetadataControllerInit(initRequestMock);
    const appMetadataControllerState =
      appMetadataControllerClassMock.mock.calls[0][0].state;
    expect(appMetadataControllerState).toEqual({
      ...defaultAppMetadataControllerState,
      currentAppVersion: '1.0.0',
      currentMigrationVersion: 2,
    });
  });

  it('controller state should have current versions even when initial state is passed in', () => {
    // Create initial state
    const initialAppMetadataControllerState: AppMetadataControllerState = {
      currentAppVersion: '0.9.0',
      previousAppVersion: '0.8.0',
      previousMigrationVersion: 1,
      currentMigrationVersion: 1,
    };
    // Update mock with initial state
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      AppMetadataController: initialAppMetadataControllerState,
    };
    appMetadataControllerInit(initRequestMock);
    const appMetadataControllerState =
      appMetadataControllerClassMock.mock.calls[0][0].state;
    expect(appMetadataControllerState).toEqual({
      ...initialAppMetadataControllerState,
      currentAppVersion: '1.0.0',
      currentMigrationVersion: 2,
    });
  });

  it('updates version asynchronously after initialization', () => {
    mockedGetVersion.mockReturnValueOnce('1.0.0').mockReturnValueOnce('1.1.0');
    const { controller } = appMetadataControllerInit(initRequestMock);

    // Run all pending timers
    jest.runAllTimers();

    expect(controller.state.currentAppVersion).toBe('1.1.0');
  });
});
