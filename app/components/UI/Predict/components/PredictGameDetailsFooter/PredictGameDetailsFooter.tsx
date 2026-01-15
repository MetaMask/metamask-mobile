import React, { useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { formatVolume } from '../../utils/format';
import { usePredictBottomSheet } from '../../hooks/usePredictBottomSheet';
import { PredictActionButtons } from '../PredictActionButtons';
import PredictGameAboutSheet from './PredictGameAboutSheet';
import { PredictGameDetailsFooterProps } from './PredictGameDetailsFooter.types';

const PredictGameDetailsFooter: React.FC<PredictGameDetailsFooterProps> = ({
  market,
  outcome,
  onBetPress,
  onClaimPress,
  hasClaimableWinnings = false,
  claimableAmount = 0,
  isLoading = false,
  testID = 'predict-game-details-footer',
}) => {
  const insets = useSafeAreaInsets();

  const { sheetRef, isVisible, handleSheetClosed, getRefHandlers } =
    usePredictBottomSheet();

  const sheetHandlers = useMemo(() => getRefHandlers(), [getRefHandlers]);

  const handleInfoPress = useCallback(() => {
    sheetHandlers.onOpenBottomSheet();
  }, [sheetHandlers]);

  const formattedVolume = useMemo(
    () => formatVolume(market.volume ?? 0),
    [market.volume],
  );

  return (
    <Box
      twClassName="px-4 pt-3 bg-default border-t border-muted"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      testID={testID}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="mb-2"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={`${testID}-label`}
          >
            {strings('predict.game_details_footer.pick_a_winner')}
          </Text>
          <ButtonIcon
            size={ButtonIconSize.Sm}
            iconProps={{ color: IconColor.IconAlternative }}
            iconName={IconName.Info}
            onPress={handleInfoPress}
            testID={`${testID}-info-button`}
          />
        </Box>

        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={`${testID}-volume`}
        >
          {strings('predict.game_details_footer.volume_display', {
            volume: formattedVolume,
          })}
        </Text>
      </Box>

      <PredictActionButtons
        market={market}
        outcome={outcome}
        onBetPress={onBetPress}
        onClaimPress={onClaimPress}
        hasClaimableWinnings={hasClaimableWinnings}
        claimableAmount={claimableAmount}
        isLoading={isLoading}
        testID={`${testID}-action-buttons`}
      />

      {isVisible && (
        <PredictGameAboutSheet
          ref={sheetRef}
          description={market.description ?? ''}
          onClose={handleSheetClosed}
        />
      )}
    </Box>
  );
};

export default PredictGameDetailsFooter;
