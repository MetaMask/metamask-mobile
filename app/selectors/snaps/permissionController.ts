import { RootState } from '../../reducers';
import { memoize } from 'lodash';
import {
  GenericPermissionController,
  SubjectType,
} from '@metamask/permission-controller';
import { createDeepEqualSelector } from '../util';
import { createSelector } from 'reselect';

export const selectPermissionControllerState = (state: RootState) =>
  state.engine.backgroundState
    .PermissionController as GenericPermissionController['state'];

const selectOrigin = (_state: RootState, origin?: string) => origin;

export const getPermissions = createDeepEqualSelector(
  [selectPermissionControllerState, selectOrigin],
  (state, origin) => (origin ? state.subjects[origin]?.permissions : undefined),
);

export const selectSubjectMetadataControllerState = (state: RootState) =>
  state.engine.backgroundState.SubjectMetadataController;

const getEmbeddableSvg = memoize(
  (svgString) => `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`,
);

function selectSubjectMetadata(state: RootState) {
  return selectSubjectMetadataControllerState(state).subjectMetadata;
}

export function selectTargetSubjectMetadata(state: RootState, origin: string) {
  const metadata = selectSubjectMetadata(state)[origin];

  if (metadata?.subjectType === SubjectType.Snap) {
    return {
      ...metadata,
      iconUrl: metadata.svgIcon ? getEmbeddableSvg(metadata.svgIcon) : null,
    };
  }

  return metadata;
}

export const getSubjects = createSelector(
  selectPermissionControllerState,
  (state) => state.subjects,
);
