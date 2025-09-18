import React from 'react';
import { View, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BannerAlert from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { createErrorDetailsModalNavigationDetails } from '../../Views/Modals/ErrorDetailsModal/ErrorDetailsModal';
import { strings } from '../../../../../../../locales/i18n';
import styleSheet from './TruncatedError.styles';

interface TruncatedErrorProps {
  error: string;
  maxLines?: number;
}

const TruncatedError: React.FC<TruncatedErrorProps> = ({
  error,
  maxLines = 2,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  const screenWidth = Dimensions.get('window').width;
  const availableWidth = screenWidth - 64;
  const maxCharactersPerLine = Math.floor(availableWidth / 8);
  const maxCharacters = Math.max(50, maxLines * maxCharactersPerLine - 50);

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
    <View style={styles.container}>
      <BannerAlert
        description={
          <View style={styles.textContainer}>
            <Text variant={TextVariant.BodySM} style={styles.errorText}>
              {displayError}
            </Text>
            {shouldTruncate && (
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Primary}
                style={styles.seeMoreText}
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
