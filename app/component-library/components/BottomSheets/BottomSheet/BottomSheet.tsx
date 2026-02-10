/* eslint-disable react/prop-types */

// Third party dependencies.
import { useNavigation } from '@react-navigation/native';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { BackHandler, KeyboardAvoidingView, Platform } from 'react-native';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// External dependencies.
import { useStyles } from '../../../hooks';

// Internal dependencies.
import styleSheet from './BottomSheet.styles';
import Logger from '../../../../util/Logger';
import {
  BottomSheetProps,
  BottomSheetRef,
  BottomSheetPostCallback,
} from './BottomSheet.types';
import BottomSheetOverlay from './foundation/BottomSheetOverlay/BottomSheetOverlay';
import BottomSheetDialog, {
  BottomSheetDialogRef,
} from './foundation/BottomSheetDialog';

const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  (
    {
      children,
      onClose,
      onOpen,
      style,
      isInteractable = true,
      shouldNavigateBack = true,
      isFullscreen = false,
      keyboardAvoidingViewEnabled = true,
      ...props
    },
    ref,
  ) => {
    const postCallback = useRef<BottomSheetPostCallback>();
    const bottomSheetDialogRef = useRef<BottomSheetDialogRef>(null);
    const didNavigateBackRef = useRef(false);
    const closeRequestedRef = useRef(false);
    const didRunPostCallbackRef = useRef(false);
    const { bottom: screenBottomPadding } = useSafeAreaInsets();
    const { styles } = useStyles(styleSheet, {
      screenBottomPadding,
    });
    const { y: frameY } = useSafeAreaFrame();
    const navigation = useNavigation();

    const onOpenCB = useCallback(() => {
      // Reset when the sheet is opened again.
      didNavigateBackRef.current = false;
      closeRequestedRef.current = false;
      didRunPostCallbackRef.current = false;

      onOpen?.(!!postCallback.current);
      const callback = postCallback.current;
      postCallback.current = undefined;
      callback?.();
    }, [onOpen]);

    const onCloseCB = useCallback(() => {
      if (shouldNavigateBack && !didNavigateBackRef.current) {
        didNavigateBackRef.current = true;
        navigation.goBack();
      } else if (shouldNavigateBack && didNavigateBackRef.current) {
        Logger.log('[BottomSheet] navigation.goBack skipped (duplicate close)');
      }
      const callback = postCallback.current;
      const hasCallback = !!callback;

      onClose?.(hasCallback);

      if (!didRunPostCallbackRef.current && hasCallback) {
        didRunPostCallbackRef.current = true;
        postCallback.current = undefined;
        callback?.();
      }
    }, [navigation, onClose, shouldNavigateBack]);

    // Dismiss the sheet when Android back button is pressed.
    useEffect(() => {
      const hardwareBackPress = () => {
        isInteractable && bottomSheetDialogRef.current?.onCloseDialog();
        return true;
      };
      BackHandler.addEventListener('hardwareBackPress', hardwareBackPress);
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', hardwareBackPress);
      };
    }, [onCloseCB, isInteractable]);

    useImperativeHandle(ref, () => ({
      onCloseBottomSheet: (callback) => {
        if (closeRequestedRef.current) {
          Logger.log(
            '[BottomSheet] onCloseBottomSheet ignored (already closing)',
          );
          return;
        }

        closeRequestedRef.current = true;
        postCallback.current = callback;
        bottomSheetDialogRef.current?.onCloseDialog();
      },
      onOpenBottomSheet: (callback) => {
        // Opening resets close state; allow new close request afterwards.
        didNavigateBackRef.current = false;
        closeRequestedRef.current = false;
        didRunPostCallbackRef.current = false;
        postCallback.current = callback;
        bottomSheetDialogRef.current?.onOpenDialog();
      },
    }));

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? -screenBottomPadding : frameY
        }
        style={styles.base}
        enabled={keyboardAvoidingViewEnabled}
        {...props}
      >
        <BottomSheetOverlay
          disabled={!isInteractable}
          onPress={() => {
            isInteractable && bottomSheetDialogRef.current?.onCloseDialog();
          }}
        />
        <BottomSheetDialog
          isInteractable={isInteractable}
          onClose={onCloseCB}
          onOpen={onOpenCB}
          ref={bottomSheetDialogRef}
          isFullscreen={isFullscreen}
          style={style}
          keyboardAvoidingViewEnabled={keyboardAvoidingViewEnabled}
        >
          {children}
        </BottomSheetDialog>
      </KeyboardAvoidingView>
    );
  },
);

export default BottomSheet;
