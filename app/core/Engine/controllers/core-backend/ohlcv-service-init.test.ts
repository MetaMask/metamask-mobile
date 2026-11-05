import { OHLCVService } from '@metamask/core-backend';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ohlcvServiceInit } from './ohlcv-service-init';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('../../../../util/Logger');
jest.mock('@metamask/core-backend');
jest.mock('../../../../util/trace');

describe('ohlcvServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes OHLCVService with the default ohlcv.v1 namespace', () => {
    // Arrange
    const mocks = buildMessengerClientInitRequestMock(
      new ExtendedMessenger<MockAnyNamespace>({
        namespace: MOCK_ANY_NAMESPACE,
      }),
    );

    // Act
    const result = ohlcvServiceInit(mocks);

    // Assert
    expect(OHLCVService).toHaveBeenCalledWith({
      messenger: mocks.controllerMessenger,
      traceFn: expect.any(Function),
    });
    expect(jest.mocked(OHLCVService).mock.calls[0][0]).not.toHaveProperty(
      'subscriptionNamespace',
    );
    expect(result.controller.init).toHaveBeenCalled();
  });
});
