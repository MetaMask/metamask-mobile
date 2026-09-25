import { RampsActivityService } from '@metamask/core-backend';
import Logger from '../../../../util/Logger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { rampsActivityServiceInit } from './ramps-activity-service-init';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('../../../../util/Logger');
jest.mock('@metamask/core-backend');

describe('rampsActivityServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrangeMocks = () => {
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    return buildMessengerClientInitRequestMock(baseControllerMessenger);
  };

  it('initializes RampsActivityService and calls init', () => {
    const mocks = arrangeMocks();
    const init = jest.fn().mockResolvedValue(undefined);
    jest.mocked(RampsActivityService).mockImplementation(
      () =>
        ({
          init,
        }) as unknown as RampsActivityService,
    );

    const result = rampsActivityServiceInit(mocks);

    expect(RampsActivityService).toHaveBeenCalledWith({
      messenger: mocks.controllerMessenger,
    });
    expect(init).toHaveBeenCalledTimes(1);
    expect(result.controller).toBeDefined();
  });

  it('logs initialization messages', () => {
    const mocks = arrangeMocks();
    jest.mocked(RampsActivityService).mockImplementation(
      () =>
        ({
          init: jest.fn().mockResolvedValue(undefined),
        }) as unknown as RampsActivityService,
    );

    rampsActivityServiceInit(mocks);

    expect(Logger.log).toHaveBeenCalledWith(
      'Initializing RampsActivityService',
    );
    expect(Logger.log).toHaveBeenCalledWith('RampsActivityService initialized');
  });

  it('logs initialization failures', async () => {
    const mocks = arrangeMocks();
    const error = new Error('subscribe failed');
    jest.mocked(RampsActivityService).mockImplementation(
      () =>
        ({
          init: jest.fn().mockRejectedValue(error),
        }) as unknown as RampsActivityService,
    );

    rampsActivityServiceInit(mocks);
    await Promise.resolve();

    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'RampsActivityService: failed to initialize',
    );
  });
});
