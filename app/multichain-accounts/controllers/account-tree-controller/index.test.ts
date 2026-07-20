import { MessengerClientInitRequest } from '../../../core/Engine/types';
import { buildMessengerClientInitRequestMock } from '../../../core/Engine/utils/test-utils';
import { ExtendedMessenger } from '../../../core/ExtendedMessenger';
import {
  AccountTreeController,
  AccountTreeControllerMessenger,
} from '@metamask/account-tree-controller';
import { AccountTreeControllerInitMessenger } from '../../messengers/account-tree-controller-messenger';
import { accountTreeControllerInit } from './index';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/account-tree-controller');
jest.mock('../../../util/analytics/AnalyticsEventBuilder');

function getInitRequestMock(
  baseMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  }),
): jest.Mocked<
  MessengerClientInitRequest<
    AccountTreeControllerMessenger,
    AccountTreeControllerInitMessenger
  >
> {
  const mockInitMessenger = {
    call: jest.fn(),
  } as unknown as AccountTreeControllerInitMessenger;

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    initMessenger: mockInitMessenger,
    controllerMessenger:
      baseMessenger as unknown as AccountTreeControllerMessenger,
  };
}

describe('accountTreeControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        name: MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
        properties: { action: 'Backup Completed' },
      }),
    });
  });

  it('returns controller instance', () => {
    const { controller } = accountTreeControllerInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(AccountTreeController);
  });

  describe('onBackupAndSyncEvent', () => {
    it('calls AnalyticsController:trackEvent via initMessenger', () => {
      const requestMock = getInitRequestMock();

      accountTreeControllerInit(requestMock);

      const controllerMock = jest.mocked(AccountTreeController);
      const onBackupAndSyncEvent =
        controllerMock.mock.calls[0][0].config?.backupAndSync
          ?.onBackupAndSyncEvent;

      onBackupAndSyncEvent?.({
        action: 'Backup Completed',
      } as unknown as Parameters<NonNullable<typeof onBackupAndSyncEvent>>[0]);

      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
      );
      expect(requestMock.initMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        expect.objectContaining({
          name: MetaMetricsEvents.PROFILE_ACTIVITY_UPDATED.category,
          properties: { action: 'Backup Completed' },
        }),
      );
    });
  });
});
