import {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import { AppMetadataControllerState } from '../../controllers/app-metadata-controller';

/**
 * The actions that the AppMetadataControllerMessenger can use.
 */
export type AppMetadataControllerMessengerActions = ControllerGetStateAction<
  'AppMetadataController',
  AppMetadataControllerState
>;

/**
 * The events that the AppMetadataControllerMessenger can handle.
 */
export type AppMetadataControllerMessengerEvents = ControllerStateChangeEvent<
  'AppMetadataController',
  AppMetadataControllerState
>;
