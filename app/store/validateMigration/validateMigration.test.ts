import { validatePostMigrationState } from './validateMigration';
import { RootState } from '../../reducers';
import Logger from '../../util/Logger';
import { validateAccountsController } from './accountsController';
import { validateKeyringController } from './keyringController';
import { validateEngineInitialized } from './engineBackgroundState';

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
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

  it('logs when validation starts', () => {
    const mockState = {} as RootState;
    validatePostMigrationState(mockState);

    expect(Logger.log).toHaveBeenCalledWith('Migration validation started');
    expect(Logger.log).toHaveBeenCalledTimes(1);
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

  it('does not throw when validation checks fail', () => {
    const mockState = {} as RootState;
    // Mock all validation checks to return errors
    const mockErrors = ['Error 1', 'Error 2', 'Error 3'];
    (validateEngineInitialized as jest.Mock).mockReturnValue([mockErrors[0]]);
    (validateAccountsController as jest.Mock).mockReturnValue([mockErrors[1]]);
    (validateKeyringController as jest.Mock).mockReturnValue([mockErrors[2]]);

    // Verify that calling validatePostMigrationState does not throw
    expect(() => validatePostMigrationState(mockState)).not.toThrow();

    // Verify that errors were logged but execution continued
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        message: expect.stringContaining(mockErrors.join(', ')),
      }),
    );
  });
});
