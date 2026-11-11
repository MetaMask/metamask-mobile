import { GestureResponderEvent, PanResponder } from 'react-native';

interface ChartPanHandlers {
  updatePosition: (pixelX: number) => void;
  setIsChartBeingTouched: (isTouched: boolean) => void;
}

// Module scope: the compiler rejects refs captured by render-time config objects ("Cannot access refs during render").
export const createChartPanResponder = ({
  updatePosition,
  setIsChartBeingTouched,
}: ChartPanHandlers) => {
  const prevTouch = { current: { x: 0, y: 0 } };
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => true,
    onPanResponderGrant: (evt: GestureResponderEvent) => {
      prevTouch.current = {
        x: evt.nativeEvent.locationX,
        y: evt.nativeEvent.locationY,
      };
      updatePosition(evt.nativeEvent.locationX);
    },
    onPanResponderMove: (evt: GestureResponderEvent) => {
      const deltaX = evt.nativeEvent.locationX - prevTouch.current.x;
      const deltaY = evt.nativeEvent.locationY - prevTouch.current.y;
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

      setIsChartBeingTouched(isHorizontalSwipe);
      updatePosition(isHorizontalSwipe ? evt.nativeEvent.locationX : -1);

      prevTouch.current = {
        x: evt.nativeEvent.locationX,
        y: evt.nativeEvent.locationY,
      };
    },

    onPanResponderRelease: () => {
      setIsChartBeingTouched(false);
      updatePosition(-1);
    },
  });
};
