import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BannerAlert from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { createErrorDetailsModalNavigationDetails } from '../../Views/Modals/ErrorDetailsModal/ErrorDetailsModal';
import { strings } from '../../../../../../../locales/i18n';

interface TruncatedErrorProps {
  error: string;
  maxLines?: number;
}

const TruncatedError: React.FC<TruncatedErrorProps> = ({
  error,
  maxLines = 2,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation();

  // Approximate character count for 2 lines (adjust based on your UI)
  const maxCharactersPerLine = 50;
  const maxCharacters = maxLines * maxCharactersPerLine;

  const shouldTruncate = error.length > maxCharacters;
  const displayError = shouldTruncate
    ? `${error.substring(0, maxCharacters)}...`
    : error;

  const handleSeeMore = () => {
    navigation.navigate(
      ...createErrorDetailsModalNavigationDetails({ errorMessage: error }),
    );
  };

  return (
    <View style={tw.style('mb-4')}>
      <BannerAlert
        description={displayError}
        severity={BannerAlertSeverity.Error}
      />
      {shouldTruncate && (
        <TouchableOpacity
          onPress={handleSeeMore}
          style={tw.style('mt-2 self-start')}
        >
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Primary}
            style={tw.style('underline')}
          >
            {strings('deposit.errors.see_more')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default TruncatedError;
