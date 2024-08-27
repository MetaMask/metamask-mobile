const hideKeyFromUrl = (url: string | undefined) => {
  if (!url) return url;

  const regex = /^(https?:\/\/)(.*)$/;
  const match = url.match(regex);

  if (match) {
    const protocol = match[1];
    let restOfUrl = match[2];

    // eslint-disable-next-line no-useless-escape
    restOfUrl = restOfUrl.replace(/\/[^\/]*$/, '');
    return protocol + restOfUrl;
  }

  return url?.substring(0, url.lastIndexOf('/'));
};

export default hideKeyFromUrl;
