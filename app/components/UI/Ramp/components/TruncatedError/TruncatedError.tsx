import React, { useCallback, useEffect, useState } from 'react';
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
import { strings } from '../../../../../../locales/i18n';

interface TruncatedErrorProps {
  error: string;
  errorDetails?: string;
  maxLines?: number;
  providerName?: string;
  providerSupportUrl?: string;
  showChangeProvider?: boolean;
  amount?: number;
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
  measuring: {
    opacity: 0,
  },
});

const TruncatedError: React.FC<TruncatedErrorProps> = ({
  error,
  errorDetails,
  maxLines = 1,
  providerName,
  providerSupportUrl,
  showChangeProvider,
  amount,
}) => {
  const navigation = useNavigation();
  const [isTruncated, setIsTruncated] = useState(false);
  const [hasMeasured, setHasMeasured] = useState(false);

  useEffect(() => {
    setIsTruncated(false);
    setHasMeasured(false);
  }, [error]);

  const handleTextLayout = useCallback(
    (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      if (hasMeasured) return;
      const { lines } = event.nativeEvent;
      const renderedText = lines.map((line) => line.text).join('');
      setIsTruncated(renderedText.length < error.length);
      setHasMeasured(true);
    },
    [error, hasMeasured],
  );

  const handleInfoPress = useCallback(() => {
    navigation.navigate(
      ...createErrorDetailsModalNavDetails({
        errorMessage: errorDetails ?? error,
        providerName,
        providerSupportUrl,
        showChangeProvider,
        amount,
      }),
    );
  }, [
    error,
    errorDetails,
    navigation,
    providerName,
    providerSupportUrl,
    showChangeProvider,
    amount,
  ]);

  return (
    <View style={styles.container}>
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Error}
        numberOfLines={maxLines}
        ellipsizeMode="tail"
        onTextLayout={handleTextLayout}
        style={[styles.text, !hasMeasured && styles.measuring]}
      >
        {hasMeasured && isTruncated
          ? strings('fiat_on_ramp.encountered_error')
          : error}
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
