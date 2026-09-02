import { act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import I18n, { I18nEvents } from '../../../../../locales/i18n';
import type { RootState } from '../../../../reducers';
import {
  renderHookWithProvider,
  type DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { normalizeUiSlotsLocale, useUiSlotsScreen } from './useUiSlotsScreen';

const mockLoadScreen = jest.fn().mockResolvedValue(undefined);
const mockEvaluateScreen = jest.fn();
const mockSetBasicFunctionalityEnabled = jest.fn();
const mockGetNextRefreshAt = jest.fn((): number | undefined => undefined);
const mockGetNextContentBoundaryAt = jest.fn(
  (): number | undefined => undefined,
);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: (effect: () => void | (() => void)) => effect(),
  };
});

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
  };
});

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return { ...actual, useSelector: jest.fn() };
});

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      UiSlotsController: {
        evaluateScreen: (...args: unknown[]) => mockEvaluateScreen(...args),
        getNextContentBoundaryAt: () => mockGetNextContentBoundaryAt(),
        getNextRefreshAt: () => mockGetNextRefreshAt(),
        loadScreen: (...args: unknown[]) => mockLoadScreen(...args),
        setBasicFunctionalityEnabled: (...args: unknown[]) =>
          mockSetBasicFunctionalityEnabled(...args),
      },
    },
  },
}));

const state: DeepPartial<RootState> = {
  settings: {
    basicFunctionalityEnabled: true,
  },
  engine: {
    backgroundState: {
      UiSlotsController: {
        enabled: true,
        screenConfigurations: {},
        renderedConfigurations: {},
        activeConfigurationKeys: {},
        requestStatus: {},
      },
    },
  },
};

describe('useUiSlotsScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    I18n.locale = 'pt_BR';
    jest.mocked(useSelector).mockReset().mockReturnValue(true);
    mockLoadScreen.mockResolvedValue(undefined);
    mockGetNextRefreshAt.mockReturnValue(undefined);
    mockGetNextContentBoundaryAt.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries after an initial load without cached configuration', async () => {
    renderHookWithProvider(() => useUiSlotsScreen('wallet-home'), { state });
    await act(async () => undefined);

    expect(mockLoadScreen).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(60 * 1000);
      await Promise.resolve();
    });

    expect(mockLoadScreen).toHaveBeenCalledTimes(2);
  });

  it('evaluates a content boundary while refresh remains in flight', async () => {
    const now = Date.parse('2026-08-17T12:00:00.000Z');
    jest.setSystemTime(now);
    mockLoadScreen.mockReturnValue(new Promise(() => undefined));
    mockGetNextRefreshAt.mockReturnValue(now + 15 * 60 * 1000);
    mockGetNextContentBoundaryAt
      .mockReturnValueOnce(now + 1_000)
      .mockReturnValue(undefined);

    renderHookWithProvider(() => useUiSlotsScreen('wallet-home'), { state });
    await act(async () => undefined);
    expect(mockEvaluateScreen).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(mockEvaluateScreen).toHaveBeenCalledWith('wallet-home', 'pt-BR');
  });

  it('does not load when basic functionality is disabled', async () => {
    jest
      .mocked(useSelector)
      .mockReset()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    renderHookWithProvider(() => useUiSlotsScreen('wallet-home'), { state });
    await act(async () => undefined);

    expect(mockSetBasicFunctionalityEnabled).toHaveBeenCalledWith(false);
    expect(mockLoadScreen).not.toHaveBeenCalled();
  });

  it('does not load when the host feature is inactive', async () => {
    renderHookWithProvider(() => useUiSlotsScreen('wallet-home', false), {
      state,
    });
    await act(async () => undefined);

    expect(mockLoadScreen).not.toHaveBeenCalled();
  });

  it.each([
    ['en_US', 'en-US'],
    ['pt_br', 'pt-BR'],
    ['ZH_hant_tw', 'zh-hant-TW'],
  ])('normalizes %s to %s', (locale, expected) => {
    expect(normalizeUiSlotsLocale(locale)).toBe(expected);
  });

  it('uses the selected normalized locale for loading', async () => {
    renderHookWithProvider(() => useUiSlotsScreen('wallet-home'), { state });
    await act(async () => undefined);

    expect(mockLoadScreen).toHaveBeenCalledWith('wallet-home', 'pt-BR');
  });

  it('reloads when the user selects another locale', async () => {
    renderHookWithProvider(() => useUiSlotsScreen('wallet-home'), { state });
    await act(async () => undefined);

    await act(async () => {
      I18n.locale = 'fr_FR';
      I18nEvents.emit('localeChanged', 'fr_FR');
    });

    expect(mockLoadScreen).toHaveBeenLastCalledWith('wallet-home', 'fr-FR');
  });
});
