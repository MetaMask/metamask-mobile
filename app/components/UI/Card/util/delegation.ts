import AppConstants from '../../../../core/AppConstants';

/**
 * Generates a SIWE (Sign-In with Ethereum/Solana) message for card delegation.
 * EVM messages include an expiration time (2 minutes); Solana messages do not.
 */
export function generateSignatureMessage(
  address: string,
  nonce: string,
  network: string,
  caipChainId?: string | null,
): string {
  const now = new Date();
  const expirationTime = new Date(now.getTime() + 2 * 60 * 1000);
  const chainId =
    network === 'solana' ? '1' : (caipChainId?.split(':')[1] ?? '59144');
  const domain = AppConstants.MM_UNIVERSAL_LINK_HOST;
  const uri = `https://${domain}`;
  const capitalizedNetwork = network.charAt(0).toUpperCase() + network.slice(1);

  if (network === 'solana') {
    return `${domain} wants you to sign in with your ${capitalizedNetwork} account:\n${address}\n\nProve address ownership\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${now.toISOString()}`;
  }

  return `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nProve address ownership\n\nURI: ${uri}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${now.toISOString()}\nExpiration Time: ${expirationTime.toISOString()}`;
}
