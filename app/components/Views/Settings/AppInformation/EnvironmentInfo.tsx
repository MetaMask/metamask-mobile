import React from 'react';
import { Text } from 'react-native';
import {
  channel,
  runtimeVersion,
  isEmbeddedLaunch,
  isEnabled as isOTAUpdatesEnabled,
  updateId,
  checkAutomatically,
} from 'expo-updates';
import { OTA_RC_AUTO_LABEL, OTA_VERSION } from '../../../../constants/ota';
import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
} from '../../../../core/Engine/controllers/remote-feature-flag-controller/utils';
import { getPreinstalledSnapsMetadata } from '../../../../selectors/snaps';
import type { AppInformationStyles } from './AppInformation.styles';

interface EnvironmentInfoProps {
  preinstalledSnaps: ReturnType<typeof getPreinstalledSnapsMetadata>;
  styles: AppInformationStyles;
}

export const EnvironmentInfo = ({
  preinstalledSnaps,
  styles,
}: EnvironmentInfoProps) => {
  const isRunningEmbedded = isEmbeddedLaunch || !isOTAUpdatesEnabled;
  const otaUpdateMessage =
    __DEV__ || isRunningEmbedded
      ? 'This app is running from built-in code or in development mode'
      : 'This app is running an update';

  return (
    <>
      <Text style={styles.branchInfo}>
        {`Environment: ${process.env.METAMASK_ENVIRONMENT}`}
      </Text>
      <Text style={styles.branchInfo}>
        {`Remote Feature Flag Env: ${getFeatureFlagAppEnvironment()}`}
      </Text>
      <Text style={styles.branchInfo}>
        {`Remote Feature Flag Distribution: ${getFeatureFlagAppDistribution()}`}
      </Text>
      <Text style={styles.branchInfo}>
        {`Rewards API URL: ${process.env.REWARDS_API_URL ?? '—'}`}
      </Text>
      <Text style={styles.branchInfo}>
        {`MM_PORTFOLIO_URL: ${process.env.MM_PORTFOLIO_URL ?? '—'}`}
      </Text>
      <Text style={styles.branchInfo}>
        {`OTA Updates enabled: ${String(isOTAUpdatesEnabled)}`}
      </Text>
      {isOTAUpdatesEnabled ? (
        <>
          <Text style={styles.branchInfo}>
            {`Update ID: ${updateId || 'N/A'}`}
          </Text>
          <Text style={styles.branchInfo}>
            {`OTA Update Channel: ${channel}`}
          </Text>
          <Text style={styles.branchInfo}>
            {`OTA Update runtime version: ${runtimeVersion}`}
          </Text>
          <Text style={styles.branchInfo}>
            {`Check Automatically: ${checkAutomatically}`}
          </Text>
          <Text style={styles.branchInfo}>
            {`OTA Update status: ${otaUpdateMessage}`}
          </Text>
          <Text style={styles.branchInfo}>{`OTA Version: ${OTA_VERSION}`}</Text>
          {OTA_RC_AUTO_LABEL ? (
            <Text style={styles.branchInfo}>
              {`Auto RC OTA revision: ${OTA_RC_AUTO_LABEL}`}
            </Text>
          ) : null}
        </>
      ) : null}
      {preinstalledSnaps.map((snap) => (
        <Text key={snap.name} style={styles.branchInfo}>
          {snap.name}: {snap.version} ({snap.status})
        </Text>
      ))}
    </>
  );
};
