import handleConnectionReady from './handleConnectionReady';

import { ApprovalController } from '@metamask/approval-controller';
import { OriginatorInfo } from '@metamask/sdk-communication-layer';
import AppConstants from '../../../../app/core/AppConstants';
import { Connection } from '../Connection';
import checkPermissions from './checkPermissions';

import Engine from '../../Engine';
import { HOUR_IN_MS } from '../SDKConnectConstants';
import { setupBridge } from './setupBridge';

jest.mock('@metamask/approval-controller');
jest.mock('@metamask/sdk-communication-layer');
jest.mock('../../../../app/core/AppConstants');
jest.mock('../../../util/Logger');
jest.mock('../Connection');
jest.mock('../utils/wait.util');
jest.mock('./setupBridge');
jest.mock('./checkPermissions');
jest.mock('./handleSendMessage');

// FIXME: re-create the test suite with v2 protocol
describe.skip('handleConnectionReady', () => {
  let originatorInfo = {} as OriginatorInfo;
  let engine = {} as unknown as typeof Engine;
  let connection = {} as unknown as Connection;
  const mockCheckPermissions = checkPermissions as jest.MockedFunction<
    typeof checkPermissions
  >;
  const mockSetupBridge = setupBridge as jest.MockedFunction<
    typeof setupBridge
  >;
  const approveHost = jest.fn();
  const disapprove = jest.fn();
  const onError = jest.fn();
  const updateOriginatorInfos = jest.fn();
  const mockSendAuthorized = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    originatorInfo = {
      apiVersion: '0.2.0',
      source: 'fakeExtensionId',
      url: 'fakeUrl',
      dappId: 'fakeUrl',
      icon: 'fakeIcon',
      color: 'fakeColor',
      title: 'asdfsdf',
      platform: 'fakePlatform',
    } as OriginatorInfo;

    engine = {
      context: {
        ApprovalController: {
          get: jest.fn(),
          reject: jest.fn(),
        } as unknown as ApprovalController,
      },
    } as unknown as typeof Engine;

    connection = {
      channelId: 'fakeChannelId',
      origin: 'fakeOrigin',
      trigger: 'fakeTrigger',
      receivedClientsReady: false,
      approvalPromise: Promise.resolve(),
      otps: undefined,
      sendAuthorized: mockSendAuthorized,
      remote: {
        sendMessage: jest.fn(),
      },
    } as unknown as Connection;

    mockCheckPermissions.mockResolvedValue(true);
  });

  describe('Handling specific originator info and versions', () => {
    it('should update receivedClientsReady flag', async () => {
      await handleConnectionReady({
        originatorInfo,
        engine,
        connection,
        approveHost,
        disapprove,
        onError,
        updateOriginatorInfos,
      });

      expect(connection.receivedClientsReady).toBe(true);
    });
    it('should handle missing apiVersion for backward compatibility', async () => {
      originatorInfo.apiVersion = undefined;

      await handleConnectionReady({
        originatorInfo,
        engine,
        connection,
        approveHost,
        disapprove,
        onError,
        updateOriginatorInfos,
      });

      expect(connection.approvalPromise).toBe(undefined);
    });

    it('should return early if originatorInfo is missing', async () => {
      originatorInfo = undefined as unknown as OriginatorInfo;

      await handleConnectionReady({
        originatorInfo,
        engine,
        connection,
        approveHost,
        disapprove,
        onError,
        updateOriginatorInfos,
      });

      expect(connection.originatorInfo).toBe(undefined);
    });
    it('should update originatorInfo', async () => {
      await handleConnectionReady({
        originatorInfo,
        engine,
        connection,
        approveHost,
        disapprove,
        onError,
        updateOriginatorInfos,
      });

      expect(connection.originatorInfo).toBe(originatorInfo);
    });
  });

  describe('Connection readiness handling', () => {
    beforeEach(() => {
      connection.isReady = true;
    });
    it('should return early if connection is already ready', async () => {
      await handleConnectionReady({
        originatorInfo,
        engine,
        connection,
        approveHost,
        disapprove,
        onError,
        updateOriginatorInfos,
      });

      expect(mockCheckPermissions).not.toHaveBeenCalled();
    });
    it('should handle initial QR code connection', async () => {
      await handleConnectionReady({
        originatorInfo,
        engine,
        connection,
        approveHost,
        disapprove,
        onError,
        updateOriginatorInfos,
      });

      expect(updateOriginatorInfos).toHaveBeenCalled();
    });
    it('should handle reconnection via QR code with recent activity', async () => {
      connection.lastAuthorized = Date.now() - HOUR_IN_MS;

      await handleConnectionReady({
        originatorInfo,
        engine,
        connection,
        approveHost,
        disapprove,
        onError,
        updateOriginatorInfos,
      });

      expect(updateOriginatorInfos).toHaveBeenCalled();
    });

    it('should handle reconnection via deeplink', async () => {
      connection.trigger = 'deeplink';

      await handleConnectionReady({
        originatorInfo,
        engine,
        connection,
        approveHost,
        disapprove,
        onError,
        updateOriginatorInfos,
      });

      expect(updateOriginatorInfos).toHaveBeenCalled();
    });
    it('should handle initial deeplink connection', async () => {
      connection.trigger = 'deeplink';

      await handleConnectionReady({
        originatorInfo,
        engine,
        connection,
        approveHost,
        disapprove,
        onError,
        updateOriginatorInfos,
      });

      expect(updateOriginatorInfos).toHaveBeenCalled();
    });
  });

  describe('Error handling during permission check and bridge setup', () => {
    beforeEach(() => {
      connection.initialConnection = true;
      connection.origin = AppConstants.DEEPLINKS.ORIGIN_QR_CODE;
      mockCheckPermissions.mockRejectedValue(new Error('fakeError'));
    });
    it('should catch errors and call onError callback', async () => {
      await handleConnectionReady({
        originatorInfo,
        engine,
        connection,
        approveHost,
        disapprove,
        onError,
        updateOriginatorInfos,
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Approval Controller interactions', () => {
    beforeEach(() => {
      connection.approvalPromise = undefined;
    });
    it('should reset approvalPromise to undefined', async () => {
      const mockApprovalController = engine.context
        .ApprovalController as jest.Mocked<ApprovalController>;

      mockApprovalController.get.mockReturnValueOnce('fakeApproval' as any);

      await handleConnectionReady({
        originatorInfo,
        engine,
        connection,
        approveHost,
        disapprove,
        onError,
        updateOriginatorInfos,
      });
      expect(connection.approvalPromise).toBe(undefined);
    });
  });

  describe('OTP handling for QR code origin', () => {
    beforeEach(() => {
      connection.approvalPromise = undefined;
    });

    describe('when channel was NOT ActiveRecently', () => {
      beforeEach(() => {
        connection.lastAuthorized = Date.now() - HOUR_IN_MS;
        connection.initialConnection = false;
        connection.origin = AppConstants.DEEPLINKS.ORIGIN_QR_CODE;
      });

      it('should generate and send OTP if needed', async () => {
        await handleConnectionReady({
          originatorInfo,
          engine,
          connection,
          approveHost,
          disapprove,
          onError,
          updateOriginatorInfos,
        });
        expect(connection.approvalPromise).toBe(undefined);
        expect(connection?.otps?.[0]).toBeDefined();
      });
    });
  });

  describe('Approval and bridge setup', () => {
    beforeEach(() => {
      connection.isReady = false;
      connection.approvalPromise = undefined;
      connection.trigger = 'reconnect';

      connection.initialConnection = true;
      connection.origin = AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;
      mockCheckPermissions.mockResolvedValue(true);
    });
    it('should setup the background bridge', async () => {
      mockSetupBridge.mockReturnValueOnce({
        backgroundBridge: 'fakeBackgroundBridge',
      } as any);

      await handleConnectionReady({
        originatorInfo,
        engine,
        connection,
        approveHost,
        disapprove,
        onError,
        updateOriginatorInfos,
      });

      expect(mockSetupBridge).toHaveBeenCalled();
      expect(connection.backgroundBridge).toBeDefined();
    });
    it('should mark connection as ready', async () => {
      await handleConnectionReady({
        originatorInfo,
        engine,
        connection,
        approveHost,
        disapprove,
        onError,
        updateOriginatorInfos,
      });

      expect(connection.isReady).toBe(true);
    });
  });
});
