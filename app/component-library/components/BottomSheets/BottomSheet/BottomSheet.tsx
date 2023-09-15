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
  ({ children, onClose, isInteractable = true, ...props }, ref) => {
    const postCallback = useRef<BottomSheetPostCallback>();
    const bottomSheetDialogRef = useRef<BottomSheetDialogRef>(null);
    const { bottom: screenBottomPadding } = useSafeAreaInsets();
    const { styles } = useStyles(styleSheet, {
      screenBottomPadding,
    });
    const { y: frameY } = useSafeAreaFrame();
    const navigation = useNavigation();

    const onHidden = useCallback(() => {
      navigation.goBack();
      onClose?.(!!postCallback.current);
      postCallback.current?.();
    }, [navigation, onClose]);

    // Dismiss the sheet when Android back button is pressed.
    useEffect(() => {
      const hardwareBackPress = () => {
        isInteractable && bottomSheetDialogRef.current?.closeDialog();
        return true;
      };
      BackHandler.addEventListener('hardwareBackPress', hardwareBackPress);
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', hardwareBackPress);
      };
    }, [onHidden, isInteractable]);

    useImperativeHandle(ref, () => ({
      hide: (callback) => {
        postCallback.current = callback;
        bottomSheetDialogRef.current?.closeDialog();
      },
    }));

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? -screenBottomPadding : frameY
        }
        style={styles.base}
        {...props}
      >
        <BottomSheetOverlay
          disabled={!isInteractable}
          onPress={() => {
            bottomSheetDialogRef.current?.closeDialog();
          }}
        />
        <BottomSheetDialog
          isInteractable={isInteractable}
          onDismissed={onHidden}
          ref={bottomSheetDialogRef}
        >
          {children}
        </BottomSheetDialog>
      </KeyboardAvoidingView>
    );
  },
);

export default BottomSheet;
