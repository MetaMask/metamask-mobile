const specialPermissions: {
  [hostname: string]: { [hostname: string]: boolean };
} = {
  // Gives permission for localhost:3000 to request accounts and add NFTs without requesting user's approval
  localhost: {
    eth_requestAccounts: true,
    wallet_addNFT: true,
    eth_accounts: true,
  },
};

export default specialPermissions;
