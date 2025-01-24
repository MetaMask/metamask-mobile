export { default as createNavigationProps } from './mocks/navigation';

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
