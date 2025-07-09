import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import ScreenView from '../../../../Base/ScreenView';
import { createStyles } from './PerpsLoader.styles';

interface PerpsLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

const PerpsLoader: React.FC<PerpsLoaderProps> = ({
  message = 'Connecting to Perps...',
  fullScreen = true,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const loaderContent = (
    <View style={fullScreen ? styles.container : styles.inlineContainer}>
      <ActivityIndicator
        size="large"
        color={theme.colors.primary.default}
        style={styles.spinner}
      />
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Muted}
        style={styles.loadingText}
      >
        {message}
      </Text>
    </View>
  );

  if (fullScreen) {
    return (
      <ScreenView>
        {loaderContent}
      </ScreenView>
    );
  }

  return loaderContent;
};

export default PerpsLoader;
