import { RootState } from '../../reducers';
import { memoize } from 'lodash';
import { SubjectType } from '@metamask/permission-controller';

export const selectPermissionControllerState = (state: RootState) =>
  state.engine.backgroundState.PermissionController;

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
