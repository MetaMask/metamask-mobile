import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  MoneyMfaSheetHostTestIds,
  renderMoneyMfaSheet,
} from '../../../../../../tests/component-view/renderers/money';
import { analytics } from '../../../../../util/analytics/analytics';
import { getActiveMfaFlow } from '../../../../../util/identity/mfa/engine/activeFlow';
import { moneyMfaStore } from '../../../../../lib/Money/mfa/moneyMfaStore';
import {
  BOTTOM_SHEET_NAMES,
  MONEY_BUTTON_INTENTS,
} from '../../constants/moneyEvents';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

const openSheet = async (sheet: string, sheetTestId: string) => {
  const view = renderMoneyMfaSheet(sheet);
  fireEvent.press(await view.findByTestId(MoneyMfaSheetHostTestIds.OPEN));
  await view.findByTestId(sheetTestId);
  return view;
};

const expectClosed = async (
  queryByTestId: (id: string) => unknown,
  sheetTestId: string,
) => {
  await waitFor(() => expect(queryByTestId(sheetTestId)).toBeNull());
};

describeForPlatforms('Money 2-step verification sheets', () => {
  let trackEventSpy: jest.SpyInstance;

  const trackedProperties = () =>
    trackEventSpy.mock.calls.map(
      ([event]) =>
        (event as { properties?: Record<string, unknown> }).properties ?? {},
    );

  beforeEach(() => {
    moneyMfaStore.reset();
    trackEventSpy = jest.spyOn(analytics, 'trackEvent');
  });

  afterEach(() => {
    getActiveMfaFlow()?.dispatch({ type: 'cancel' });
    trackEventSpy.mockRestore();
    moneyMfaStore.reset();
  });

  it.each([
    [
      Routes.MONEY.MODALS.MFA_ENABLED_SHEET,
      MoneyMfaTestIds.ENABLED_SHEET,
      MoneyMfaTestIds.ENABLED_SHEET_BUTTON,
      'money.mfa.enabled_title',
      BOTTOM_SHEET_NAMES.MONEY_MFA_ENABLED_SHEET,
    ],
    [
      Routes.MONEY.MODALS.MFA_SETTING_UP_SHEET,
      MoneyMfaTestIds.SETTING_UP_SHEET,
      MoneyMfaTestIds.SETTING_UP_SHEET_BUTTON,
      'money.mfa.send_blocked_title',
      BOTTOM_SHEET_NAMES.MONEY_MFA_SETTING_UP_SHEET,
    ],
  ])(
    '%s closes on Got it',
    async (sheet, sheetTestId, buttonTestId, titleKey, bottomSheetName) => {
      const { getByTestId, getByText, queryByTestId } = await openSheet(
        sheet,
        sheetTestId,
      );

      expect(getByText(strings(titleKey))).toBeOnTheScreen();
      expect(trackedProperties()).toContainEqual(
        expect.objectContaining({ bottom_sheet_name: bottomSheetName }),
      );

      fireEvent.press(getByTestId(buttonTestId));

      await expectClosed(queryByTestId, sheetTestId);
      expect(getByTestId(MoneyMfaSheetHostTestIds.OPEN)).toBeOnTheScreen();
    },
  );

  describe('turn off sheet', () => {
    beforeEach(() => {
      moneyMfaStore.setState({ isMoneyAccountMfaEnabled: true });
    });

    it('closes and keeps 2-step verification on when Cancel is pressed', async () => {
      const { getByTestId, queryByTestId } = await openSheet(
        Routes.MONEY.MODALS.MFA_TURN_OFF_SHEET,
        MoneyMfaTestIds.TURN_OFF_SHEET,
      );

      fireEvent.press(getByTestId(MoneyMfaTestIds.TURN_OFF_CANCEL_BUTTON));

      await expectClosed(queryByTestId, MoneyMfaTestIds.TURN_OFF_SHEET);
      expect(getActiveMfaFlow()).toBeUndefined();
      expect(moneyMfaStore.getState().isMoneyAccountMfaEnabled).toBe(true);
      expect(trackedProperties()).toContainEqual(
        expect.objectContaining({
          button_intent: MONEY_BUTTON_INTENTS.DISMISS,
          label_en: strings('money.mfa.cancel'),
        }),
      );
    });

    it('closes and asks for verification when Turn off is pressed', async () => {
      const { getByTestId, queryByTestId } = await openSheet(
        Routes.MONEY.MODALS.MFA_TURN_OFF_SHEET,
        MoneyMfaTestIds.TURN_OFF_SHEET,
      );

      fireEvent.press(getByTestId(MoneyMfaTestIds.TURN_OFF_BUTTON));

      await expectClosed(queryByTestId, MoneyMfaTestIds.TURN_OFF_SHEET);
      await waitFor(() =>
        expect(trackedProperties()).toContainEqual(
          expect.objectContaining({
            operation: 'money.mfa.turnOff',
            status: 'started',
          }),
        ),
      );
      expect(trackedProperties()).toContainEqual(
        expect.objectContaining({
          button_intent: MONEY_BUTTON_INTENTS.DISABLE_MFA,
          label_en: strings('money.mfa.turn_off_cta'),
        }),
      );
    });

    it('keeps 2-step verification on when verification does not finish', async () => {
      const { getByTestId, queryByTestId } = await openSheet(
        Routes.MONEY.MODALS.MFA_TURN_OFF_SHEET,
        MoneyMfaTestIds.TURN_OFF_SHEET,
      );
      fireEvent.press(getByTestId(MoneyMfaTestIds.TURN_OFF_BUTTON));
      await expectClosed(queryByTestId, MoneyMfaTestIds.TURN_OFF_SHEET);

      getActiveMfaFlow()?.dispatch({ type: 'cancel' });

      await waitFor(() => expect(getActiveMfaFlow()).toBeUndefined());
      expect(moneyMfaStore.getState().isMoneyAccountMfaEnabled).toBe(true);
    });
  });

  describe('home prompt sheet', () => {
    it('dismisses the home prompt for good when closed', async () => {
      const { getByTestId, queryByTestId } = await openSheet(
        Routes.MONEY.MODALS.MFA_PROMPT_SHEET,
        MoneyMfaTestIds.PROMPT_SHEET,
      );

      expect(getByTestId(MoneyMfaTestIds.PROMPT_SHEET)).toHaveTextContent(
        strings('money.mfa.intro_title'),
        { exact: false },
      );

      fireEvent.press(getByTestId(MoneyMfaTestIds.PROMPT_SHEET_CLOSE));

      await expectClosed(queryByTestId, MoneyMfaTestIds.PROMPT_SHEET);
      expect(moneyMfaStore.getState().isHomePromptDismissed).toBe(true);
      expect(trackedProperties()).toContainEqual(
        expect.objectContaining({
          bottom_sheet_name: BOTTOM_SHEET_NAMES.MONEY_MFA_PROMPT_SHEET,
          button_intent: MONEY_BUTTON_INTENTS.DISMISS,
        }),
      );
    });

    it('closes and starts passkey setup when Add passkey is pressed', async () => {
      const { getByTestId, queryByTestId } = await openSheet(
        Routes.MONEY.MODALS.MFA_PROMPT_SHEET,
        MoneyMfaTestIds.PROMPT_SHEET,
      );

      fireEvent.press(getByTestId(MoneyMfaTestIds.INTRO_BUTTON));

      await expectClosed(queryByTestId, MoneyMfaTestIds.PROMPT_SHEET);
      await waitFor(() =>
        expect(trackedProperties()).toContainEqual(
          expect.objectContaining({
            operation: 'money.mfa.addPasskey',
            status: 'started',
          }),
        ),
      );
      expect(moneyMfaStore.getState().isHomePromptDismissed).toBe(false);
      expect(trackedProperties()).toContainEqual(
        expect.objectContaining({
          button_intent: MONEY_BUTTON_INTENTS.ENABLE_MFA,
          label_en: strings('money.mfa.intro_cta'),
        }),
      );
    });
  });
});
