import React from 'react';
import {
  ActivityIndicator,
  Image,
  ImageResizeMode,
  ImageStyle,
  StyleProp,
} from 'react-native';
import {
  Box,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTheme, useAssetFromTheme } from '../../../../../util/theme';
import { ThemeImage } from '../../../../../core/Engine/controllers/rewards-controller/types';

interface RewardsThemeImageComponentProps {
  themeImage: ThemeImage;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
}

const RewardsThemeImageComponent: React.FC<RewardsThemeImageComponentProps> = ({
  themeImage,
  style,
  resizeMode = 'contain',
}) => {
  const theme = useTheme();

  // Track image loading state or error
  // false = loaded, true = loading, 'error' = error message
  const [imgLoading, setImgLoading] = React.useState<boolean | 'error'>(true);

  // Get the themed image source
  const imageSource = useAssetFromTheme(
    themeImage.lightModeUrl,
    themeImage.darkModeUrl,
  );

  return (
    <Box twClassName="relative">
      {imgLoading === true && (
        <Box twClassName="absolute inset-0 justify-center items-center">
          <ActivityIndicator
            size="small"
            color={theme.colors.primary.default}
            testID="activity-indicator"
          />
        </Box>
      )}
      {imgLoading === 'error' ? (
        <Icon
          name={IconName.Image}
          size={IconSize.Lg}
          twClassName="text-icon-muted"
          testID="fallback-icon"
        />
      ) : (
        <Image
          source={{ uri: imageSource }}
          resizeMode={resizeMode}
          style={style}
          onLoad={() => setImgLoading(false)}
          onError={() => setImgLoading('error')}
          testID="theme-image"
        />
      )}
    </Box>
  );
};

export default RewardsThemeImageComponent;
