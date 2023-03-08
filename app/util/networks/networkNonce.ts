import { getNetworkNonce } from '.';

interface NetworkNonceProps {
  setNonce: (nonce: number) => void;
  setProposedNonce: (nonce: number) => void;
  from: string;
}

const setNetworkNonce = async ({
  setNonce,
  setProposedNonce,
  from,
}: NetworkNonceProps) => {
  const proposedNonce = await getNetworkNonce({ from });
  setNonce(proposedNonce);
  setProposedNonce(proposedNonce);
};

export default setNetworkNonce;
