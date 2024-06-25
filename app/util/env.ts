const NODE_ENV = 'NODE_ENV';

// eslint-disable-next-line import/prefer-default-export
export const isDevelopment = () => process.env[NODE_ENV] === 'development';
