import type {
  ApprovalControllerState,
  ApprovalRequest,
} from '@metamask/approval-controller';
import {
  SubjectType,
  type SubjectMetadataControllerState,
} from '@metamask/permission-controller';
import type {
  SnapInterfaceControllerState,
  StoredInterface,
} from '@metamask/snaps-controllers';
import type { InterfaceState, SnapId } from '@metamask/snaps-sdk';
import type { JSXElement } from '@metamask/snaps-sdk/jsx';
import type { Snap, SnapManifest } from '@metamask/snaps-utils';
import type { Json } from '@metamask/utils';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { createStateFixture } from '../stateFixture';

export const SNAP_ID = 'npm:@metamask/test-snap' as SnapId;
export const SNAP_APPROVAL_ID = 'snap-approval-id';
export const SNAP_INTERFACE_ID = 'snap-interface-id';

export interface SnapInterfaceFixture {
  content: JSXElement;
  state?: InterfaceState;
}

/**
 * The subset of a `SnapController` snap entry the wallet UI reads. Typed via
 * `Pick` so a rename upstream fails `tsc` instead of silently passing.
 */
type SnapFixture = Pick<
  Snap,
  'id' | 'version' | 'enabled' | 'blocked' | 'hideSnapBranding'
> & {
  manifest: Pick<SnapManifest, 'proposedName'>;
};

// Every slice below is typed against the owning package's state type, so a
// shape change in `@metamask/snaps-controllers`, `@metamask/approval-controller`
// or `@metamask/permission-controller` breaks the type check for this preset.

/**
 * Builds the `SnapInterfaceController.interfaces` entry the wallet renders
 * for a Snap-owned UI.
 */
export const buildSnapInterfaces = (
  { content, state = {} }: SnapInterfaceFixture,
  interfaceId: string = SNAP_INTERFACE_ID,
): SnapInterfaceControllerState['interfaces'] => {
  const storedInterface: StoredInterface = {
    snapId: SNAP_ID,
    content,
    state,
    context: null,
    contentType: null,
    displayed: false,
  };
  return { [interfaceId]: storedInterface };
};

const buildApprovalControllerState = (
  approvalType: string,
): ApprovalControllerState => {
  const approval: ApprovalRequest<Record<string, Json>> = {
    id: SNAP_APPROVAL_ID,
    origin: SNAP_ID,
    type: approvalType,
    time: 1,
    requestData: { id: SNAP_INTERFACE_ID },
    requestState: null,
    expectsResult: true,
  };
  return {
    pendingApprovals: { [SNAP_APPROVAL_ID]: approval },
    pendingApprovalCount: 1,
    approvalFlows: [],
  };
};

const snapControllerSnaps: Record<string, SnapFixture> = {
  [SNAP_ID]: {
    id: SNAP_ID,
    version: '1.0.0' as Snap['version'],
    enabled: true,
    blocked: false,
    hideSnapBranding: false,
    manifest: { proposedName: 'Test Snap' },
  },
};

const subjectMetadataControllerState: SubjectMetadataControllerState = {
  subjectMetadata: {
    [SNAP_ID]: {
      origin: SNAP_ID,
      name: 'Test Snap',
      subjectType: SubjectType.Snap,
      version: '1.0.0',
      iconUrl: null,
      extensionId: null,
    },
  },
};

interface SnapDialogPresetOptions {
  /** One of `DIALOG_APPROVAL_TYPES` from `@metamask/snaps-rpc-methods`. */
  approvalType: string;
  ui: SnapInterfaceFixture;
}

/**
 * Baseline state for a Snap dialog: one pending `snap_dialog` approval whose
 * request points at a Snap interface held by `SnapInterfaceController`.
 */
export const initialStateSnapDialog = ({
  approvalType,
  ui,
}: SnapDialogPresetOptions) => {
  const snapInterfaceControllerState: SnapInterfaceControllerState = {
    interfaces: buildSnapInterfaces(ui),
  };

  // Only the `RootState` envelope is cast: the controller slices above are
  // already checked against their package types. `SnapController` is partial
  // on purpose (see `SnapFixture`).
  const backgroundState = {
    ApprovalController: buildApprovalControllerState(approvalType),
    SnapController: { snaps: snapControllerSnaps },
    SubjectMetadataController: subjectMetadataControllerState,
    SnapInterfaceController: snapInterfaceControllerState,
  };

  return createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withOverrides({
      engine: { backgroundState },
    } as DeepPartial<RootState>);
};
