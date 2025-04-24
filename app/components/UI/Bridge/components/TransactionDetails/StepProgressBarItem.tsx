import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import PulsingCircle from './PulsingCircle';
import { StatusTypes } from '@metamask/bridge-status-controller';
import { Box } from '../../../Box/Box';
import { AlignItems, FlexDirection } from '../../../Box/box.types';
import { Theme } from '@metamask/design-tokens';
import { useStyles } from '../../../../../component-library/hooks';

const ICON_SIZE = IconSize.Xs;

const styleSheet = (params: { theme: Theme, vars: { color: IconColor } }) => {
  let lineColor = params.theme.colors.primary.default;
  if (params.vars.color === IconColor.Muted) {
    lineColor = params.theme.colors.icon.muted;
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
    filledCircle: {
      marginLeft: 1,
      width: Number(ICON_SIZE) - 2,
      height: Number(ICON_SIZE) - 2,
      backgroundColor: params.theme.colors.primary.default,
      borderRadius: (Number(ICON_SIZE) - 2) / 2,
    },
  });
};

const VerticalLine = ({ color }: { color: IconColor }) => {
  const { styles } = useStyles(styleSheet, { color });

  return <View style={styles.verticalLine} />;
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
  const { styles } = useStyles(styleSheet, { color: IconColor.Primary });

  return (
    <>
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={2}
      >
        {/* Indicator dots */}
        {(stepStatus === null || stepStatus === StatusTypes.UNKNOWN) && (
          <Icon
            name={IconName.FullCircle}
            color={IconColor.Muted}
            size={ICON_SIZE}
          />
        )}
        {stepStatus === StatusTypes.PENDING && (
          <PulsingCircle color={IconColor.Primary} />
        )}
        {stepStatus === StatusTypes.COMPLETE && (
          <View style={styles.filledCircle} />
        )}

        {/* Description */}
        {children}
      </Box>
      {/* Line */}
      {!isLastItem && (
        <VerticalLine
          color={isEdgeComplete ? IconColor.Primary : IconColor.Muted}
        />
      )}

      {/* Blank div to take up space to make sure everything is aligned */}
      {!isLastItem && <View />}
    </>
  );
}
