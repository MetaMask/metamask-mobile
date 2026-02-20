import React, { useState, useCallback } from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';
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
  maxLines = 2,
}) => {
  const navigation = useNavigation();
  const [isTruncated, setIsTruncated] = useState(false);

  const handleTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      const { lines } = event.nativeEvent;
      setIsTruncated(lines.length >= maxLines);
    },
    [maxLines],
  );

  const handleInfoPress = useCallback(() => {
    navigation.navigate(
      ...createErrorDetailsModalNavDetails({ errorMessage: error }),
    );
  }, [error, navigation]);

  return (
    <View style={styles.container}>
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Error}
        numberOfLines={maxLines}
        ellipsizeMode="tail"
        onTextLayout={handleTextLayout}
      >
        {error}
      </Text>
      {isTruncated ? (
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
