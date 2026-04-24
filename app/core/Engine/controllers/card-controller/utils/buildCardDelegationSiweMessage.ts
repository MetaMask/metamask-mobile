import AppConstants from '../../../../../core/AppConstants';

/**
 * SIWE message for EVM card delegation (matches useCardDelegation EVM branch).
 */
export function buildEvmSiweMessageForCardDelegation(
  address: string,
  nonce: string,
  caipChainId: string,
): string {
  const now = new Date();
  const expirationTime = new Date(now.getTime() + 2 * 60 * 1000);
  const chainId = caipChainId.split(':')[1] ?? '59144';
  const domain = AppConstants.MM_UNIVERSAL_LINK_HOST;
  const uri = `https://${domain}`;
  return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nProve address ownership\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${now.toISOString()}\nExpiration Time: ${expirationTime.toISOString()}`;
}
