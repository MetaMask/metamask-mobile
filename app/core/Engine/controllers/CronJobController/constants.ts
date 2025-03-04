import {
  CronjobControllerState,
  CronjobControllerStateChangeEvent as CronjobControllerStateChangeEventType,
} from '@metamask/snaps-controllers';

export const defaultCronjobControllerState: CronjobControllerState = {
  jobs: {},
  events: {},
};

export const CronjobControllerStateChangeEvent: CronjobControllerStateChangeEventType['type'] =
  'CronjobController:stateChange';
