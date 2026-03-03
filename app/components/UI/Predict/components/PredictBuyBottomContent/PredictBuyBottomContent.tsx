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
import { strings } from '../../../../../../locales/i18n';

interface PredictBuyBottomContentProps {
  isInputFocused: boolean;
  errorMessage?: string;
  children: React.ReactNode;
}

const PredictBuyBottomContent = ({
  isInputFocused,
  errorMessage,
  children,
}: PredictBuyBottomContentProps) => {
  const tw = useTailwind();

  if (isInputFocused) {
    return null;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName="border-t border-muted p-4 pb-0 gap-4"
    >
      <Box justifyContent={BoxJustifyContent.Center} twClassName="gap-2">
        {errorMessage && (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            style={tw.style('text-center pb-2')}
          >
            {errorMessage}
          </Text>
        )}
        <Box twClassName="w-full h-12">{children}</Box>
        <Box twClassName="text-center items-center flex-row gap-1 justify-center">
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {strings('predict.consent_sheet.disclaimer')}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            style={tw.style('text-info-default')}
            onPress={() => {
              Linking.openURL('https://polymarket.com/tos');
            }}
          >
            {strings('predict.consent_sheet.learn_more')}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default PredictBuyBottomContent;
