const onlyKeepHost = (url: string) => {
  if (!url) return url;
  const parsedUrl = new URL(url);
  return parsedUrl.host;
};

export default onlyKeepHost;
