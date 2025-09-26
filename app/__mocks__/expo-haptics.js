// mock expo-haptics for testing

export const impactAsync = jest.fn().mockResolvedValue(undefined);
export const notificationAsync = jest.fn().mockResolvedValue(undefined);
export const selectionAsync = jest.fn().mockResolvedValue(undefined);

export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
  Rigid: 'rigid',
  Soft: 'soft',
};

export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
};

export const AndroidHaptics = {
  Clock_Tick: 'clock-tick',
  Confirm: 'confirm',
  Context_Click: 'context-click',
  Drag_Start: 'drag-start',
  Gesture_End: 'gesture-end',
  Gesture_Start: 'gesture-start',
  Keyboard_Press: 'keyboard-press',
  Keyboard_Release: 'keyboard-release',
  Keyboard_Tap: 'keyboard-tap',
  Long_Press: 'long-press',
  No_Haptics: 'no-haptics',
  Reject: 'reject',
  Segment_Frequent_Tick: 'segment-frequent-tick',
  Segment_Tick: 'segment-tick',
  Text_Handle_Move: 'text-handle-move',
  Toggle_Off: 'toggle-off',
  Toggle_On: 'toggle-on',
  Virtual_Key: 'virtual-key',
  Virtual_Key_Release: 'virtual-key-release',
};

// Default export for namespace imports
export default {
  impactAsync,
  notificationAsync,
  selectionAsync,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  AndroidHaptics,
};
