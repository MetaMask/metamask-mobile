import browserReducer from './index';
import AppConstants from '../../core/AppConstants';

describe('browserReducer CREATE_NEW_TAB', () => {
  it('sets lastActiveAt when creating a new tab', () => {
    const now = Date.now();
    const initialState = {
      history: [],
      whitelist: [],
      tabs: [],
      favicons: [],
      activeTab: null,
    };

    const action = {
      type: 'CREATE_NEW_TAB',
      url: 'https://example.com',
      id: 42,
    };

    const newState = browserReducer(initialState, action);

    expect(newState.tabs).toHaveLength(1);
    expect(newState.tabs[0].id).toBe(42);
    expect(newState.tabs[0].url).toBe('https://example.com');
    expect(newState.tabs[0].lastActiveAt).toBeGreaterThanOrEqual(now);
    expect(newState.tabs[0].lastActiveAt).toBeLessThanOrEqual(Date.now());
  });
});

describe('browserReducer CREATE_NEW_TAB entryPoint', () => {
  const initialState = {
    history: [],
    whitelist: [],
    tabs: [],
    favicons: [],
    activeTab: null,
  };

  it('stores the entry point on the new tab', () => {
    const newState = browserReducer(initialState, {
      type: 'CREATE_NEW_TAB',
      url: 'https://app.uniswap.org',
      entryPoint: 'explore_search',
      id: 7,
    });

    expect(newState.tabs[0].entryPoint).toBe('explore_search');
  });

  it('omits entryPoint when none is given', () => {
    const newState = browserReducer(initialState, {
      type: 'CREATE_NEW_TAB',
      url: 'https://app.uniswap.org',
      id: 7,
    });

    expect(newState.tabs[0]).not.toHaveProperty('entryPoint');
  });
});

describe('browserReducer UPDATE_TAB entryPoint', () => {
  const buildState = (tab = {}) => ({
    history: [],
    whitelist: [],
    tabs: [
      {
        id: 7,
        url: 'https://pancakeswap.finance',
        entryPoint: 'explore_search',
        ...tab,
      },
    ],
    favicons: [],
    activeTab: 7,
  });
  const loadedState = () =>
    buildState({ entryPointDomain: 'pancakeswap.finance' });
  const updateUrl = (state, url) =>
    browserReducer(state, { type: 'UPDATE_TAB', id: 7, data: { url } });

  it('keeps the entry point and locks the domain when the first load redirects', () => {
    const newState = updateUrl(
      buildState({ url: 'https://www.hel.io' }),
      'https://www.moonpay.com/business/commerce',
    );

    expect(newState.tabs[0].entryPoint).toBe('explore_search');
    expect(newState.tabs[0].entryPointDomain).toBe('moonpay.com');
  });

  it('keeps the entry point when the tab moves to a sibling subdomain', () => {
    const firstLoad = updateUrl(
      buildState({ url: 'https://aave.com' }),
      'https://aave.com/',
    );

    const newState = updateUrl(firstLoad, 'https://pro.aave.com/');

    expect(newState.tabs[0].entryPoint).toBe('explore_search');
    expect(newState.tabs[0].entryPointDomain).toBe('aave.com');
  });

  it('falls back to the host for urls without a registrable domain', () => {
    const newState = updateUrl(
      buildState({ url: 'http://localhost:3000' }),
      'http://localhost:3000/app',
    );

    expect(newState.tabs[0].entryPointDomain).toBe('localhost');
  });

  it('keeps the entry point when the tab navigates within the locked domain', () => {
    const newState = updateUrl(
      loadedState(),
      'https://pancakeswap.finance/swap?chain=bsc',
    );

    expect(newState.tabs[0].entryPoint).toBe('explore_search');
  });

  it('drops the entry point when the tab leaves the locked domain', () => {
    const newState = updateUrl(loadedState(), 'https://app.uniswap.org');

    expect(newState.tabs[0]).not.toHaveProperty('entryPoint');
    expect(newState.tabs[0]).not.toHaveProperty('entryPointDomain');
    expect(newState.tabs[0].url).toBe('https://app.uniswap.org');
  });

  it('does not restore the entry point when the tab returns to the locked domain', () => {
    const awayState = updateUrl(loadedState(), 'https://app.uniswap.org');

    const backState = updateUrl(awayState, 'https://pancakeswap.finance');

    expect(backState.tabs[0]).not.toHaveProperty('entryPoint');
  });

  it('resets the locked domain when an entry point is passed with the new url', () => {
    const newState = browserReducer(loadedState(), {
      type: 'UPDATE_TAB',
      id: 7,
      data: { url: 'https://1inch.com', entryPoint: 'explore_search' },
    });

    expect(newState.tabs[0].entryPoint).toBe('explore_search');
    expect(newState.tabs[0]).not.toHaveProperty('entryPointDomain');
  });

  it('keeps the entry point when the update has no url', () => {
    const newState = browserReducer(loadedState(), {
      type: 'UPDATE_TAB',
      id: 7,
      data: { image: 'file://thumb.jpg' },
    });

    expect(newState.tabs[0].entryPoint).toBe('explore_search');
  });
});

describe('browserReducer SET_ACTIVE_TAB', () => {
  it('updates lastActiveAt for the activated tab', () => {
    const now = Date.now();
    const initialState = {
      history: [],
      whitelist: [],
      tabs: [
        { id: 1, url: 'https://a.com', lastActiveAt: 100 },
        { id: 2, url: 'https://b.com', lastActiveAt: 200 },
      ],
      favicons: [],
      activeTab: 1,
    };

    const action = {
      type: 'SET_ACTIVE_TAB',
      id: 2,
    };

    const newState = browserReducer(initialState, action);

    expect(newState.activeTab).toBe(2);
    // Tab 2 should have an updated lastActiveAt
    expect(newState.tabs[1].lastActiveAt).toBeGreaterThanOrEqual(now);
    // Tab 1 should keep its old lastActiveAt
    expect(newState.tabs[0].lastActiveAt).toBe(100);
  });
});

describe('browserReducer STORE_FAVICON_URL', () => {
  it('adds favicon in the state', () => {
    const initialState = {
      history: [],
      whitelist: [],
      tabs: [],
      favicons: [],
      activeTab: null,
    };

    const action = {
      type: 'STORE_FAVICON_URL',
      origin: 'testOrigin',
      url: 'testUrl',
    };

    const expectedState = {
      history: [],
      whitelist: [],
      tabs: [],
      favicons: [{ origin: 'testOrigin', url: 'testUrl' }],
      activeTab: null,
    };

    const newState = browserReducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });

  it('limits the number of stored favicons in state to FAVICON_CACHE_MAX_SIZE', () => {
    const initialState = {
      history: [],
      whitelist: [],
      tabs: [],
      favicons: new Array(AppConstants.FAVICON_CACHE_MAX_SIZE).fill({
        origin: 'oldOrigin',
        url: 'oldUrl',
      }),
      activeTab: null,
    };

    const action = {
      type: 'STORE_FAVICON_URL',
      origin: 'newOrigin',
      url: 'newUrl',
    };

    const expectedState = {
      history: [],
      whitelist: [],
      tabs: [],
      favicons: [
        { origin: 'newOrigin', url: 'newUrl' },
        ...new Array(AppConstants.FAVICON_CACHE_MAX_SIZE - 1).fill({
          origin: 'oldOrigin',
          url: 'oldUrl',
        }),
      ],
      activeTab: null,
    };

    const newState = browserReducer(initialState, action);

    expect(newState).toEqual(expectedState);
  });
});

describe('browserReducer TOGGLE_FULLSCREEN', () => {
  it('toggles isFullscreen from false to true', () => {
    // Arrange
    const initialState = {
      history: [],
      whitelist: [],
      tabs: [],
      favicons: [],
      activeTab: null,
      isFullscreen: false,
    };

    const action = {
      type: 'TOGGLE_FULLSCREEN',
      isFullscreen: true,
    };

    const expectedState = {
      history: [],
      whitelist: [],
      tabs: [],
      favicons: [],
      activeTab: null,
      isFullscreen: true,
    };

    // Act
    const newState = browserReducer(initialState, action);

    // Assert
    expect(newState).toEqual(expectedState);
  });

  it('toggles isFullscreen from true to false', () => {
    // Arrange
    const initialState = {
      history: [],
      whitelist: [],
      tabs: [],
      favicons: [],
      activeTab: null,
      isFullscreen: true,
    };

    const action = {
      type: 'TOGGLE_FULLSCREEN',
      isFullscreen: false,
    };

    const expectedState = {
      history: [],
      whitelist: [],
      tabs: [],
      favicons: [],
      activeTab: null,
      isFullscreen: false,
    };

    // Act
    const newState = browserReducer(initialState, action);

    // Assert
    expect(newState).toEqual(expectedState);
  });

  it('preserves all other state properties when toggling fullscreen', () => {
    // Arrange
    const initialState = {
      history: [{ url: 'https://example.com', name: 'Example' }],
      whitelist: ['https://trusted.com'],
      tabs: [{ id: 'tab1', url: 'https://example.com' }],
      favicons: [{ origin: 'example.com', url: 'favicon.ico' }],
      activeTab: 'tab1',
      isFullscreen: false,
    };

    const action = {
      type: 'TOGGLE_FULLSCREEN',
      isFullscreen: true,
    };

    // Act
    const newState = browserReducer(initialState, action);

    // Assert
    expect(newState.history).toEqual(initialState.history);
    expect(newState.whitelist).toEqual(initialState.whitelist);
    expect(newState.tabs).toEqual(initialState.tabs);
    expect(newState.favicons).toEqual(initialState.favicons);
    expect(newState.activeTab).toEqual(initialState.activeTab);
    expect(newState.isFullscreen).toBe(true);
  });
});
