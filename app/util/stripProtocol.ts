const stripProtocol = (url: string | undefined) => {
  if (!url) {
    return url;
  }

  const parsedUrl = new URL(url);
  return `${parsedUrl.host}${
    parsedUrl.pathname === '/' ? '' : parsedUrl.pathname
  }`;
};

export default stripProtocol;
