import { renderHook } from '@testing-library/react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { PERPS_EVENT_PROPERTY } from '@metamask/perps-controller';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { usePerpsAbandonOrderTracking } from './usePerpsAbandonOrderTracking';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn((callback) => callback()),
}));
jest.mock('./usePerpsEventTracking');

const mockTrack = jest.fn();

interface MockNav {
  addListener: jest.Mock;
  getState: jest.Mock;
  getParent: jest.Mock;
  listeners: Record<string, (() => void)[]>;
  routes: unknown[];
}

const createMockNavigation = (): MockNav => {
  const nav: MockNav = {
    listeners: {},
    routes: [{ key: 'trade' }],
    addListener: jest.fn(),
    getState: jest.fn(),
    getParent: jest.fn(() => undefined),
  };
  nav.addListener.mockImplementation((event: string, cb: () => void) => {
    (nav.listeners[event] ||= []).push(cb);
    return jest.fn();
  });
  nav.getState.mockImplementation(() => ({ routes: nav.routes }));
  return nav;
};

const fire = (nav: MockNav, event: string) => {
  (nav.listeners[event] || []).forEach((cb) => cb());
};

describe('usePerpsAbandonOrderTracking', () => {
  let nav: MockNav;

  const renderTracking = (hasCommitted = false) => {
    const hasCommittedRef = { current: hasCommitted };
    const getAbandonProperties = () => ({
      [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
      [PERPS_EVENT_PROPERTY.ACTION]: 'abandon_order',
    });
    return renderHook(() =>
      usePerpsAbandonOrderTracking({ getAbandonProperties, hasCommittedRef }),
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1000);
    nav = createMockNavigation();
    (useNavigation as jest.Mock).mockReturnValue(nav);
    (useFocusEffect as jest.Mock).mockImplementation((cb) => cb());
    jest.mocked(usePerpsEventTracking).mockReturnValue({
      track: mockTrack,
    } as unknown as ReturnType<typeof usePerpsEventTracking>);
  });

  it('emits abandon_order on beforeRemove (back / hardware back)', () => {
    renderTracking();
    fire(nav, 'beforeRemove');

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
        [PERPS_EVENT_PROPERTY.TIME_ON_SCREEN_MS]: 0,
      }),
    );
  });

  it('emits abandon_order on blur when navigation depth is unchanged (tab away)', () => {
    renderTracking();
    // Depth unchanged since focus → genuine tab switch.
    fire(nav, 'blur');

    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('does NOT emit on blur when a child route was pushed (depth increased)', () => {
    renderTracking();
    // A child route (TP/SL sheet, cross-margin modal, payment selector) pushed.
    nav.routes = [{ key: 'trade' }, { key: 'child' }];
    fire(nav, 'blur');

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('does NOT emit after the flow is committed (placed / confirmed)', () => {
    renderTracking(true);
    fire(nav, 'beforeRemove');
    fire(nav, 'blur');

    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('emits at most once across overlapping beforeRemove and blur', () => {
    renderTracking();
    fire(nav, 'beforeRemove');
    fire(nav, 'blur');

    expect(mockTrack).toHaveBeenCalledTimes(1);
  });
});
