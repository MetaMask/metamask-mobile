// eslint-disable-next-line import/no-nodejs-modules
import { Buffer } from 'buffer';

// Helper function to get a random integer in a range using crypto.getRandomValues
const generateRandomIntegerInRange = (min: number, max: number): number => {
  const randomBuffer = Buffer.from(
    global.crypto.getRandomValues(new Uint8Array(4)),
  );
  const randomValue = randomBuffer.readUInt32BE(0);
  return Math.floor((randomValue / 0xffffffff) * (max - min + 1)) + min;
};

/**
 * Generate random otp numbers.
 * The first number array[0] should be the actual otp answer.
 *
 * @returns {array} of the 3 number between 100 and 999
 */
const generateOTP = (): number[] => {
  const n1 = generateRandomIntegerInRange(100, 999);
  const otps = [n1];
  while (otps.length < 3) {
    const n = generateRandomIntegerInRange(100, 999);
    if (otps.indexOf(n) === -1) {
      otps.push(n);
    }
  }
  return otps;
};

export default generateOTP;
