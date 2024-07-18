import AppConstants from '../../core/AppConstants';

export function isPortfolioUrl(url: string) {
  try {
    const currentUrl = new URL(url);
    return currentUrl.origin === AppConstants.PORTFOLIO.URL;
  } catch (error) {
    return false;
  }
}

export function isBridgeUrl(url: string) {
  try {
    const currentUrl = new URL(url);
    const bridgeUrl = new URL(AppConstants.BRIDGE.URL);

    return (
      currentUrl.origin === bridgeUrl.origin &&
      removePathTrailingSlash(currentUrl.pathname) ===
        removePathTrailingSlash(bridgeUrl.pathname)
    );
  } catch (error) {
    return false;
  }
}

function removePathTrailingSlash(path: string) {
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

export function getValidUrl(urlString: string): URL | null {
  try {
    const url = new URL(urlString);

    if (url.hostname.length === 0 || url.pathname.length === 0) {
      return null;
    }

    if (url.hostname !== decodeURIComponent(url.hostname)) {
      return null; // will happen if there's a %, a space, or other invalid character in the hostname
    }

    return url;
  } catch (error) {
    return null;
  }
}

export function addUrlProtocolPrefix(urlString: string) {
  let trimmed = urlString.trim();

  if (trimmed.length && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`;
  }

  if (getValidUrl(trimmed) !== null) {
    return trimmed;
  }

  return null;
}
