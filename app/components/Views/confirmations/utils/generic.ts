import Logger from '../../../../util/Logger';

export const getHostFromUrl = (url: string) => {
  if (!url) {
    return;
  }
  try {
    return new URL(url).host;
  } catch (error) {
    Logger.error(error as Error);
  }
  return;
};
