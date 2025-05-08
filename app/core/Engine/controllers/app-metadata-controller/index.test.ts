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

jest.mock('./utils', () => ({
  logAppMetadataControllerCreation: jest.fn(),
}));

const mockedLogAppMetadataControllerCreation = jest.mocked(
  logAppMetadataControllerCreation,
);

jest.mock('@metamask/app-metadata-controller');

describe('app metadata controller init', () => {
  const appMetadataControllerClassMock = jest.mocked(AppMetadataController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<AppMetadataControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  describe('logs are registered during controller creation', () => {
    it('logs creation with default state when no initial state provided', () => {
      appMetadataControllerInit(initRequestMock);
      expect(mockedLogAppMetadataControllerCreation).toHaveBeenCalledWith(
        defaultAppMetadataControllerState,
      );
    });

    it('logs creation with provided initial state', () => {
      // Set initial state
      const initialAppMetadataControllerState: AppMetadataControllerState = {
        currentAppVersion: '1.0.0',
        previousAppVersion: '0.9.0',
        previousMigrationVersion: 1,
        currentMigrationVersion: 2,
      };
      // Update mock with initial state
      initRequestMock.persistedState = {
        ...initRequestMock.persistedState,
        AppMetadataController: initialAppMetadataControllerState,
      };
      appMetadataControllerInit(initRequestMock);
      expect(mockedLogAppMetadataControllerCreation).toHaveBeenCalledWith(
        initialAppMetadataControllerState,
      );
    });
  });

  it('returns controller instance', () => {
    expect(
      appMetadataControllerInit(initRequestMock).controller,
    ).toBeInstanceOf(AppMetadataController);
  });

  it('controller state should be default state when no initial state is passed in', () => {
    appMetadataControllerInit(initRequestMock);
    const appMetadataControllerState =
      appMetadataControllerClassMock.mock.calls[0][0].state;
    expect(appMetadataControllerState).toEqual(
      defaultAppMetadataControllerState,
    );
  });

  it('controller state should be initial state when initial state is passed in', () => {
    // Create initial state
    const initialAppMetadataControllerState: AppMetadataControllerState = {
      currentAppVersion: '1.0.0',
      previousAppVersion: '0.9.0',
      previousMigrationVersion: 1,
      currentMigrationVersion: 2,
    };
    // Update mock with initial state
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      AppMetadataController: initialAppMetadataControllerState,
    };
    appMetadataControllerInit(initRequestMock);
    const appMetadataControllerState =
      appMetadataControllerClassMock.mock.calls[0][0].state;
    expect(appMetadataControllerState).toEqual(
      initialAppMetadataControllerState,
    );
  });
});
