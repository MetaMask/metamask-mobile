import { Dimensions, PixelRatio, ScaledSize } from 'react-native';

//baseModel 0
const IPHONE_6_WIDTH = 375;
const IPHONE_6_HEIGHT = 667;

//baseModel 1
const IPHONE_11_PRO_WIDTH = 375;
const IPHONE_11_PRO_HEIGHT = 812;

//baseModel 2
const IPHONE_11_PRO_MAX_WIDTH = 414;
const IPHONE_11_PRO_MAX_HEIGHT = 896;

interface BaseModelDimensions {
  width: number;
  height: number;
}

const getBaseModel = (baseModel: number): BaseModelDimensions => {
  if (baseModel === 1) {
    return { width: IPHONE_11_PRO_WIDTH, height: IPHONE_11_PRO_HEIGHT };
  } else if (baseModel === 2) {
    return { width: IPHONE_11_PRO_MAX_WIDTH, height: IPHONE_11_PRO_MAX_HEIGHT };
  }

  return { width: IPHONE_6_WIDTH, height: IPHONE_6_HEIGHT };
};

interface Sizes {
  currSize: number;
  baseScreenSize: number;
}

const _getSizes = (scaleVertical: boolean, baseModel: number): Sizes => {
  const { width, height }: ScaledSize = Dimensions.get('window');
  const CURR_WIDTH = width < height ? width : height;
  const CURR_HEIGHT = height > width ? height : width;

  let currSize = CURR_WIDTH;
  let baseScreenSize = getBaseModel(baseModel).width;

  if (scaleVertical) {
    currSize = CURR_HEIGHT;
    baseScreenSize = getBaseModel(baseModel).height;
  }

  return { currSize, baseScreenSize };
};

interface ScaleOptions {
  factor?: number;
  scaleVertical?: boolean;
  scaleUp?: boolean;
  baseSize?: number;
  baseModel: number;
}

const scale = (
  size: number,
  {
    factor = 1,
    scaleVertical = false,
    scaleUp = false,
    baseSize,
    baseModel,
  }: ScaleOptions = {} as ScaleOptions,
): number => {
  const { currSize, baseScreenSize } = _getSizes(scaleVertical, baseModel ?? 0);
  const sizeScaled = ((baseSize || currSize) / baseScreenSize) * size;

  if (sizeScaled <= size || scaleUp) {
    return PixelRatio.roundToNearestPixel(size + (sizeScaled - size) * factor);
  }

  return size;
};

const scaleVertical = (size: number, options: Partial<ScaleOptions> = {}): number =>
  scale(size, { scaleVertical: true, baseModel: options.baseModel ?? 0, ...options });

export default { scale, scaleVertical, IPHONE_6_WIDTH, IPHONE_6_HEIGHT };
