export const sharedState = {
  wentBackMinimizer: false,
};

// And include methods to modify the state
export function setWentBackMinimizer(value: boolean) {
  sharedState.wentBackMinimizer = value;
}
