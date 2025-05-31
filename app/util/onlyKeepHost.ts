const onlyKeepHost = (url: string) => {
  if (!url) {
    return url;
  }

  try {
    return new URL(url).host;
  } catch (error) {
    return url;
  }
};

export default onlyKeepHost;
