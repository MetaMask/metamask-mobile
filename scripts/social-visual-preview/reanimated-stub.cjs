const { View } = require('react-native');

const easeFn = () => 0;
const Easing = {
  linear: easeFn,
  ease: easeFn,
  quad: easeFn,
  cubic: easeFn,
  sin: easeFn,
  circle: easeFn,
  exp: easeFn,
  poly: () => easeFn,
  bezier: () => easeFn,
  out: () => easeFn,
  in: () => easeFn,
  inOut: () => easeFn,
};

const identity = (value) => value;
const useSharedValue = (value) => ({ value });
const useAnimatedStyle = (updater) => {
  try {
    return typeof updater === 'function' ? updater() : {};
  } catch {
    return {};
  }
};
const useDerivedValue = (updater) => ({
  value: typeof updater === 'function' ? updater() : updater,
});
const useAnimatedScrollHandler = () => () => undefined;
const useAnimatedReaction = () => undefined;
const withTiming = identity;
const withSpring = identity;
const withRepeat = identity;
const withSequence = (...values) => values[values.length - 1];
const withDelay = (_delay, value) => value;
const cancelAnimation = () => undefined;
const runOnJS = (fn) => fn;
const interpolate = identity;
const interpolateColor = () => 'transparent';
const ReduceMotion = { System: 'system' };
const createAnimatedComponent = (component) => component;

const Animated = {
  View,
  ScrollView: View,
  Text: View,
  Image: View,
  createAnimatedComponent,
};

module.exports = Animated;
module.exports.default = Animated;
module.exports.Animated = Animated;
module.exports.Easing = Easing;
module.exports.ReduceMotion = ReduceMotion;
module.exports.useSharedValue = useSharedValue;
module.exports.useAnimatedStyle = useAnimatedStyle;
module.exports.useDerivedValue = useDerivedValue;
module.exports.useAnimatedScrollHandler = useAnimatedScrollHandler;
module.exports.useAnimatedReaction = useAnimatedReaction;
module.exports.withTiming = withTiming;
module.exports.withSpring = withSpring;
module.exports.withRepeat = withRepeat;
module.exports.withSequence = withSequence;
module.exports.withDelay = withDelay;
module.exports.cancelAnimation = cancelAnimation;
module.exports.runOnJS = runOnJS;
module.exports.interpolate = interpolate;
module.exports.interpolateColor = interpolateColor;
module.exports.createAnimatedComponent = createAnimatedComponent;
