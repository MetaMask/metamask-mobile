import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../../locales/i18n';

interface HomepagePredictDiscoveryLivePillProps {
  value?: string | null;
}

const formatLivePillValue = (value: string): string =>
  value.replace(/^([0-9]):([0-9]{2})$/, '0$1:$2');

const HomepagePredictDiscoveryLivePill = ({
  value,
}: HomepagePredictDiscoveryLivePillProps) => {
  const tw = useTailwind();
  const displayValue = value ? formatLivePillValue(value) : undefined;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      backgroundColor={BoxBackgroundColor.BackgroundMuted}
      twClassName="mx-1 h-7 shrink-0 rounded-full px-2"
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        backgroundColor={BoxBackgroundColor.SuccessMuted}
        twClassName="h-4 w-4 shrink-0 rounded-full"
      >
        <Box twClassName="h-2 w-2 rounded-full bg-success-default" />
      </Box>
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextDefault}
        style={tw.style('ml-2 font-medium')}
      >
        {strings('predict.homepage_discovery.btc_live')}
      </Text>
      {displayValue ? (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.SuccessDefault}
          style={tw.style('ml-2 font-medium')}
        >
          {displayValue}
        </Text>
      ) : null}
    </Box>
  );
};

export default HomepagePredictDiscoveryLivePill;
