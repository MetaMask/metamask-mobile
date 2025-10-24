import browserReducer from './index';
import AppConstants from '../../core/AppConstants';

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
