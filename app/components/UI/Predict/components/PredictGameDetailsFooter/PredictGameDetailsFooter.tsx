import React, { useMemo } from 'react';
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
import { PredictActionButtons } from '../PredictActionButtons';
import { PredictGameDetailsFooterProps } from './PredictGameDetailsFooter.types';
import {
  PREDICT_GAME_DETAILS_FOOTER,
  PREDICT_GAME_DETAILS_FOOTER_TEST_IDS,
} from './PredictGameDetailsFooter.testIds';

const PredictGameDetailsFooter: React.FC<PredictGameDetailsFooterProps> = ({
  market,
  outcome,
  onBetPress,
  onClaimPress,
  onInfoPress,
  claimableAmount = 0,
  isLoading = false,
  isClaimPending = false,
  testID = PREDICT_GAME_DETAILS_FOOTER,
}) => {
  const insets = useSafeAreaInsets();
  const formattedVolume = useMemo(
    () => formatVolume(market.volume ?? 0),
    [market.volume],
  );

  const isMarketClosed =
    market.status !== 'open' || market.game?.status === 'ended';
  const hasClaimableWinnings = claimableAmount > 0;
  const showClaimButton = hasClaimableWinnings && onClaimPress;

  if (isMarketClosed && !hasClaimableWinnings) {
    return null;
  }

  const content = (
    <Box
      twClassName={'px-4 pt-3 border-t border-muted'}
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      testID={testID}
    >
      {!showClaimButton && (
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
              testID={`${testID}${PREDICT_GAME_DETAILS_FOOTER_TEST_IDS.LABEL}`}
            >
              {strings('predict.game_details_footer.pick_a_winner')}
            </Text>
            <ButtonIcon
              size={ButtonIconSize.Sm}
              iconProps={{ color: IconColor.IconAlternative }}
              iconName={IconName.Info}
              onPress={onInfoPress}
              testID={`${testID}${PREDICT_GAME_DETAILS_FOOTER_TEST_IDS.INFO_BUTTON}`}
            />
          </Box>

          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={`${testID}${PREDICT_GAME_DETAILS_FOOTER_TEST_IDS.VOLUME}`}
          >
            {strings('predict.game_details_footer.volume_display', {
              volume: formattedVolume,
            })}
          </Text>
        </Box>
      )}

      <PredictActionButtons
        market={market}
        outcome={outcome}
        onBetPress={onBetPress}
        onClaimPress={onClaimPress}
        claimableAmount={claimableAmount}
        isLoading={isLoading}
        isClaimPending={isClaimPending}
        testID={`${testID}${PREDICT_GAME_DETAILS_FOOTER_TEST_IDS.ACTION_BUTTONS}`}
      />
    </Box>
  );

  return content;
};

export default PredictGameDetailsFooter;
