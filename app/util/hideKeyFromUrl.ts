const hideKeyFromUrl = (url: string | undefined) => {
  if (!url) return url;

  // If the URL is just a hostname without a path, return it as is
  if (!url.includes('/')) return url;

  const regex = /^(https?:\/\/)(.*)$/;
  const match = url.match(regex);

  if (match) {
    const protocol = match[1];
    let restOfUrl = match[2];

    // Special case: handle URLs like 'test.test.com'
    if (!restOfUrl.includes('/')) {
      return protocol + restOfUrl;
    }

    // eslint-disable-next-line no-useless-escape
    restOfUrl = restOfUrl.replace(/\/[^\/]*$/, '');
    return protocol + restOfUrl;
  }

  return url?.substring(0, url.lastIndexOf('/'));
};

export default hideKeyFromUrl;
