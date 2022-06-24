import { Image } from 'react-native';

// eslint-disable-next-line
const foxImage = require('../../../images/fox.png');

// eslint-disable-next-line
export const foxImageUri = Image.resolveAssetSource(foxImage).uri;
