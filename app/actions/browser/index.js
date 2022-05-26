/**
 * Adds a new entry to the browser history
 *
 * @param {Object} website - The website that has been visited
 * @param {string} website.url - The website's url
 * @param {string} website.name - The website name
 */
export function addToHistory({ url, name }) {
  return {
    type: 'ADD_TO_BROWSER_HISTORY',
    url,
    name,
  };
}

/**
 * Clears the entire browser history
 */
export function clearHistory() {
  return {
    type: 'CLEAR_BROWSER_HISTORY',
    id: Date.now(),
  };
}

/**
 * Adds a new entry to the whitelist
 *
 * @param {string} url - The website's url
 */
export function addToWhitelist(url) {
  return {
    type: 'ADD_TO_BROWSER_WHITELIST',
    url,
  };
}

/**
 * Closes all the opened tabs
 */
export function closeAllTabs() {
  return {
    type: 'CLOSE_ALL_TABS',
  };
}

/**
 * Creates a new tab
 *
 * @param {string} url - The website's url
 */
export function createNewTab(url) {
  return {
    type: 'CREATE_NEW_TAB',
    url,
    id: Date.now(),
  };
}

/**
 * Closes an exiting tab
 *
 * @param {number} id - The Tab ID
 */
export function closeTab(id) {
  return {
    type: 'CLOSE_TAB',
    id,
  };
}

/**
 * Selects an exiting tab
 *
 * @param {number} id - The Tab ID
 */
export function setActiveTab(id) {
  return {
    type: 'SET_ACTIVE_TAB',
    id,
  };
}

/**
 * Selects an exiting tab
 *
 * @param {number} id - The Tab ID
 * @param {string} url - The website's url
 */
export function updateTab(id, data) {
  return {
    type: 'UPDATE_TAB',
    id,
    data,
  };
}
