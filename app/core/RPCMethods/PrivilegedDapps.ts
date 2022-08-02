const PrivilegedDapps: {
  [hostname: string]: { [hostname: string]: boolean };
} = {
  /**
   * Gives permission for andrepimenta.github.io to request accounts and add NFTs without requesting user's approval.
   * TODO: CHANGE TO PRODUCTION WEBSITE
   * */

  'andrepimenta.github.io': {
    eth_requestAccounts: true,
    wallet_addNFT: true,
    eth_accounts: true,
  },
};

export default PrivilegedDapps;
