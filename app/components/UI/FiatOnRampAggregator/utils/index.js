// eslint-disable-next-line import/prefer-default-export
export const fakeAwait = (ms = 1000) => new Promise((resolve) => setTimeout(resolve, ms));
