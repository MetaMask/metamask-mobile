import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { createStateFixture } from '../stateFixture';

export const SNAP_ID = 'npm:@metamask/dialog-example-snap';
export const INTERFACE_ID = 'test-interface-id';
export const APPROVAL_ID = 'test-approval-id';

export type SnapDialogType =
  | typeof DIALOG_APPROVAL_TYPES.alert
  | typeof DIALOG_APPROVAL_TYPES.confirmation
  | typeof DIALOG_APPROVAL_TYPES.default;

/**
 * Builds a minimal Redux state with a pending snap dialog approval of the
 * given type. The snap interface has no content, so SnapUIRenderer renders
 * an ActivityIndicator — the footer buttons from SnapDialogApproval are
 * independent of the interface content and render regardless.
 */
export const initialStateSnapDialog = (
  dialogType: SnapDialogType = DIALOG_APPROVAL_TYPES.alert,
) =>
  createStateFixture().withOverrides({
    engine: {
      backgroundState: {
        ApprovalController: {
          pendingApprovals: {
            [APPROVAL_ID]: {
              id: APPROVAL_ID,
              type: dialogType,
              origin: SNAP_ID,
              requestData: { id: INTERFACE_ID },
              time: Date.now(),
              requestState: null,
              expectsResult: false,
            },
          },
          approvalFlows: [],
        },
        SnapInterfaceController: {
          interfaces: {
            [INTERFACE_ID]: {
              snapId: SNAP_ID,
              // Null content → SnapUIRenderer shows ActivityIndicator while
              // SnapDialogApproval footer buttons still render.
              content: null,
              state: {},
              context: null,
            },
          },
        },
      },
    },
  } as unknown as DeepPartial<RootState>);
