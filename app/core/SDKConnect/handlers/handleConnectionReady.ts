import { ApprovalController } from '@metamask/approval-controller';
import { MessageType, OriginatorInfo } from '@metamask/sdk-communication-layer';
import AppConstants from '../../../../app/core/AppConstants';
import Logger from '../../../util/Logger';
import { Connection } from '../Connection';
import DevLogger from '../utils/DevLogger';
import checkPermissions from './checkPermissions';
import handleSendMessage from './handleSendMessage';

import { providerErrors } from '@metamask/rpc-errors';
import Engine from '../../Engine';
import { approveHostProps } from '../SDKConnect';
import generateOTP from '../utils/generateOTP.util';
import { setupBridge } from './setupBridge';
import { HOUR_IN_MS } from '../SDKConnectConstants';

export const handleConnectionReady = async ({
  originatorInfo,
  engine,
  connection,
  approveHost,
  disapprove,
  onError,
  updateOriginatorInfos,
}: {
  originatorInfo: OriginatorInfo;
  engine: typeof Engine;
  connection: Connection;
  onError?: (error: unknown) => void;
  approveHost: ({ host, hostname }: approveHostProps) => void;
  disapprove: (channelId: string) => void;
  updateOriginatorInfos: (params: {
    channelId: string;
    originatorInfo: OriginatorInfo;
  }) => void;
}) => {
  const approvalController = (
    engine.context as { ApprovalController: ApprovalController }
  ).ApprovalController;

  // clients_ready may be sent multple time (from sdk <0.2.0).
  const apiVersion = originatorInfo?.apiVersion;
  connection.receivedClientsReady = true;

  // backward compatibility with older sdk -- always first request approval
  if (!apiVersion) {
    // clear previous pending approval
    if (approvalController.get(connection.channelId)) {
      approvalController.reject(
        connection.channelId,
        providerErrors.userRejectedRequest(),
      );
    }

    connection.approvalPromise = undefined;
  }

  DevLogger.log(
    `SDKConnect::CLIENTS_READY id=${connection.channelId} apiVersion=${apiVersion} origin=${connection.origin} trigger=${connection.trigger}`,
  );
  if (!originatorInfo) {
    return;
  }

  connection.originatorInfo = originatorInfo;
  updateOriginatorInfos({
    channelId: connection.channelId,
    originatorInfo,
  });
  DevLogger.log(
    `SDKConnect::CLIENTS_READY originatorInfo updated`,
    originatorInfo,
  );

  if (connection.isReady) {
    DevLogger.log(`SDKConnect::CLIENTS_READY already ready`);
    return;
  }

  try {
    // if (connection.protocolVersion < 2) {
    // TODO following logic blocks should be simplified (too many conditions)
    // Should be done in a separate PR to avoid breaking changes and separate SDKConnect / Connection logic in different files.
    if (
      connection.initialConnection &&
      connection.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE
    ) {
      // Ask for authorisation?
      // Always need to re-approve connection first.
      // await checkPermissions({
      //   connection,
      //   engine,
      //   lastAuthorized: connection.lastAuthorized,
      // });
      connection.sendAuthorized(true);
    } else if (
      !connection.initialConnection &&
      connection.origin === AppConstants.DEEPLINKS.ORIGIN_QR_CODE
    ) {
      const currentTime = Date.now();
      const OTPExpirationDuration =
        Number(process.env.OTP_EXPIRATION_DURATION_IN_MS) || HOUR_IN_MS;
      const channelWasActiveRecently =
        !!connection.lastAuthorized &&
        currentTime - connection.lastAuthorized < OTPExpirationDuration;
      if (channelWasActiveRecently) {
        connection.approvalPromise = undefined;
        // Prevent auto approval if metamask is killed and restarted
        disapprove(connection.channelId);
        // Always need to re-approve connection first.
        await checkPermissions({
          connection,
          engine,
          lastAuthorized: connection.lastAuthorized,
        });
        connection.sendAuthorized(true);
      } else {
        if (approvalController.get(connection.channelId)) {
          DevLogger.log(`SDKConnect::CLIENTS_READY reject previous approval`);
          // cleaning previous pending approval
          approvalController.reject(
            connection.channelId,
            providerErrors.userRejectedRequest(),
          );
        }
        connection.approvalPromise = undefined;
        if (!connection.otps) {
          connection.otps = generateOTP();
        }
        const msg = {
          type: MessageType.OTP,
          otpAnswer: connection.otps?.[0],
        };
        handleSendMessage({
          msg,
          connection,
        }).catch((err) => {
          Logger.log(err, `SDKConnect:: Connection failed to send otp`);
        });
        // Prevent auto approval if metamask is killed and restarted
        disapprove(connection.channelId);
        // Always need to re-approve connection first.
        await checkPermissions({
          connection,
          engine,
        });
        connection.sendAuthorized(true);
        connection.lastAuthorized = Date.now();
      }
    } else if (
      !connection.initialConnection &&
      (connection.origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK ||
        connection.trigger === 'deeplink')
    ) {
      // Deeplink channels are automatically approved on re-connection.
      const hostname =
        AppConstants.MM_SDK.SDK_REMOTE_ORIGIN + connection.channelId;
      approveHost({
        host: hostname,
        hostname,
        context: 'clients_ready',
      });
      connection.remote
        .sendMessage({ type: 'authorized' as MessageType })
        .catch((err: Error) => {
          Logger.log(err, `Connection failed to send 'authorized`);
        });
    } else if (
      connection.initialConnection &&
      connection.origin === AppConstants.DEEPLINKS.ORIGIN_DEEPLINK
    ) {
      // Should ask for confirmation to reconnect?
      await checkPermissions({ connection, engine });
      connection.sendAuthorized(true);
    }
    // }

    DevLogger.log(`SDKConnect::CLIENTS_READY setup bridge`);
    connection.backgroundBridge = setupBridge({
      originatorInfo,
      connection,
    });
    connection.isReady = true;
  } catch (error) {
    onError?.(error);
  }
};

export default handleConnectionReady;
