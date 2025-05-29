// eslint-disable-next-line import/no-nodejs-modules
import Crypto from 'crypto';

global.crypto = {
  ...Crypto,
  ...global.crypto,
};
