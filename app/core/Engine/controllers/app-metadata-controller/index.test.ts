import { appMetadataControllerInit } from './index';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.44.0'),
}));

describe('AppMetadataController', () => {
  let mockInitRequest: ReturnType<typeof buildControllerInitRequestMock>;

  beforeEach(() => {
    const baseControllerMessenger = new ExtendedMessenger<
      MockAnyNamespace,
      never,
      never
    >({
      namespace: MOCK_ANY_NAMESPACE,
    });
    mockInitRequest = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('initializes with default state', async () => {
    const { controller } = appMetadataControllerInit(mockInitRequest);

    expect(controller.state).toEqual({
      currentAppVersion: expect.any(String),
      previousAppVersion: expect.any(String),
      previousMigrationVersion: expect.any(Number),
      currentMigrationVersion: expect.any(Number),
    });
  });

  it('updates state with persisted values', async () => {
    const persistedState = {
      currentAppVersion: '1.44.0',
      previousAppVersion: '',
      previousMigrationVersion: 0,
      currentMigrationVersion: 80,
    };

    const { controller } = appMetadataControllerInit({
      ...mockInitRequest,
      persistedState: { AppMetadataController: persistedState },
    });

    expect(controller.state).toEqual({
      currentAppVersion: '1.44.0',
      previousAppVersion: '',
      previousMigrationVersion: expect.any(Number),
      currentMigrationVersion: expect.any(Number),
    });
  });
});
