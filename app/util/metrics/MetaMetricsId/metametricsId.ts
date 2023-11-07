import { bufferToHex, keccak } from 'ethereumjs-util';

const generateMetametricsId = () =>
  bufferToHex(
    keccak(
      Buffer.from(
        String(Date.now()) +
          String(Math.round(Math.random() * Number.MAX_SAFE_INTEGER)),
      ),
    ),
  );

export default generateMetametricsId;
