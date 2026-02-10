import React, { memo } from 'react';
import { strings } from '../../../../../../../../locales/i18n';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../../../util/theme';
import { PredictMarketStatus, PredictOutcomeToken } from '../../../../types';

export interface PredictMarketDetailsStatusProps {
  winningOutcomeToken: PredictOutcomeToken | undefined;
  multipleOpenOutcomesPartiallyResolved: boolean;
  resolutionStatus: string | undefined;
  marketStatus: PredictMarketStatus | undefined;
}

const PredictMarketDetailsStatus = memo(
  ({
    winningOutcomeToken,
    multipleOpenOutcomesPartiallyResolved,
    resolutionStatus,
    marketStatus,
  }: PredictMarketDetailsStatusProps) => {
    const { colors } = useTheme();

    return (
      <Box twClassName="gap-2">
        <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-2">
          {winningOutcomeToken && !multipleOpenOutcomesPartiallyResolved && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2"
            >
              {resolutionStatus === 'resolved' ? (
                <>
                  <Icon
                    name={IconName.CheckBold}
                    size={IconSize.Md}
                    color={colors.text.alternative}
                  />
                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="font-medium"
                    color={TextColor.TextAlternative}
                  >
                    {strings('predict.market_details.market_resulted_to', {
                      outcome: winningOutcomeToken.title,
                    })}
                  </Text>
                </>
              ) : (
                <>
                  <Icon
                    name={IconName.CheckBold}
                    size={IconSize.Md}
                    color={colors.text.alternative}
                  />
                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="font-medium"
                    color={TextColor.TextAlternative}
                  >
                    {strings('predict.market_details.market_ended_on', {
                      outcome: winningOutcomeToken.title,
                    })}
                  </Text>
                </>
              )}
            </Box>
          )}
          {marketStatus === PredictMarketStatus.CLOSED &&
            resolutionStatus !== 'resolved' && (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-2"
              >
                <Icon
                  name={IconName.Clock}
                  size={IconSize.Md}
                  color={colors.text.default}
                />
                <Text
                  variant={TextVariant.BodyMd}
                  twClassName="font-medium"
                  color={TextColor.TextDefault}
                >
                  {strings(
                    'predict.market_details.waiting_for_final_resolution',
                  )}
                </Text>
              </Box>
            )}
        </Box>
      </Box>
    );
  },
);

PredictMarketDetailsStatus.displayName = 'PredictMarketDetailsStatus';

export default PredictMarketDetailsStatus;
