import { createSelector } from 'reselect';
import { RootState } from '../../reducers';
import { createDeepEqualSelector } from '../util';
import { getLocalizedSnapManifest } from '@metamask/snaps-utils';

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
