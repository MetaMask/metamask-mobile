import React, { useCallback } from 'react';
import { Linking } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

interface FirstPredictOnUsLegalFooterProps {
  regionText?: string;
  termsText?: string;
  termsUrl: string | null;
}

const FirstPredictOnUsLegalFooter: React.FC<
  FirstPredictOnUsLegalFooterProps
> = ({ regionText = '', termsText = '', termsUrl }) => {
  const openTerms = useCallback(() => {
    if (!termsUrl) {
      return;
    }

    Linking.openURL(termsUrl);
  }, [termsUrl]);

  if (!regionText && !termsText) {
    return null;
  }

  return (
    <Box
      testID="first-predict-on-us-splash-legal-footer"
      twClassName="flex-row flex-wrap items-center justify-center"
    >
      {regionText ? (
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {regionText}
          {termsText ? ' ' : ''}
        </Text>
      ) : null}
      <Text
        testID="first-predict-on-us-splash-terms-link"
        variant={TextVariant.BodyXs}
        twClassName="text-primary-default"
        onPress={termsUrl ? openTerms : undefined}
      >
        {termsText}
      </Text>
    </Box>
  );
};

export default FirstPredictOnUsLegalFooter;
