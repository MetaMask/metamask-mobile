import browserReducer from './index';
import AppConstants from '../../core/AppConstants';

describe('browserReducer', () => {
  it('should handle STORE_FAVICON_URL', () => {
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

  it('should limit the number of favicons stored', () => {
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
