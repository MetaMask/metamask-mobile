import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon, { IconColor, IconName, IconSize } from '../../../../../component-library/components/Icons/Icon';
import HollowCircle from './HollowCircle';
import PulsingCircle from './PulsingCircle';
import { StatusTypes } from '@metamask/bridge-status-controller';
import { useTheme } from '../../../../../util/theme';
import { Box } from '../../../Box/Box';
import { AlignItems, FlexDirection } from '../../../Box/box.types';
import { ThemeColors } from '@metamask/design-tokens';

const ICON_SIZE = IconSize.Xs;

const createStyles = (colors: ThemeColors, color?: IconColor) => {
  let lineColor = colors.primary.default;
  if (color === IconColor.Muted) {
    lineColor = colors.icon.muted;
  }

  return StyleSheet.create({
    verticalLine: {
      height: 30,
      marginTop: -7,
      marginBottom: -7,
      marginLeft: 5.2,
      width: 1,
      backgroundColor: lineColor,
      zIndex: 0.1,
    },
  });
};

const VerticalLine = ({ color }: { color: IconColor }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors, color);

  return (
    <View
      style={styles.verticalLine}
    />
  );
};

interface StepsProgressBarItemProps {
  stepStatus: StatusTypes | null;
  isLastItem: boolean;
  isEdgeComplete: boolean;
  children: React.ReactNode;
}

/**
 * Renders the steps in the Bridge Transaction Details page
 *
 * @param options
 * @param options.stepStatus - The status of the step
 * @param options.isLastItem - Whether the step is the last item
 * @param options.isEdgeComplete - Whether the edge is complete
 * @param options.children - The description of the step to be rendered
 */
export default function StepProgressBarItem({
  stepStatus,
  isLastItem,
  isEdgeComplete,
  children,
}: StepsProgressBarItemProps) {
  return (
    <>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={2}
      >
        {/* Indicator dots */}
        {(stepStatus === null || stepStatus === StatusTypes.UNKNOWN) && (
          <HollowCircle color={IconColor.Muted} />
        )}
        {stepStatus === StatusTypes.PENDING && (
          <PulsingCircle color={IconColor.Primary} />
        )}
        {stepStatus === StatusTypes.COMPLETE && (
          <Icon
            name={IconName.FilledCircle}
            color={IconColor.Primary}
            size={ICON_SIZE}
          />
        )}

        {/* Description */}
        {children}
      </Box>
      {/* Line */}
      {!isLastItem && (
        <VerticalLine
          color={
            isEdgeComplete ? IconColor.Primary : IconColor.Muted
          }
        />
      )}

      {/* Blank div to take up space to make sure everything is aligned */}
      {!isLastItem && <View />}
    </>
  );
}
