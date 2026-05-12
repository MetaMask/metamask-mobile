import '../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';

import Engine from '../../../core/Engine';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  renderSnapDialogView,
  SNAP_APPROVAL_ID,
} from '../../../../tests/component-view/renderers/snaps';

/**
 * Component-view coverage for smoke `test-snap-dialog.spec.ts`.
 *
 * Smoke spec: tests/smoke/snaps/test-snap-dialog.spec.ts
 *
 * No hooks, selectors, or services are mocked here. Approval type and
 * interface ID are driven by real ApprovalController + SnapInterfaceController
 * state seeded via `initialStateSnapDialog`. The footer buttons (OK / Approve /
 * Cancel) rendered by SnapDialogApproval are independent of the snap interface
 * content and appear as soon as the component reads the approval type from Redux.
 */

describeForPlatforms('SnapDialogApproval', () => {
  beforeEach(() => {
    // Engine.acceptPendingApproval is a jest.fn() from mocks.ts; spying on it
    // returns the same instance, so call history accumulates across platform
    // runs unless we clear it explicitly here.
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('alert dialog', () => {
    it('tapping OK calls acceptPendingApproval with null and dismisses the dialog', async () => {
      const acceptSpy = jest.spyOn(Engine, 'acceptPendingApproval');

      const { findByText, queryByText } = renderSnapDialogView({
        dialogType: DIALOG_APPROVAL_TYPES.alert,
      });

      fireEvent.press(await findByText('OK'));

      await waitFor(() => {
        expect(acceptSpy).toHaveBeenCalledWith(SNAP_APPROVAL_ID, null);
        expect(queryByText('OK')).not.toBeOnTheScreen();
      });
    });
  });

  describe('confirmation dialog', () => {
    it('tapping Approve calls acceptPendingApproval with true', async () => {
      const acceptSpy = jest.spyOn(Engine, 'acceptPendingApproval');

      const { findByText } = renderSnapDialogView({
        dialogType: DIALOG_APPROVAL_TYPES.confirmation,
      });

      fireEvent.press(await findByText('Approve'));

      await waitFor(() => {
        expect(acceptSpy).toHaveBeenCalledWith(SNAP_APPROVAL_ID, true);
      });
    });

    it('tapping Cancel calls acceptPendingApproval with false', async () => {
      const acceptSpy = jest.spyOn(Engine, 'acceptPendingApproval');

      const { findByText } = renderSnapDialogView({
        dialogType: DIALOG_APPROVAL_TYPES.confirmation,
      });

      fireEvent.press(await findByText('Cancel'));

      await waitFor(() => {
        expect(acceptSpy).toHaveBeenCalledWith(SNAP_APPROVAL_ID, false);
      });
    });
  });

  describe('default dialog', () => {
    it('defers footer to the snap — no hardcoded OK, Approve or Cancel buttons', async () => {
      const acceptSpy = jest.spyOn(Engine, 'acceptPendingApproval');

      const { queryByText } = renderSnapDialogView({
        dialogType: DIALOG_APPROVAL_TYPES.default,
      });

      // Act + waitFor: allow any async state settling, then confirm no hardcoded
      // footer buttons are injected by SnapDialogApproval for the default type.
      await act(async () => {
        await waitFor(() => {
          expect(queryByText('OK')).not.toBeOnTheScreen();
          expect(queryByText('Approve')).not.toBeOnTheScreen();
          expect(queryByText('Cancel')).not.toBeOnTheScreen();
        });
      });

      expect(acceptSpy).not.toHaveBeenCalled();
    });
  });
});
