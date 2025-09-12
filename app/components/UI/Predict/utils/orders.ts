/**
 * Generates a unique order ID as a random string
 * @returns A unique order ID string
 */
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const additionalRandom = Math.random().toString(36).substring(2, 15);

  return `${timestamp}-${randomPart}-${additionalRandom}`;
}
