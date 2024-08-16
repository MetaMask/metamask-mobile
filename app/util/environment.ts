/* eslint-disable import/prefer-default-export */

export const isProduction = (): boolean =>
  // TODO: process.env.NODE_ENV === 'production' doesn't work with tests yet. Once we make it work,
  // we can remove the following line and use the code above instead.
  ({ ...process.env }?.NODE_ENV === 'production');
