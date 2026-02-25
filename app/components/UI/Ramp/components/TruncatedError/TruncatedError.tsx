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
  maxLines?: number;
  providerName?: string;
  providerSupportUrl?: string;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  text: {
    flexShrink: 1,
  },
});

const TruncatedError: React.FC<TruncatedErrorProps> = ({
  error,
  maxLines = 1,
  providerName,
  providerSupportUrl,
}) => {
  const navigation = useNavigation();

  const handleInfoPress = useCallback(() => {
    navigation.navigate(
      ...createErrorDetailsModalNavDetails({
        errorMessage: error,
        providerName,
        providerSupportUrl,
      }),
    );
  }, [error, navigation, providerName, providerSupportUrl]);

  return (
    <View style={styles.container}>
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Error}
        numberOfLines={maxLines}
        ellipsizeMode="tail"
        style={styles.text}
      >
        {error}
      </Text>
      <TouchableOpacity
        onPress={handleInfoPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="View error details"
      >
        <Icon name={IconName.Info} size={IconSize.Sm} color={IconColor.Error} />
      </TouchableOpacity>
    </View>
  );
};

export default TruncatedError;
