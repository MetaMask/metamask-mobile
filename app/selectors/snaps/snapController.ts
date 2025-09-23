import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import { createDeepEqualSelector } from '../util';
import { getLocalizedSnapManifest, Snap } from '@metamask/snaps-utils';
import { getSubjects } from './permissionController';
import { SnapId } from '@metamask/snaps-sdk';

// TODO: Filter out huge values
export const selectSnapControllerState = (state: RootState) =>
  state.engine.backgroundState.SnapController;

export const selectSnaps = createSelector(
  selectSnapControllerState,
  (controller) => controller.snaps,
);

export const selectSnapsMetadata = createDeepEqualSelector(
  selectSnaps,
  (snaps) =>
    Object.values(snaps).reduce<
      Record<string, { name: string; description: string }>
    >((snapsMetadata, snap) => {
      const snapId = snap.id;
      const manifest = snap.localizationFiles
        ? getLocalizedSnapManifest(
            snap.manifest,
            // TODO: Use actual locale here.
            'en',
            snap.localizationFiles,
          )
        : snap.manifest;

      snapsMetadata[snapId] = {
        name: manifest.proposedName,
        description: manifest.description,
      };
      return snapsMetadata;
    }, {}),
);

export const getEnabledSnaps = createDeepEqualSelector(selectSnaps, (snaps) =>
  Object.values(snaps).reduce<Record<SnapId, Snap>>((acc, cur) => {
    if (cur.enabled) {
      acc[cur.id] = cur;
    }
    return acc;
  }, {}),
);

export const getNameLookupSnaps = createDeepEqualSelector(
  getEnabledSnaps,
  getSubjects,
  (snaps, subjects) =>
    Object.values(snaps)
      .filter(({ id }) => subjects[id]?.permissions['endowment:name-lookup'])
      .map((snap) => ({
        id: snap.id,
        permission: subjects[snap.id]?.permissions['endowment:name-lookup'],
      })),
);
