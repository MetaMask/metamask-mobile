export const setWallet = (state, action) => {
  switch (action.type) {
    case "SET_WALLET":
      return [action.text];
    default:
      return state;
  }
};
