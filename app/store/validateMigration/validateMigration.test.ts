import { validatePostMigrationState } from './validateMigration';
import { RootState } from '../../reducers';
import Logger from '../../util/Logger';
import { validateAccountsController } from './accountsController';
import { validateKeyringController } from './keyringController';
import { validateEngineInitialized } from './engineBackgroundState';

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('./accountsController');
jest.mock('./keyringController');
jest.mock('./engineBackgroundState');

const TOTAL_VALIDATION_CHECKS = 3;

describe('validatePostMigrationState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateEngineInitialized as jest.Mock).mockReturnValue([]);
    (validateAccountsController as jest.Mock).mockReturnValue([]);
    (validateKeyringController as jest.Mock).mockReturnValue([]);
  });

  it('runs all validation checks', () => {
    const mockState = {} as RootState;
    validatePostMigrationState(mockState);

    expect(validateEngineInitialized).toHaveBeenCalledWith(mockState);
    expect(validateKeyringController).toHaveBeenCalledWith(mockState);
    expect(validateAccountsController).toHaveBeenCalledWith(mockState);

    const totalCalls =
      (validateAccountsController as jest.Mock).mock.calls.length +
      (validateKeyringController as jest.Mock).mock.calls.length +
      (validateEngineInitialized as jest.Mock).mock.calls.length;

    expect(totalCalls).toBe(TOTAL_VALIDATION_CHECKS);
  });

  it('logs errors when validation checks return errors', () => {
    const mockState = {} as RootState;
    const mockError = 'Mock validation error';

    // Mock one of the validation checks to return an error
    (validateAccountsController as jest.Mock).mockReturnValue([mockError]);

    validatePostMigrationState(mockState);

    // Verify error was logged
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        message: expect.stringContaining(mockError),
      }),
    );
  });

  it('does not log when no validation errors occur', () => {
    const mockState = {} as RootState;
    validatePostMigrationState(mockState);

    // Verify no errors were logged
    expect(Logger.error).not.toHaveBeenCalled();
  });
});
