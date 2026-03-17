import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

/**
 * Route params for ManualBackupStep1
 */
export interface ManualBackupStep1Params {
  backupFlow?: boolean;
  settingsBackup?: boolean;
  /**
   * Seed phrase words passed directly from previous screen.
   * Takes precedence over fetching from keyring.
   */
  seedPhrase?: string[];
  /**
   * @deprecated Use seedPhrase instead. Kept for backwards compatibility.
   * Words passed from previous screen as fallback.
   */
  words?: string[];
}

/**
 * Route params for ManualBackupStep2
 */
export interface ManualBackupStep2Params {
  words: string[];
  steps: string[];
  backupFlow: boolean;
  settingsBackup: boolean;
}

/**
 * Param list for backup flow navigation
 */
export interface BackupFlowParamList {
  [key: string]: object | undefined;
  ManualBackupStep1: ManualBackupStep1Params;
  ManualBackupStep2: ManualBackupStep2Params;
  RootModalFlow: { screen: string };
  OptinMetrics: { onContinue?: () => void };
  OnboardingSuccessFlow: undefined;
}

/**
 * Navigation prop type with proper typing for navigate() calls
 */
export type ManualBackupStep1NavigationProp = StackNavigationProp<
  BackupFlowParamList,
  'ManualBackupStep1'
>;

/**
 * Route prop type
 */
export type ManualBackupStep1RouteProp = RouteProp<
  BackupFlowParamList,
  'ManualBackupStep1'
>;
