const getWindowInformation = `
  const shortcutIcon = window.document.querySelector('head > link[rel="shortcut icon"]');
  const icon = shortcutIcon || Array.from(window.document.querySelectorAll('head > link[rel="icon"]')).find((icon) => Boolean(icon.href));

  const siteName = document.querySelector('head > meta[property="og:site_name"]');
  const title = siteName || document.querySelector('head > meta[name="title"]');
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
    {
      type: 'GET_TITLE_FOR_BOOKMARK',
      payload: {
        title: title ? title.content : document.title,
        url: location.href,
        icon: icon && icon.href
      }
    }
  ))
`;

export const SPA_urlChangeListener = `(function () {
  var __mmHistory = window.history;
  var __mmPushState = __mmHistory.pushState;
  var __mmReplaceState = __mmHistory.replaceState;
  function __mm__updateUrl(){
    const siteName = document.querySelector('head > meta[property="og:site_name"]');
    const title = siteName || document.querySelector('head > meta[name="title"]') || document.title;
    const height = Math.max(document.documentElement.clientHeight, document.documentElement.scrollHeight, document.body.clientHeight, document.body.scrollHeight);

    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
      {
        type: 'NAV_CHANGE',
        payload: {
          url: location.href,
          title: title,
        }
      }
    ));

    setTimeout(() => {
      const height = Math.max(document.documentElement.clientHeight, document.documentElement.scrollHeight, document.body.clientHeight, document.body.scrollHeight);
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(
      {
        type: 'GET_HEIGHT',
        payload: {
          height: height
        }
      }))
    }, 500);
  }

  __mmHistory.pushState = function(state) {
    setTimeout(function () {
      __mm__updateUrl();
    }, 100);
    return __mmPushState.apply(history, arguments);
  };

  __mmHistory.replaceState = function(state) {
    setTimeout(function () {
      __mm__updateUrl();
    }, 100);
    return __mmReplaceState.apply(history, arguments);
  };

  window.onpopstate = function(event) {
    __mm__updateUrl();
  };
  })();
`;

/*
 *
 * Code from scripts/inpage-bridge/content-script/index.js
 * minus documentElementCheck the function
 *
 */
export const getInpageProvider = (entryScriptWeb3) =>
  `if (shouldInject()) {
  injectScript();
  start();
}

// Functions

/**
 * Sets up the stream communication and submits site metadata
 *
 */
async function start() {
  await domIsReady();
  window._metamaskSetupProvider();
}

/**
 * Injects a script tag into the current document
 *
 * @param {string} content - Code to be executed in the current document
 */
function injectScript() {
  try {
    ${entryScriptWeb3};
  } catch (err) {
    console.error('MetaMask script injection failed', err);
  }
}

/**
 * Determines if the provider should be injected.
 *
 * @returns {boolean} {@code true} if the provider should be injected.
 */
function shouldInject() {
  return (
    doctypeCheck() &&
    suffixCheck() &&
    !blockedDomainCheck()
  );
}

/**
 * Checks the doctype of the current document if it exists
 *
 * @returns {boolean} {@code true} if the doctype is html or if none exists
 */
function doctypeCheck() {
  const { doctype } = window.document;
  if (doctype) {
    return doctype.name === 'html';
  }
  return true;
}

/**
 * Returns whether or not the extension (suffix) of the current document is
 * prohibited.
 *
 * This checks {@code window.location.pathname} against a set of file extensions
 * that should not have the provider injected into them. This check is indifferent
 * of query parameters in the location.
 *
 * @returns {boolean} whether or not the extension of the current document is prohibited
 */
function suffixCheck() {
  const prohibitedTypes = [/\\.xml$/u, /\\.pdf$/u];
  const currentUrl = window.location.pathname;
  for (let i = 0; i < prohibitedTypes.length; i++) {
    if (prohibitedTypes[i].test(currentUrl)) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if the current domain is blocked
 *
 * @returns {boolean} {@code true} if the current domain is blocked
 */
function blockedDomainCheck() {
  // If making any changes, please also update the same list found in the MetaMask-Mobile & SDK repositories
  const blockedDomains = [
    'execution.consensys.io',
    'execution.metamask.io',
    'uscourts.gov',
    'dropbox.com',
    'webbyawards.com',
    'adyen.com',
    'gravityforms.com',
    'harbourair.com',
    'ani.gamer.com.tw',
    'blueskybooking.com',
    'sharefile.com',
    'battle.net',
  ];

  // Matching will happen based on the hostname, and path
  const blockedUrlPaths = [
    'cdn.shopify.com/s/javascripts/tricorder/xtld-read-only-frame.html',
  ];

  const { hostname: currentHostname, pathname: currentPathname } =
    window.location;

  const trimTrailingSlash = (str) =>
    str.endsWith('/') ? str.slice(0, -1) : str;

  return (
    blockedDomains.some(
      (blockedDomain) =>
        blockedDomain === currentHostname ||
        currentHostname.endsWith("." + blockedDomain),
    ) ||
    blockedUrlPaths.some(
      (blockedUrlPath) =>
        trimTrailingSlash(blockedUrlPath) ===
        trimTrailingSlash(currentHostname + currentPathname),
    )
  );
}

/**
 * Returns a promise that resolves when the DOM is loaded (does not wait for images to load)
 */
async function domIsReady() {
  // already loaded
  if (['interactive', 'complete'].includes(document.readyState)) {
    return;
  }
  // wait for load
  await new Promise((resolve) =>
    window.addEventListener('DOMContentLoaded', resolve, { once: true }),
  );
};
`;

export const JS_WINDOW_INFORMATION = `
  (function () {
    ${getWindowInformation}
  })();
`;

export const JS_DESELECT_TEXT = `if (window.getSelection) {window.getSelection().removeAllRanges();}
else if (document.selection) {document.selection.empty();}`;

export const JS_POST_MESSAGE_TO_PROVIDER = (message, origin) => `(function () {
  try {
    window.postMessage(${JSON.stringify(message)}, '${origin}');
  } catch (e) {
    //Nothing to do
  }
})()`;

export const JS_IFRAME_POST_MESSAGE_TO_PROVIDER = (message, origin) =>
  `(function () {})()`;
/** Disable sending messages to iframes for now
 *
`(function () {
  const iframes = document.getElementsByTagName('iframe');
  for (let frame of iframes){

      try {
        frame.contentWindow.postMessage(${JSON.stringify(message)}, '${origin}');
      } catch (e) {
        //Nothing to do
      }

  }
})()`;
 */
