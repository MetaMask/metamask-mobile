export const getDecodedProxiedURL = (url: string) =>
  decodeURIComponent(String(new URL(url).searchParams.get('url')));
