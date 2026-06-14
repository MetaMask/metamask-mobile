export const preventAutoHideAsync = jest.fn().mockResolvedValue(undefined);
export const hideAsync = jest.fn().mockResolvedValue(undefined);
export const hide = jest.fn();

export default {
  preventAutoHideAsync,
  hideAsync,
  hide,
};
