import { Platform } from 'react-native';

import ReduxService from '../redux/ReduxService';
import { selectBalanceBySelectedAccountGroup } from '../../selectors/assets/balances';
import { selectPrivacyMode } from '../../selectors/preferencesController';
import { strings } from '../../../locales/i18n';

import { darkWidgetTheme, lightWidgetTheme } from './WidgetTheme';
import { WidgetUpdaterServiceImplementation } from './WidgetUpdaterService';
import { BalanceWidget } from './widgets/BalanceWidget';

jest.mock('../../selectors/assets/balances', () => ({
  selectBalanceBySelectedAccountGroup: jest.fn(),
}));

jest.mock('../../selectors/preferencesController', () => ({
  selectPrivacyMode: jest.fn(),
}));

jest.mock('../../../locales/i18n', () => ({
  __esModule: true,
  strings: jest.fn((key: string) => key),
  // `useFormatters.ts`'s `getLocaleLanguageCode` reads `I18n.locale` off the
  // default export.
  default: { locale: 'en-US' },
}));

jest.mock('@metamask/client-utils', () => ({
  createFormatters: jest.fn(() => ({
    formatCurrency: jest.fn(
      (value: number, currency: string) => `formatted:${value}:${currency}`,
    ),
  })),
}));

jest.mock('./widgets/BalanceWidget', () => ({
  BalanceWidget: { updateSnapshot: jest.fn() },
  BALANCE_WIDGET_NAME: 'BalanceWidget',
}));

const mockSelectBalanceBySelectedAccountGroup = jest.mocked(
  selectBalanceBySelectedAccountGroup,
);
const mockSelectPrivacyMode = jest.mocked(selectPrivacyMode);

type BalanceSelector = ReturnType<typeof selectBalanceBySelectedAccountGroup>;

/** Builds the memoized-selector-shaped return value `selectBalanceBySelectedAccountGroup()` produces, for `.mockReturnValue()`. */
function mockBalanceSelector(
  balance: { totalBalanceInUserCurrency: number; userCurrency: string } | null,
): BalanceSelector {
  return jest.fn().mockReturnValue(balance) as unknown as BalanceSelector;
}

describe('WidgetUpdaterService', () => {
  let service: WidgetUpdaterServiceImplementation;
  let subscribe: jest.Mock;
  let unsubscribe: jest.Mock;
  let getState: jest.Mock;
  let subscribedListener: (() => void) | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    Platform.OS = 'ios';

    unsubscribe = jest.fn();
    subscribedListener = undefined;
    subscribe = jest.fn((listener: () => void) => {
      subscribedListener = listener;
      return unsubscribe;
    });
    getState = jest.fn().mockReturnValue({});

    ReduxService.store = {
      subscribe,
      getState,
      dispatch: jest.fn(),
    } as never;

    mockSelectBalanceBySelectedAccountGroup.mockReturnValue(
      mockBalanceSelector({
        totalBalanceInUserCurrency: 1234.56,
        userCurrency: 'usd',
      }),
    );
    mockSelectPrivacyMode.mockReturnValue(false);

    service = WidgetUpdaterServiceImplementation.getInstance();
    service.cleanup();
  });

  afterEach(() => {
    service.cleanup();
    jest.useRealTimers();
  });

  describe('initialize', () => {
    it('subscribes to the Redux store and pushes an immediate snapshot on iOS', () => {
      service.initialize();

      expect(subscribe).toHaveBeenCalledTimes(1);
      expect(BalanceWidget.updateSnapshot).toHaveBeenCalledTimes(1);
      expect(BalanceWidget.updateSnapshot).toHaveBeenCalledWith({
        balanceDisplay: 'formatted:1234.56:usd',
        label: 'widgets.balance_widget.label',
        theme: { light: lightWidgetTheme, dark: darkWidgetTheme },
      });
      expect(strings).toHaveBeenCalledWith('widgets.balance_widget.label');
    });

    it('is a no-op on Android', () => {
      Platform.OS = 'android';

      service.initialize();

      expect(subscribe).not.toHaveBeenCalled();
      expect(BalanceWidget.updateSnapshot).not.toHaveBeenCalled();
    });

    it('does not subscribe twice when called multiple times', () => {
      service.initialize();
      service.initialize();

      expect(subscribe).toHaveBeenCalledTimes(1);
    });

    it('masks the balance when privacy mode is enabled', () => {
      mockSelectPrivacyMode.mockReturnValue(true);

      service.initialize();

      expect(BalanceWidget.updateSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ balanceDisplay: '•'.repeat(9) }),
      );
    });

    it('falls back to 0/usd when there is no selected account group', () => {
      mockSelectBalanceBySelectedAccountGroup.mockReturnValue(
        mockBalanceSelector(null),
      );

      service.initialize();

      expect(BalanceWidget.updateSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ balanceDisplay: 'formatted:0:usd' }),
      );
    });
  });

  describe('Redux state changes', () => {
    it('debounces rapid state changes into a single push', () => {
      service.initialize();
      (BalanceWidget.updateSnapshot as jest.Mock).mockClear();

      // The balance changes across the 3 rapid-fire notifications; only the
      // last one should actually reach the widget once the debounce settles.
      mockSelectBalanceBySelectedAccountGroup.mockReturnValue(
        mockBalanceSelector({
          totalBalanceInUserCurrency: 1,
          userCurrency: 'usd',
        }),
      );
      subscribedListener?.();
      mockSelectBalanceBySelectedAccountGroup.mockReturnValue(
        mockBalanceSelector({
          totalBalanceInUserCurrency: 2,
          userCurrency: 'usd',
        }),
      );
      subscribedListener?.();
      mockSelectBalanceBySelectedAccountGroup.mockReturnValue(
        mockBalanceSelector({
          totalBalanceInUserCurrency: 3,
          userCurrency: 'usd',
        }),
      );
      subscribedListener?.();

      jest.advanceTimersByTime(1999);
      expect(BalanceWidget.updateSnapshot).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(BalanceWidget.updateSnapshot).toHaveBeenCalledTimes(1);
      expect(BalanceWidget.updateSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ balanceDisplay: 'formatted:3:usd' }),
      );
    });

    it('skips pushing again when the computed props have not changed', () => {
      service.initialize();
      expect(BalanceWidget.updateSnapshot).toHaveBeenCalledTimes(1);

      // Redux notifies of a change, but the balance/currency/privacy inputs
      // this widget cares about are identical — no redundant native call.
      subscribedListener?.();
      jest.advanceTimersByTime(2000);

      expect(BalanceWidget.updateSnapshot).toHaveBeenCalledTimes(1);
    });

    it('pushes again once the underlying balance changes', () => {
      service.initialize();
      (BalanceWidget.updateSnapshot as jest.Mock).mockClear();

      mockSelectBalanceBySelectedAccountGroup.mockReturnValue(
        mockBalanceSelector({
          totalBalanceInUserCurrency: 9999,
          userCurrency: 'usd',
        }),
      );
      subscribedListener?.();
      jest.advanceTimersByTime(2000);

      expect(BalanceWidget.updateSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ balanceDisplay: 'formatted:9999:usd' }),
      );
    });
  });

  describe('cleanup', () => {
    it('unsubscribes from the store and cancels a pending debounced push', () => {
      service.initialize();
      (BalanceWidget.updateSnapshot as jest.Mock).mockClear();

      subscribedListener?.();
      service.cleanup();

      expect(unsubscribe).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5000);
      expect(BalanceWidget.updateSnapshot).not.toHaveBeenCalled();
    });

    it('allows re-initializing after cleanup', () => {
      service.initialize();
      service.cleanup();
      service.initialize();

      expect(subscribe).toHaveBeenCalledTimes(2);
    });
  });
});
