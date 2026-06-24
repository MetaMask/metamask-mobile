import React, { useState, useCallback } from 'react';
import { NativeSyntheticEvent, View, TextLayoutEventData } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BannerAlert from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import { createErrorDetailsModalNavigationDetails } from '../../Views/Modals/ErrorDetailsModal/ErrorDetailsModal';
import { strings } from '../../../../../../../locales/i18n';
import styleSheet from './TruncatedError.styles';
import { ButtonVariants } from '../../../../../../component-library/components/Buttons/Button';

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
  const [isTruncated, setIsTruncated] = useState(false);

  const handleTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      const { lines } = event.nativeEvent;
      setIsTruncated(
        lines.length === maxLines &&
          lines[lines.length - 1].text.length > lines[0].text.length,
      );
    },
    [maxLines],
  );

  const handleSeeMore = useCallback(() => {
    navigation.navigate(
      ...createErrorDetailsModalNavigationDetails({ errorMessage: error }),
    );
  }, [error, navigation]);

  return (
    <View style={styles.container}>
      <BannerAlert
        description={
          <Text
            variant={TextVariant.BodySM}
            numberOfLines={maxLines}
            ellipsizeMode="tail"
            onTextLayout={handleTextLayout}
          >
            {error}
          </Text>
        }
        actionButtonProps={
          isTruncated
            ? {
                variant: ButtonVariants.Link,
                label: strings('deposit.errors.see_more'),
                labelTextVariant: TextVariant.BodySM,
                onPress: handleSeeMore,
              }
            : undefined
        }
        severity={BannerAlertSeverity.Error}
      />
    </View>
  );
};

export default TruncatedError;
