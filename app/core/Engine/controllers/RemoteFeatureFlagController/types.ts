import { ControllerMessenger, EngineState } from '../../types';

export interface RemoteFeatureFlagInitParamTypes {
  initialState: Partial<EngineState>;
  controllerMessenger: ControllerMessenger,
  fetchFunction: typeof fetch,
  disabled: boolean
}

