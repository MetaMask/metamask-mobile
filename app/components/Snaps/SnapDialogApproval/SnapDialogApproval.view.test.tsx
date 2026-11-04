import '../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';
import { UserInputEventType } from '@metamask/snaps-sdk';
import Engine from '../../../core/Engine';
import EngineSingleton from '../../../core/Engine/Engine';
import {
  SNAP_APPROVAL_ID,
  SNAP_ID,
  SNAP_INTERFACE_ID,
} from '../../../../tests/component-view/presets/snaps';
import {
  renderSnapDialogApproval,
  simulateSnapInterfaceUpdate,
} from '../../../../tests/component-view/renderers/snaps';
import {
  DIALOG_SNAP_ALERT_TEXT,
  DIALOG_SNAP_CUSTOM_INPUT,
  DIALOG_SNAP_CUSTOM_PLACEHOLDER,
  INTERACTIVE_SNAP_CHECKBOX,
  INTERACTIVE_SNAP_FORM,
  INTERACTIVE_SNAP_INPUT,
  INTERACTIVE_SNAP_PLACEHOLDER,
  dialogSnapAlert,
  dialogSnapConfirmation,
  dialogSnapCustom,
  interactiveSnapForm,
  interactiveSnapResult,
} from '../../../../tests/component-view/fixtures/testSnaps';

/**
 * PoC: component view coverage for the wallet side of `snap_dialog`, mirroring
 * the UI assertions in `tests/smoke-appium/snaps/test-snap-dialog.spec.ts` and
 * `test-snap-interactive-ui.spec.ts`.
 *
 * What this proves: the wallet renders Snap-provided JSX from
 * `SnapInterfaceController` state, resolves the approval with the right value,
 * and forwards user input to the Snap via `SnapController:handleRequest`.
 *
 * What it does NOT prove: that a real Snap running in the WebView executor
 * produced this UI or received these events (Engine is mocked). Snap UI comes
 * from `tests/component-view/fixtures/testSnaps.ts`, which is version-pinned
 * to the test-snaps release the Appium suite uses.
 */

const snapMessengerCall = EngineSingleton.controllerMessenger
  .call as unknown as jest.Mock;

const findUserInputEvent = (type: UserInputEventType, name?: string) =>
  snapMessengerCall.mock.calls
    .filter(([action]) => action === 'SnapController:handleRequest')
    .map(([, args]) => args)
    .find(
      (args) =>
        args.request.params.event.type === type &&
        (name === undefined || args.request.params.event.name === name),
    );

describe('SnapDialogApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('alert dialog', () => {
    it('resolves the approval with null and closes when the user presses OK', async () => {
      const { findByText, getByText, queryByText } = renderSnapDialogApproval({
        approvalType: DIALOG_APPROVAL_TYPES.alert,
        ui: dialogSnapAlert,
      });
      expect(await findByText(DIALOG_SNAP_ALERT_TEXT)).toBeOnTheScreen();

      fireEvent.press(getByText('OK'));

      await waitFor(() => {
        expect(Engine.acceptPendingApproval).toHaveBeenCalledWith(
          SNAP_APPROVAL_ID,
          null,
        );
      });
      expect(
        Engine.context.SnapInterfaceController.deleteInterface,
      ).toHaveBeenCalledWith(SNAP_APPROVAL_ID);
      expect(queryByText(DIALOG_SNAP_ALERT_TEXT)).not.toBeOnTheScreen();
    });
  });

  describe('confirmation dialog', () => {
    const renderConfirmation = () =>
      renderSnapDialogApproval({
        approvalType: DIALOG_APPROVAL_TYPES.confirmation,
        ui: dialogSnapConfirmation,
      });

    it('resolves the approval with true when the user approves', async () => {
      const { findByText, getByText } = renderConfirmation();
      expect(await findByText('Confirmation Dialog')).toBeOnTheScreen();

      fireEvent.press(getByText('Approve'));

      await waitFor(() => {
        expect(Engine.acceptPendingApproval).toHaveBeenCalledWith(
          SNAP_APPROVAL_ID,
          true,
        );
      });
    });

    it('resolves the approval with false when the user cancels', async () => {
      const { findByText, getByText } = renderConfirmation();
      expect(await findByText('Confirmation Dialog')).toBeOnTheScreen();

      fireEvent.press(getByText('Cancel'));

      await waitFor(() => {
        expect(Engine.acceptPendingApproval).toHaveBeenCalledWith(
          SNAP_APPROVAL_ID,
          false,
        );
      });
    });
  });

  describe('custom dialog', () => {
    it('stores typed input and sends it to the Snap when the user confirms', async () => {
      const { findByPlaceholderText, getByText } = renderSnapDialogApproval({
        approvalType: DIALOG_APPROVAL_TYPES.default,
        ui: dialogSnapCustom,
      });

      fireEvent.changeText(
        await findByPlaceholderText(DIALOG_SNAP_CUSTOM_PLACEHOLDER),
        'Hello, World!',
      );
      fireEvent.press(getByText('Confirm'));

      await waitFor(() => {
        expect(
          findUserInputEvent(UserInputEventType.ButtonClickEvent, 'confirm'),
        ).toBeDefined();
      });
      expect(
        Engine.context.SnapInterfaceController.updateInterfaceState,
      ).toHaveBeenLastCalledWith(SNAP_INTERFACE_ID, {
        [DIALOG_SNAP_CUSTOM_INPUT]: 'Hello, World!',
      });
      expect(
        findUserInputEvent(
          UserInputEventType.InputChangeEvent,
          DIALOG_SNAP_CUSTOM_INPUT,
        ),
      ).toMatchObject({
        snapId: SNAP_ID,
        handler: 'onUserInput',
        request: {
          params: {
            id: SNAP_INTERFACE_ID,
            event: { value: 'Hello, World!' },
          },
        },
      });
    });
  });

  describe('interactive form', () => {
    it('submits form values to the Snap and renders the UI the Snap returns', async () => {
      const { findByPlaceholderText, findByText, getByText, store } =
        renderSnapDialogApproval({
          approvalType: DIALOG_APPROVAL_TYPES.default,
          ui: interactiveSnapForm,
        });

      fireEvent.changeText(
        await findByPlaceholderText(INTERACTIVE_SNAP_PLACEHOLDER),
        'foo bar',
      );
      fireEvent.press(getByText('Checkbox'));
      fireEvent.press(getByText('Submit'));

      await waitFor(() => {
        expect(
          findUserInputEvent(
            UserInputEventType.FormSubmitEvent,
            INTERACTIVE_SNAP_FORM,
          ),
        ).toMatchObject({
          request: {
            params: {
              event: {
                value: {
                  [INTERACTIVE_SNAP_INPUT]: 'foo bar',
                  [INTERACTIVE_SNAP_CHECKBOX]: true,
                },
              },
            },
          },
        });
      });

      simulateSnapInterfaceUpdate(
        store,
        interactiveSnapResult('foo bar', true),
      );

      expect(await findByText('foo bar')).toBeOnTheScreen();
      expect(getByText('true')).toBeOnTheScreen();
    });
  });
});
