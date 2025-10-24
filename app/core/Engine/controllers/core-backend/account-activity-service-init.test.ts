import { AccountActivityService } from '@metamask/core-backend';
import Logger from '../../../../util/Logger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { accountActivityServiceInit } from './account-activity-service-init';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('../../../../util/Logger');
jest.mock('@metamask/core-backend');
jest.mock('../../../../util/trace');

describe('accountActivityServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrangeMocks = () => {
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const initRequestMock = buildControllerInitRequestMock(
      baseControllerMessenger,
    );

    return initRequestMock;
  };

  it('initializes AccountActivityService', () => {
    // Arrange
    const mocks = arrangeMocks();

    // Act
    const result = accountActivityServiceInit(mocks);

    // Assert
    expect(AccountActivityService).toHaveBeenCalledWith({
      messenger: mocks.controllerMessenger,
      traceFn: expect.any(Function),
    });
    expect(result.controller).toBeDefined();
  });

  it('logs initialization messages', () => {
    // Arrange
    const mocks = arrangeMocks();

    // Act
    accountActivityServiceInit(mocks);

    // Assert
    expect(Logger.log).toHaveBeenCalledWith(
      'Initializing AccountActivityService',
    );
    expect(Logger.log).toHaveBeenCalledWith(
      'AccountActivityService initialized',
    );
  });
});
