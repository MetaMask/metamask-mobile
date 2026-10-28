import { IconColor } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Phosphor seal-percent, the promo mark from the fee-discount designs.
 * Slots are 12px (Lite caption), 16px (fee row), and 24px (fees sheet).
 */
export const SEAL_PERCENT_ICON_SIZE = {
  caption: 12,
  feeRow: 16,
  banner: 24,
} as const;

const SEAL_PERCENT_PATH =
  'M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.73,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.27,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-11.55,39.29c-4.79,5-9.75,10.17-12.38,16.52-2.52,6.1-2.63,13.07-2.73,19.82-.1,7-.21,14.33-3.32,17.43s-10.39,3.22-17.43,3.32c-6.75.1-13.72.21-19.82,2.73-6.35,2.63-11.52,7.59-16.52,12.38S132,224,128,224s-9.15-4.92-14.11-9.69-10.17-9.75-16.52-12.38c-6.1-2.52-13.07-2.63-19.82-2.73-7-.1-14.33-.21-17.43-3.32s-3.22-10.39-3.32-17.43c-.1-6.75-.21-13.72-2.73-19.82-2.63-6.35-7.59-11.52-12.38-16.52S32,132,32,128s4.92-9.14,9.69-14.11,9.75-10.17,12.38-16.52c2.52-6.1,2.63-13.07,2.73-19.82.1-7,.21-14.33,3.32-17.43S70.51,56.9,77.55,56.8c6.75-.1,13.72-.21,19.82-2.73,6.35-2.63,11.52-7.59,16.52-12.38S124,32,128,32s9.15,4.92,14.11,9.69,10.17,9.75,16.52,12.38c6.1,2.52,13.07,2.63,19.82,2.73,7,.1,14.33.21,17.43,3.32s3.22,10.39,3.32,17.43c.1,6.75.21,13.72,2.73,19.82,2.63,6.35,7.59,11.52,12.38,16.52S224,124,224,128,219.08,137.14,214.31,142.11ZM120,96a24,24,0,1,0-24,24A24,24,0,0,0,120,96ZM88,96a8,8,0,1,1,8,8A8,8,0,0,1,88,96Zm72,40a24,24,0,1,0,24,24A24,24,0,0,0,160,136Zm0,32a8,8,0,1,1,8-8A8,8,0,0,1,160,168Zm13.66-74.34-80,80a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,11.32Z';

interface SealPercentIconProps {
  size: number;
  testID?: string;
  /**
   * Spoken name when this icon is the only indication of a promo.
   * Leave unset when adjacent text already describes the discount so the
   * icon stays decorative.
   */
  accessibilityLabel?: string;
  /**
   * Design-system icon color. Defaults to `IconDefault`, which matches
   * `TextDefault` (the fees-sheet title). Form rows pass `IconAlternative`,
   * the same grey as `TextAlternative` in light and dark themes.
   */
  color?: IconColor;
}

const SealPercentIcon = ({
  size,
  testID,
  accessibilityLabel,
  color = IconColor.IconDefault,
}: SealPercentIconProps) => {
  const tw = useTailwind();
  // react-native-svg paints `currentColor` from the root `color` style.
  // A hex `fill` on the path is dropped when the root also sets `fill="none"`,
  // which left these stamps white beside gray text.
  const iconStyle = StyleSheet.flatten(tw.style(color));
  const isInformative = Boolean(accessibilityLabel);

  return (
    <View
      testID={testID}
      collapsable={false}
      accessible={isInformative}
      accessibilityRole={isInformative ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={isInformative ? 'yes' : 'no'}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 256 256"
        fill="currentColor"
        color={iconStyle.color}
        style={iconStyle}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Path d={SEAL_PERCENT_PATH} fill="currentColor" />
      </Svg>
    </View>
  );
};

export default SealPercentIcon;
