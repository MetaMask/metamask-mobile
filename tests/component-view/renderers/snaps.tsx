import '../mocks';
import type React from 'react';
import { act } from '@testing-library/react-native';
import type { Store } from 'redux';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Engine from '../../../app/core/Engine';
import { updateBgState } from '../../../app/core/redux/slices/engine';
import SnapDialogApproval from '../../../app/components/Snaps/SnapDialogApproval/SnapDialogApproval';
import { renderComponentViewScreen } from '../render';
import {
  buildSnapInterfaces,
  initialStateSnapDialog,
  type SnapInterfaceFixture,
} from '../presets/snaps';

interface SnapDialogRendererOptions {
  approvalType: string;
  ui: SnapInterfaceFixture;
  overrides?: DeepPartial<RootState>;
}

export const renderSnapDialogApproval = ({
  approvalType,
  ui,
  overrides,
}: SnapDialogRendererOptions) => {
  const builder = initialStateSnapDialog({ approvalType, ui });
  if (overrides) {
    builder.withOverrides(overrides);
  }

  return renderComponentViewScreen(
    SnapDialogApproval as unknown as React.ComponentType,
    { name: 'SnapDialogApproval' },
    { state: builder.build() },
  );
};

/**
 * Simulates the Snap replacing its UI (e.g. `snap_updateInterface` after a
 * form submit). Goes through the real `UPDATE_BG_STATE` reducer path the
 * Engine uses when `SnapInterfaceController` state changes.
 */
export const simulateSnapInterfaceUpdate = (
  store: Store,
  ui: SnapInterfaceFixture,
) => {
  const engine = Engine as unknown as { state?: Record<string, unknown> };
  engine.state = {
    ...(engine.state ?? {}),
    SnapInterfaceController: { interfaces: buildSnapInterfaces(ui) },
  };

  act(() => {
    store.dispatch(updateBgState({ key: 'SnapInterfaceController' }));
  });
};
