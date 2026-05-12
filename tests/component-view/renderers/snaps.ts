import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen } from '../render';
import {
  initialStateSnapDialog,
  type SnapDialogType,
  APPROVAL_ID as SNAP_APPROVAL_ID,
  INTERFACE_ID as SNAP_INTERFACE_ID,
  SNAP_ID,
} from '../presets/snaps';
import SnapDialogApproval from '../../../app/components/Snaps/SnapDialogApproval';

export { SNAP_APPROVAL_ID, SNAP_INTERFACE_ID, SNAP_ID };

interface RenderSnapDialogOptions {
  dialogType?: SnapDialogType;
  overrides?: DeepPartial<RootState>;
}

/**
 * Renders SnapDialogApproval with a pending approval of the given type seeded
 * into the ApprovalController state. Use overrides to extend state per-test.
 */
export function renderSnapDialogView(
  options: RenderSnapDialogOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides } = options;
  const dialogType = options.dialogType;
  const builder = initialStateSnapDialog(dialogType);
  if (overrides) builder.withOverrides(overrides);
  const state = builder.build();
  return renderComponentViewScreen(
    SnapDialogApproval as unknown as React.ComponentType,
    { name: 'SnapDialogApproval' },
    { state },
  );
}
