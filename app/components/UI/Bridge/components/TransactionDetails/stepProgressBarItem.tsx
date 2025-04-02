import React from 'react';
import Icon, { IconColor, IconName, IconSize } from '../../../../../component-library/components/Icons/Icon';
import HollowCircle from './hollow-circle';
import PulsingCircle from './pulsing-circle';
import { StatusTypes } from '@metamask/bridge-status-controller';

const ICON_SIZE = IconSize.Xs;

const VerticalLine = ({ color }: { color: IconColor }) => (
  <div
    style={{
      height: '60px',
      marginTop: '-1rem',
      marginBottom: '-1rem',
      width: '1px',
      backgroundColor: `var(--color-${color})`,
      zIndex: 0.1,
    }}
  />
);

type StepsProgressBarItemProps = {
  stepStatus: StatusTypes | null;
  isLastItem: boolean;
  isEdgeComplete: boolean;
  children: React.ReactNode;
};

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
      {/* Indicator dots */}
      {(stepStatus === null || stepStatus === StatusTypes.UNKNOWN) && (
        <HollowCircle size={ICON_SIZE} color={IconColor.Muted} />
      )}
      {stepStatus === StatusTypes.PENDING && (
        <PulsingCircle iconSize={ICON_SIZE} color={IconColor.Primary} />
      )}
      {stepStatus === StatusTypes.COMPLETE && (
        <Icon
          name={IconName.FullCircle}
          color={IconColor.Primary}
          size={ICON_SIZE}
        />
      )}

      {/* Description */}
      {children}

      {/* Line */}
      {!isLastItem && (
        <VerticalLine
          color={
            isEdgeComplete ? IconColor.Primary : IconColor.Muted
          }
        />
      )}

      {/* Blank div to take up space to make sure everything is aligned */}
      {!isLastItem && <div />}
    </>
  );
}
