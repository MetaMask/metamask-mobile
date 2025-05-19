import Crypto from 'react-native-crypto';

global.crypto = {
  ...Crypto,
  ...global.crypto,
};
