/* eslint-disable react/prop-types */

// Third party dependencies.
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
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
import { RootStackParamList } from '../../../../constants/navigation/Params';

// Internal dependencies.
import styleSheet from './BottomSheet.styles';
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
    const { bottom: screenBottomPadding } = useSafeAreaInsets();
    const { styles } = useStyles(styleSheet, {
      screenBottomPadding,
    });
    const { y: frameY } = useSafeAreaFrame();
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

    const onOpenCB = useCallback(() => {
      onOpen?.(!!postCallback.current);
      postCallback.current?.();
    }, [onOpen]);

    const onCloseCB = useCallback(() => {
      shouldNavigateBack && navigation.goBack();
      onClose?.(!!postCallback.current);
      postCallback.current?.();
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
        postCallback.current = callback;
        bottomSheetDialogRef.current?.onCloseDialog();
      },
      onOpenBottomSheet: (callback) => {
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
