import React, { useCallback } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { createErrorDetailsModalNavDetails } from '../../Views/Modals/ErrorDetailsModal/ErrorDetailsModal';

interface TruncatedErrorProps {
  error: string;
  errorDetails?: string;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});

const TruncatedError: React.FC<TruncatedErrorProps> = ({
  error,
  errorDetails,
}) => {
  const navigation = useNavigation();

  const handleInfoPress = useCallback(() => {
    if (errorDetails) {
      navigation.navigate(
        ...createErrorDetailsModalNavDetails({ errorMessage: errorDetails }),
      );
    }
  }, [errorDetails, navigation]);

  return (
    <View style={styles.container}>
      <Text variant={TextVariant.BodySM} color={TextColor.Error}>
        {error}
      </Text>
      {errorDetails ? (
        <TouchableOpacity
          onPress={handleInfoPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="View error details"
        >
          <Icon
            name={IconName.Info}
            size={IconSize.Sm}
            color={IconColor.Error}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default TruncatedError;
