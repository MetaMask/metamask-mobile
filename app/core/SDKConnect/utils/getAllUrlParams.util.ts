export const getAllUrlParams = (url: string) => {
  const queryString = url.split('?')?.[1];
  const obj: any = {};
  if (queryString) {
    queryString.split('&').forEach((param: string) => {
      const [key, value] = param.split('=');
      obj[key] = value;
    });
  }
  return obj;
};

export default getAllUrlParams;
