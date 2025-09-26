const dummyProtocol = 'dummy:';

export default function getRedirectPathsAndParams(path: string) {
  let pathnames: string[] = [];
  let params;
  try {
    const urlObject = new URL(`${dummyProtocol}${path}`);
    pathnames = `${urlObject.hostname}${urlObject.pathname}`
      .split('/')
      .filter(Boolean);
    if (urlObject.search) {
      params = Object.fromEntries(urlObject.searchParams);
    }

    return [pathnames, params] as const;
  } catch (error) {
    return [pathnames, params] as const;
  }
}
