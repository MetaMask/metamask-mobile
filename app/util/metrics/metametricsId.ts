import { bufferToHex, keccak } from 'ethereumjs-util';

export const generateMetametricsId = () => {
  return bufferToHex(
    keccak(
      Buffer.from(
        String(Date.now()) +
          String(Math.round(Math.random() * Number.MAX_SAFE_INTEGER)),
      ),
    ),
  );
};
