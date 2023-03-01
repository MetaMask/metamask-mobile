import { getNetworkNonce } from '.';

interface NetworkNonceProps {
  setNonce: (nonce: number) => void;
  setProposedNonce: (nonce: number) => void;
  transaction: any;
}

const NetworkNonce = async ({
  setNonce,
  setProposedNonce,
  transaction,
}: NetworkNonceProps) => {
  const proposedNonce = await getNetworkNonce(transaction);
  setNonce(proposedNonce);
  setProposedNonce(proposedNonce);
};

export default NetworkNonce;
