import { act, renderHook } from '@testing-library/react-native';
import I18n, { I18nEvents } from '../../../../../locales/i18n';
import { usePerpsLocale } from './usePerpsLocale';

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  I18nEvents: new (jest.requireActual('events').EventEmitter)(),
}));

describe('usePerpsLocale', () => {
  beforeEach(() => {
    I18n.locale = 'en-US';
    I18nEvents.removeAllListeners();
  });

  it('returns the current app locale', () => {
    const { result } = renderHook(() => usePerpsLocale());

    expect(result.current).toBe('en-US');
  });

  it('updates when the app locale changes', () => {
    const { result } = renderHook(() => usePerpsLocale());

    act(() => {
      I18n.locale = 'de-DE';
      I18nEvents.emit('localeChanged', 'de-DE');
    });

    expect(result.current).toBe('de-DE');
  });

  it('removes the locale listener on unmount', () => {
    const { result, unmount } = renderHook(() => usePerpsLocale());

    unmount();

    act(() => {
      I18nEvents.emit('localeChanged', 'de-DE');
    });

    expect(result.current).toBe('en-US');
  });
});
