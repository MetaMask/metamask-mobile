const hideKeyFromUrl = (url: string | undefined) =>
  url?.substring(0, url.lastIndexOf('/'));

export default hideKeyFromUrl;
