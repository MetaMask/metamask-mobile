import type { PersistConfig } from 'redux-persist';
import type { AttributionState } from '../core/redux/slices/attribution';
import { attributionPersistStorage } from './attributionPersistStorage';

const attributionPersistConfig: PersistConfig<AttributionState> = {
  key: 'attribution',
  storage: attributionPersistStorage,
};

export default attributionPersistConfig;
