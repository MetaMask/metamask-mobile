import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  type ButtonIconProps,
} from '@metamask/design-system-react-native';
import ButtonIconGlass from '../../../../../../component-library/components-temp/ButtonIconGlass';
import CapsuleGlass, {
  CAPSULE_ITEM_HIT_SLOP,
} from '../../../../../../component-library/components-temp/CapsuleGlass';
import {
  KalshiDebugPanel,
  KalshiDebugTestIds,
} from '../../../onboarding/KalshiDebugPanel';
import {
  PredictVenueSelectorButton,
  useIsVenueSelectorShown,
} from '../../../venueSelection';
import { PredictHomeTestIds } from '../PredictHome.testIds';
import { strings } from '../../../../../../../locales/i18n';

interface HomeHeaderActionsProps {
  /** `glass` groups the icons in one capsule; `standard` is plain icons. */
  variant: 'standard' | 'glass';
  /** Opens Search; omitted when the Venue does not support search. */
  onSearch?: () => void;
}

const searchButtonProps = (onSearch: () => void): ButtonIconProps => ({
  size: ButtonIconSize.Md,
  iconName: IconName.Search,
  onPress: onSearch,
  testID: PredictHomeTestIds.SEARCH,
  accessibilityLabel: strings('predict_next.search.placeholder'),
  accessibilityRole: 'button',
});

const debugButtonProps = (open: () => void): ButtonIconProps => ({
  size: ButtonIconSize.Md,
  iconName: IconName.Flask,
  onPress: open,
  testID: KalshiDebugTestIds.OPEN,
  accessibilityLabel: 'User debug',
  accessibilityRole: 'button',
});

/*
 * TEMPORARY: Kalshi demo onboarding debug. Self-gates on a development build
 * with Kalshi authentication on. Remove with the demo onboarding.
 */
const DebugTrigger = ({
  variant,
}: {
  variant: 'standard' | 'grouped' | 'own-capsule';
}) => (
  <KalshiDebugPanel
    renderTrigger={(open) => {
      switch (variant) {
        case 'grouped':
          return (
            <ButtonIcon
              {...debugButtonProps(open)}
              hitSlop={CAPSULE_ITEM_HIT_SLOP}
            />
          );
        case 'own-capsule':
          return <ButtonIconGlass isCapsule {...debugButtonProps(open)} />;
        default:
          return <ButtonIcon {...debugButtonProps(open)} />;
      }
    }}
  />
);

/**
 * Home's end header icons: the venue selector, Search and, in development
 * builds, the debug trigger. With glass they share one capsule, which keeps a
 * capsule's padding even around a single icon. Each keeps its own tap target.
 */
export const HomeHeaderActions = ({
  variant,
  onSearch,
}: HomeHeaderActionsProps) => {
  const isVenueSelectorShown = useIsVenueSelectorShown();

  if (variant === 'standard') {
    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        <PredictVenueSelectorButton variant="standard" />
        {onSearch ? <ButtonIcon {...searchButtonProps(onSearch)} /> : null}
        <DebugTrigger variant="standard" />
      </Box>
    );
  }

  // The debug trigger alone has nothing to group with, so it keeps its own
  // round capsule rather than an otherwise empty group.
  if (!isVenueSelectorShown && !onSearch) {
    return <DebugTrigger variant="own-capsule" />;
  }

  return (
    <CapsuleGlass
      twClassName="gap-1 px-2"
      testID={PredictHomeTestIds.HEADER_ACTIONS}
    >
      <PredictVenueSelectorButton variant="glass-group" />
      {onSearch ? (
        <ButtonIcon
          {...searchButtonProps(onSearch)}
          hitSlop={CAPSULE_ITEM_HIT_SLOP}
        />
      ) : null}
      <DebugTrigger variant="grouped" />
    </CapsuleGlass>
  );
};
