import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Linking } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';

interface PredictBuyBottomContentProps {
  isInputFocused: boolean;

  hideBorder?: boolean;
  children: React.ReactNode;
}

const PredictBuyBottomContent = ({
  isInputFocused,
  hideBorder = false,
  children,
}: PredictBuyBottomContentProps) => {
  const tw = useTailwind();

  if (isInputFocused) {
    return null;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName={`px-4 pb-0${hideBorder ? '' : ' border-t border-muted'}`}
    >
      <Box justifyContent={BoxJustifyContent.Center} twClassName="gap-2">
        <Box twClassName="w-full">{children}</Box>
        <Box twClassName="text-center items-center justify-center px-1">
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {strings('predict.consent_sheet.disclaimer')}{' '}
            <Text
              variant={TextVariant.BodyXs}
              style={tw.style('text-info-default')}
              onPress={() => {
                Linking.openURL('https://polymarket.com/tos');
              }}
            >
              {strings('predict.consent_sheet.learn_more')}
            </Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default PredictBuyBottomContent;
