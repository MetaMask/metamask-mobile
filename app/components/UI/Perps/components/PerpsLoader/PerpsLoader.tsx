import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
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
  const { styles, theme } = useStyles(createStyles, {});

  const loaderContent = (
    <View
      style={fullScreen ? styles.container : styles.inlineContainer}
      testID={fullScreen ? 'perps-loader-fullscreen' : 'perps-loader-inline'}
    >
      <ActivityIndicator
        size="large"
        color={theme.colors.primary.default}
        style={styles.spinner}
        testID="perps-loader-spinner"
      />
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Muted}
        style={styles.loadingText}
        testID="perps-loader-text"
      >
        {message}
      </Text>
    </View>
  );

  if (fullScreen) {
    return <ScreenView>{loaderContent}</ScreenView>;
  }

  return loaderContent;
};

export default PerpsLoader;
