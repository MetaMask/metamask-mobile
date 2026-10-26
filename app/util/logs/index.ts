import type { StateConstraint, StateMetadata } from '@metamask/base-controller';
import { hasProperty, isObject, type Json } from '@metamask/utils';
import Engine from '../../core/Engine';
import {
  getApplicationName,
  getBuildNumber,
  getVersion,
} from 'react-native-device-info';
import Share from 'react-native-share'; // eslint-disable-line  import-x/default
import RNFS from 'react-native-fs';
import Logger from '../../util/Logger';
import { RootState } from '../../reducers';
import { analytics } from '../analytics/analytics';
import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
} from '../../core/Engine/controllers/remote-feature-flag-controller/utils';
import { OTA_VERSION, RUNTIME_VERSION } from '../../constants/ota';

const getSanitizedSeedlessOnboardingControllerState = () => {
  const { SeedlessOnboardingController } = Engine.context;
  const {
    userId,
    authConnection,
    isSeedlessOnboardingUserAuthenticated,
    passwordOutdatedCache,
    socialBackupsMetadata,
    nodeAuthTokens,

    vault,
    vaultEncryptionKey,
    vaultEncryptionSalt,
    encryptedSeedlessEncryptionKey,
    encryptedKeyringEncryptionKey,
    metadataAccessToken,
    accessToken,
    refreshToken,
    revokeToken,
    authPubKey,
    authConnectionId,
  } = SeedlessOnboardingController.state ?? {};

  return {
    userId,
    authConnection,
    authConnectionId,
    isSeedlessOnboardingUserAuthenticated,
    passwordOutdatedCache,
    authPubKey,

    socialBackupsMetadata: (socialBackupsMetadata ?? []).map((item) => {
      const { type, keyringId } = item ?? {};
      return {
        keyringId,
        type,
      };
    }),

    // return node index and nodePubKey only
    nodeAuthTokens: (nodeAuthTokens ?? []).map((item) => {
      const { nodeIndex, nodePubKey } = item ?? {};
      return {
        nodeIndex,
        nodePubKey,
      };
    }),

    // Return Boolean for state availablity of sensitive data
    vault: Boolean(vault),
    vaultEncryptionKey: Boolean(vaultEncryptionKey),
    vaultEncryptionSalt: Boolean(vaultEncryptionSalt),
    encryptedSeedlessEncryptionKey: Boolean(encryptedSeedlessEncryptionKey),
    encryptedKeyringEncryptionKey: Boolean(encryptedKeyringEncryptionKey),
    metadataAccessToken: Boolean(metadataAccessToken),
    accessToken: Boolean(accessToken),
    refreshToken: Boolean(refreshToken),
    revokeToken: Boolean(revokeToken),
  };
};

const hasStateMetadata = (
  controller: unknown,
): controller is { metadata: StateMetadata<StateConstraint> } =>
  isObject(controller) && isObject(controller.metadata);

/**
 * Applies each field's `includeInStateLogs` metadata to a controller state.
 * Fields without a metadata entry are kept, since some controllers still have
 * state keys with no metadata.
 *
 * @param controllerName - Controller name, used for error reporting.
 * @param controllerState - Controller state from the Redux background state.
 * @param metadata - The controller's state metadata.
 * @returns The controller state to include in state logs.
 */
const applyStateLogsMetadata = (
  controllerName: string,
  controllerState: Record<string, Json>,
  metadata: StateMetadata<StateConstraint>,
) =>
  Object.entries(controllerState).reduce<Record<string, Json>>(
    (sanitizedState, [key, value]) => {
      if (!hasProperty(metadata, key)) {
        sanitizedState[key] = value;
        return sanitizedState;
      }

      const includeInStateLogs = metadata[key]?.includeInStateLogs;
      try {
        if (typeof includeInStateLogs === 'function') {
          sanitizedState[key] = includeInStateLogs(value);
        } else if (includeInStateLogs) {
          sanitizedState[key] = value;
        }
      } catch (error) {
        Logger.error(
          error as Error,
          `State logs: failed to sanitize ${controllerName}.${key}`,
        );
      }
      return sanitizedState;
    },
    {},
  );

const applyStateLogsMetadataToBackgroundState = (
  backgroundState: Record<string, Json>,
) =>
  Object.fromEntries(
    Object.entries(backgroundState).map(([controllerName, controllerState]) => {
      const controller: unknown =
        Engine.context[controllerName as keyof typeof Engine.context];
      if (!hasStateMetadata(controller) || !isObject(controllerState)) {
        return [controllerName, controllerState];
      }

      return [
        controllerName,
        applyStateLogsMetadata(
          controllerName,
          controllerState as Record<string, Json>,
          controller.metadata,
        ),
      ];
    }),
  );

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any, import-x/prefer-default-export
export const generateStateLogs = (state: any, loggedIn = true): string => {
  const fullState = JSON.parse(JSON.stringify(state));

  delete fullState.engine.backgroundState.NftController;
  delete fullState.engine.backgroundState.TokensController;
  delete fullState.engine.backgroundState.AssetsController;
  delete fullState.engine.backgroundState.NftDetectionController;
  delete fullState.engine.backgroundState.PhishingController;
  delete fullState.engine.backgroundState.AssetsContractController;
  delete fullState.engine.backgroundState.DeFiPositionsController;
  delete fullState.engine.backgroundState.DeFiPositionsControllerV2;
  delete fullState.engine.backgroundState.PredictController;

  const rawCardControllerState =
    fullState.engine.backgroundState.CardController;
  fullState.engine.backgroundState = applyStateLogsMetadataToBackgroundState(
    fullState.engine.backgroundState,
  );

  const cardControllerState = fullState.engine.backgroundState.CardController;
  if (cardControllerState) {
    const { cardHomeData, cardHomeDataAddress } = rawCardControllerState;
    cardControllerState.cardHomeData = cardHomeData
      ? {
          hasCard: Boolean(cardHomeData.card),
          hasPrimaryFundingAsset: Boolean(cardHomeData.primaryFundingAsset),
          fundingAssetCount: cardHomeData.fundingAssets?.length ?? 0,
          actionTypes: (cardHomeData.actions ?? []).map(
            (action: { type?: string }) => action.type,
          ),
          alertTypes: (cardHomeData.alerts ?? []).map(
            (alert: { type?: string }) => alert.type,
          ),
        }
      : null;
    cardControllerState.cardHomeDataAddress = Boolean(cardHomeDataAddress);
  }

  // Remove SeedlessController controller data so that encrypted vault and sensitive data is not included in logs
  delete fullState.engine.backgroundState.SeedlessOnboardingController;

  // Remove Keyring controller data  so that encrypted vault is not included in logs
  delete fullState.engine.backgroundState.KeyringController;

  const { KeyringController } = Engine.context;
  const newState = {
    ...fullState,
    engine: {
      ...fullState.engine,
      backgroundState: {
        ...fullState.engine.backgroundState,
        KeyringController: {
          keyrings: KeyringController.state?.keyrings,
          isUnlocked: KeyringController.state?.isUnlocked,
          vaultExists:
            KeyringController.state?.vault !== null &&
            KeyringController.state?.vault !== undefined &&
            KeyringController.state?.vault !== '',
        },
        SeedlessOnboardingController:
          getSanitizedSeedlessOnboardingControllerState(),
      },
    },
    loggedIn,
  };

  return JSON.stringify(newState);
};

export const downloadStateLogs = async (
  fullState: RootState,
  loggedIn = true,
) => {
  const environment = process.env.METAMASK_ENVIRONMENT;
  const remoteFeatureFlagEnvironment = getFeatureFlagAppEnvironment();
  const remoteFeatureFlagDistribution = getFeatureFlagAppDistribution();
  const appName = await getApplicationName();
  const appVersion = await getVersion();
  const buildNumber = await getBuildNumber();
  const metaMetricsId = analytics.isEnabled()
    ? await analytics.getAnalyticsId()
    : undefined;
  const filename = `state-logs-v${appVersion}-(${buildNumber}).json`;
  const path = `${RNFS.DocumentDirectoryPath}/${filename}`;
  // A not so great way to copy objects by value

  try {
    const stateLogsWithReleaseDetails = generateStateLogs(
      {
        ...fullState,
        appVersion,
        buildNumber,
        metaMetricsId,
        environment,
        remoteFeatureFlagEnvironment,
        remoteFeatureFlagDistribution,
        otaVersion: OTA_VERSION,
        runtimeVersion: RUNTIME_VERSION,
      },
      loggedIn,
    );

    // Write the logs to a real file on both platforms and share that file.
    // Previously Android shared a `data:text/plain;base64,...` URL, which was
    // slow for large states and only surfaced "send to" targets in the share
    // sheet (no option to save/download the file). Sharing an actual file with
    // a filename and JSON mime type lets Android offer "Save to Files"/Drive.
    await RNFS.writeFile(path, stateLogsWithReleaseDetails, 'utf8');

    // Pass a `file://` URI so react-native-share treats this as a file
    // attachment on Android (plain paths are shared as EXTRA_TEXT). The
    // library converts the path to a `content://` URI via FileProvider.
    await Share.open({
      subject: `${appName} State logs -  v${appVersion} (${buildNumber})`,
      title: `${appName} State logs -  v${appVersion} (${buildNumber})`,
      url: `file://${path}`,
      filename,
      type: 'application/json',
      failOnCancel: false,
    });
  } catch (err) {
    const e = err as Error;
    Logger.error(e, 'State log error');
  }
};
