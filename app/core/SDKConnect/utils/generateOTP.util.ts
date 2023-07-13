const generateRandomIntegerInRange = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

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
