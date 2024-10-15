export const success = {
    success: true,
    data: {
        gasFee: '100 Gwei',
    },
};
export const error = {
    error: 'Internal server error',
    message: 'Unable to fetch suggested gas fees.',
};
export const slowResponse = {
    success: true,
    data: {
        gasFee: '150 Gwei',
    },
    delay: 5000, // Simulate delay
};
  