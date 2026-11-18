import React from 'react';
import {
  BottomSheetHeader,
  IconName,
  type BottomSheetHeaderProps,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import HeaderBaseGlass from '../HeaderBaseGlass';

export type BottomSheetHeaderGlassProps = BottomSheetHeaderProps & {
  /**
   * The screen's flag. On, back and close render in glass capsules; off, it is
   * the plain MMDS `BottomSheetHeader`.
   *
   * @default true
   */
  isGlass?: boolean;
};

/**
 * MMDS `BottomSheetHeader` with its back and close buttons in glass capsules.
 * It stays in flow, below the sheet's drag handle.
 */
const BottomSheetHeaderGlass = ({
  isGlass = true,
  onBack,
  backButtonProps,
  onClose,
  closeButtonProps,
  style,
  twClassName,
  ...props
}: BottomSheetHeaderGlassProps) => {
  const tw = useTailwind();

  if (!isGlass) {
    return (
      <BottomSheetHeader
        {...props}
        onBack={onBack}
        backButtonProps={backButtonProps}
        onClose={onClose}
        closeButtonProps={closeButtonProps}
        style={style}
        twClassName={twClassName}
      />
    );
  }

  return (
    <HeaderBaseGlass
      {...props}
      isFloating={false}
      style={[tw.style('px-2', twClassName), style]}
      startButtonIconProps={
        onBack
          ? {
              ...backButtonProps,
              iconName: IconName.ArrowLeft,
              onPress: onBack,
            }
          : undefined
      }
      endButtonIconProps={
        onClose
          ? [
              {
                ...closeButtonProps,
                iconName: IconName.Close,
                onPress: onClose,
              },
            ]
          : undefined
      }
    />
  );
};

BottomSheetHeaderGlass.displayName = 'BottomSheetHeaderGlass';

export default BottomSheetHeaderGlass;
