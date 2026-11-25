jest.mock('../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en', translations: { en: {} } },
}));

import { act, renderHook } from '@testing-library/react-hooks';
import { getLocales, type Locale } from 'expo-localization';
import { AppState } from 'react-native';
import { useFormattingLocale } from './useFormattingLocale';

const mockGetLocales = jest.mocked(getLocales);

const onAppStateChange = jest
  .mocked(AppState.addEventListener)
  .mock.calls.find(([type]) => type === 'change')?.[1];

const mockDeviceRegion = (regionCode: string) =>
  mockGetLocales.mockReturnValue([{ regionCode } as Locale]);

describe('useFormattingLocale', () => {
  beforeEach(() => {
    expect(onAppStateChange).toBeDefined();
    // Clear the cached device region
    onAppStateChange?.('active');
  });

  it('combines app language with device region', () => {
    mockDeviceRegion('DE');

    const { result } = renderHook(() => useFormattingLocale());

    expect(result.current).toBe('en-DE');
  });

  it('updates when the device region changes', () => {
    mockDeviceRegion('DE');
    const { result } = renderHook(() => useFormattingLocale());

    mockDeviceRegion('CA');
    act(() => onAppStateChange?.('active'));

    expect(result.current).toBe('en-CA');
  });
});
