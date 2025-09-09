export const getEnvironment = (): 'DEV' | 'PROD' => {
  const env = process.env.NODE_ENV ?? 'production';
  return env === 'production' ? 'PROD' : 'DEV';
};
