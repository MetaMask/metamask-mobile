import {
  addToHistory,
  clearHistory,
  addToWhitelist,
  closeAllTabs,
  createNewTab,
  closeTab,
  setActiveTab,
  updateTab,
} from './';

describe('addToHistory', () => {
  it('should create an action to add a website to the browser history', () => {
    const website = { url: 'https://example.com', name: 'Example' };
    const expectedAction = {
      type: 'ADD_TO_BROWSER_HISTORY',
      url: 'https://example.com',
      name: 'Example',
    };
    expect(addToHistory(website)).toEqual(expectedAction);
  });
});

describe('clearHistory', () => {
  it('should create an action to clear the browser history', () => {
    const expectedAction = {
      type: 'CLEAR_BROWSER_HISTORY',
      id: expect.any(Number),
    };
    expect(clearHistory()).toEqual(expectedAction);
  });
});

describe('addToWhitelist', () => {
  it('should create an action to add a website to the browser whitelist', () => {
    const expectedAction = {
      type: 'ADD_TO_BROWSER_WHITELIST',
      url: 'https://example.com',
    };
    expect(addToWhitelist('https://example.com')).toEqual(expectedAction);
  });
});

describe('closeAllTabs', () => {
  it('should create an action to close all tabs', () => {
    const expectedAction = {
      type: 'CLOSE_ALL_TABS',
    };
    expect(closeAllTabs()).toEqual(expectedAction);
  });
});

describe('createNewTab', () => {
  it('should create an action to create a new tab', () => {
    const expectedAction = {
      type: 'CREATE_NEW_TAB',
      url: 'https://example.com',
      id: expect.any(Number),
    };
    expect(createNewTab('https://example.com')).toEqual(expectedAction);
  });
});

describe('closeTab', () => {
  it('should create an action to close a tab', () => {
    const expectedAction = {
      type: 'CLOSE_TAB',
      id: 123,
    };
    expect(closeTab(123)).toEqual(expectedAction);
  });
});

describe('setActiveTab', () => {
  it('should create an action to set the active tab', () => {
    const expectedAction = {
      type: 'SET_ACTIVE_TAB',
      id: 123,
    };
    expect(setActiveTab(123)).toEqual(expectedAction);
  });
});

describe('updateTab', () => {
  it('should create an action to update a tab', () => {
    const expectedAction = {
      type: 'UPDATE_TAB',
      id: 123,
      data: { url: 'https://example.com' },
    };
    expect(updateTab(123, { url: 'https://example.com' })).toEqual(
      expectedAction,
    );
  });
});
