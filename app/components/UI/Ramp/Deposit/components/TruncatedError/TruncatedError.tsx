import React from 'react';
import { View, Dimensions } from 'react-native';
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

  // Calculate characters per line based on screen width
  // Assuming average character width of ~8px and accounting for padding/margins
  const screenWidth = Dimensions.get('window').width;
  const availableWidth = screenWidth - 64; // Account for horizontal padding/margins
  const maxCharactersPerLine = Math.floor(availableWidth / 8);
  const maxCharacters = Math.max(50, maxLines * maxCharactersPerLine - 50); // Reduce by 50 chars, minimum 50

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
    <View style={tw.style('mb-2 w-full')}>
      <BannerAlert
        description={
          <View style={tw.style('flex-row flex-wrap items-center')}>
            <Text variant={TextVariant.BodySM} style={tw.style('flex-1')}>
              {displayError}
            </Text>
            {shouldTruncate && (
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Primary}
                style={tw.style('underline ml-1')}
                onPress={handleSeeMore}
              >
                {strings('deposit.errors.see_more')}
              </Text>
            )}
          </View>
        }
        severity={BannerAlertSeverity.Error}
      />
    </View>
  );
};

export default TruncatedError;
