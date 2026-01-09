import { ParamListBase, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

/**
 * Route params
 */
export interface ManualBackupStep1Params {
  backupFlow?: boolean;
  settingsBackup?: boolean;
  seedPhrase?: string[];
  words?: string[];
}

/**
 * Navigation prop type
 */
export type ManualBackupStep1NavigationProp =
  StackNavigationProp<ParamListBase>;

/**
 * Route prop type
 */
export type ManualBackupStep1RouteProp = RouteProp<
  { ManualBackupStep1: ManualBackupStep1Params },
  'ManualBackupStep1'
>;
