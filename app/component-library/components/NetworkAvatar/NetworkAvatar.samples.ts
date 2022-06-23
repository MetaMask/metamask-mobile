import { Image } from 'react-native';

// eslint-disable-next-line
const networkImage = require('../../../images/eth-logo.png');

// eslint-disable-next-line
export const imageUrl = Image.resolveAssetSource(networkImage).uri;
