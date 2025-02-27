import { RootState } from '../../reducers';
import { memoize } from 'lodash';
import {
  PermissionConstraint,
  PermissionControllerState,
  SubjectType,
} from '@metamask/permission-controller';
import { getPermittedAccountsBySubject } from '../../core/Permissions';
import { createSelector } from 'reselect';

export const selectPermissionControllerState = (state: RootState) =>
  state.engine.backgroundState
    .PermissionController as PermissionControllerState<PermissionConstraint>;

/**
 * Returns the permitted accounts for a given subject
 *
 * @param subject - The subject to get the permitted accounts for
 * @returns A selector that returns the permitted accounts for the given subject
 */
export const selectPermittedAccounts = (subject: string) =>
  createSelector(
    selectPermissionControllerState,
    (permissionControllerState) => {
      const permittedAccounts = getPermittedAccountsBySubject(
        permissionControllerState,
        subject,
      );
      return permittedAccounts;
    },
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
