import Logger from '../../../../util/Logger';
import { logAppMetadataControllerCreation } from './utils';
import { defaultAppMetadataControllerState } from './constants';

jest.mock('../../../../util/Logger');

describe('logAppMetadataControllerCreation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs creation with default state when no initial state provided', () => {
    logAppMetadataControllerCreation();

    expect(Logger.log).toHaveBeenCalledWith(
      'Creating AppMetadataController with default state',
      {
        defaultState: defaultAppMetadataControllerState,
      },
    );
  });

  it('logs creation with empty initial state', () => {
    const initialState = {
      currentAppVersion: '',
      previousAppVersion: '',
      previousMigrationVersion: 0,
      currentMigrationVersion: 0,
    };

    logAppMetadataControllerCreation(initialState);

    expect(Logger.log).toHaveBeenCalledWith(
      'Creating AppMetadataController with provided initial state',
      {
        currentAppVersion: '',
        previousAppVersion: '',
        currentMigrationVersion: 0,
        previousMigrationVersion: 0,
      },
    );
  });

  it('logs creation with populated initial state', () => {
    const initialState = {
      currentAppVersion: '1.0.0',
      previousAppVersion: '0.9.0',
      previousMigrationVersion: 1,
      currentMigrationVersion: 2,
    };

    logAppMetadataControllerCreation(initialState);

    expect(Logger.log).toHaveBeenCalledWith(
      'Creating AppMetadataController with provided initial state',
      {
        currentAppVersion: '1.0.0',
        previousAppVersion: '0.9.0',
        currentMigrationVersion: 2,
        previousMigrationVersion: 1,
      },
    );
  });
});
