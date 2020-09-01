import { Dimensions, PixelRatio } from 'react-native';

const IPHONE_6_WIDTH = 375;
const IPHONE_6_HEIGHT = 667;

const _getSizes = scaleVertical => {
	const { width, height } = Dimensions.get('window');
	const CURR_WIDTH = width < height ? width : height;
	const CURR_HEIGHT = height > width ? height : width;

	let currSize = CURR_WIDTH;
	let baseScreenSize = IPHONE_6_WIDTH;

	if (scaleVertical) {
		currSize = CURR_HEIGHT;
		baseScreenSize = IPHONE_6_HEIGHT;
	}

	return { currSize, baseScreenSize };
};

const scale = (size, { factor = 1, scaleVertical = false, scaleUp = false, baseSize } = {}) => {
	const { currSize, baseScreenSize } = _getSizes(scaleVertical);
	const sizeScaled = ((baseSize || currSize) / baseScreenSize) * size;

	if (sizeScaled <= size || scaleUp) {
		return PixelRatio.roundToNearestPixel(size + (sizeScaled - size) * factor);
	}

	return size;
};

const scaleVertical = (size, options) => scale(size, { scaleVertical: true, ...options });

export default { scale, scaleVertical, IPHONE_6_WIDTH, IPHONE_6_HEIGHT };
