import { EngineState } from '../../core/Engine';
import { RootState } from '../../reducers';

export type StateWithPartialEngine = RootState | {
  engine: {
    backgroundState: Partial<EngineState>
  }
};
