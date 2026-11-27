import {
  Box,
  Button,
  Checkbox,
  Container,
  Field,
  Footer,
  Form,
  Heading,
  Input,
  Text,
} from '@metamask/snaps-sdk/jsx';
import type { SnapInterfaceFixture } from '../presets/snaps';

/**
 * Snap UI fixtures modelled on the example Snaps served by the test-snaps page
 * that the Appium smoke suite loads (`TEST_SNAPS_URL`).
 *
 * Strings and input names match what `tests/smoke-appium/snaps/` asserts on;
 * surrounding layout is simplified.
 *
 * When `TEST_SNAPS_URL` is bumped, `testSnaps.test.ts` fails until someone
 * re-checks these fixtures against the new test-snaps release and updates
 * `TEST_SNAPS_FIXTURES_VERSION`.
 */
export const TEST_SNAPS_FIXTURES_VERSION = '3.6.0';

export const DIALOG_SNAP_ALERT_TEXT =
  'This is an alert dialog. It has a single button: "OK".';

export const dialogSnapAlert: SnapInterfaceFixture = {
  content: Box({ children: Text({ children: DIALOG_SNAP_ALERT_TEXT }) }),
};

export const dialogSnapConfirmation: SnapInterfaceFixture = {
  content: Box({
    children: [
      Heading({ children: 'Confirmation Dialog' }),
      Text({ children: 'Do you want to continue?' }),
    ],
  }),
};

export const DIALOG_SNAP_CUSTOM_INPUT = 'custom-input';
export const DIALOG_SNAP_CUSTOM_PLACEHOLDER = 'Enter something...';

export const dialogSnapCustom: SnapInterfaceFixture = {
  content: Container({
    children: [
      Box({
        children: [
          Heading({ children: 'Custom Dialog' }),
          Input({
            name: DIALOG_SNAP_CUSTOM_INPUT,
            placeholder: DIALOG_SNAP_CUSTOM_PLACEHOLDER,
          }),
        ],
      }),
      Footer({
        children: [
          Button({ name: 'cancel', children: 'Cancel' }),
          Button({ name: 'confirm', children: 'Confirm' }),
        ],
      }),
    ],
  }),
};

export const INTERACTIVE_SNAP_FORM = 'example-form';
export const INTERACTIVE_SNAP_INPUT = 'example-input';
export const INTERACTIVE_SNAP_CHECKBOX = 'example-checkbox';
export const INTERACTIVE_SNAP_PLACEHOLDER = 'Enter something...';

export const interactiveSnapForm: SnapInterfaceFixture = {
  content: Container({
    children: Box({
      children: [
        Heading({ children: 'Interactive UI Example Snap' }),
        Form({
          name: INTERACTIVE_SNAP_FORM,
          children: [
            Field({
              label: 'Example Input',
              children: Input({
                name: INTERACTIVE_SNAP_INPUT,
                placeholder: INTERACTIVE_SNAP_PLACEHOLDER,
              }),
            }),
            Field({
              children: Checkbox({
                name: INTERACTIVE_SNAP_CHECKBOX,
                label: 'Checkbox',
              }),
            }),
            Button({ type: 'submit', name: 'submit', children: 'Submit' }),
          ],
        }),
      ],
    }),
  }),
  state: { [INTERACTIVE_SNAP_FORM]: {} },
};

/** The result view the Interactive UI Snap shows after a submit. */
export const interactiveSnapResult = (
  inputValue: string,
  checkboxValue: boolean,
): SnapInterfaceFixture => ({
  content: Box({
    children: [
      Heading({ children: 'Interactive UI Example Snap' }),
      Text({ children: inputValue }),
      Text({ children: String(checkboxValue) }),
    ],
  }),
});
