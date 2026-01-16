import React from 'react';
import { Modal, Image, Dimensions, ImageSourcePropType } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName as IconNameDS,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import RewardsThemeImageComponent from '../ThemeImageComponent';
import { ThemeImage } from '../../../../../core/Engine/controllers/rewards-controller/types';

interface RewardsImageModalProps {
  visible: boolean;
  onClose: () => void;
  themeImage?: ThemeImage;
  fallbackImage?: ImageSourcePropType;
}

const RewardsImageModal: React.FC<RewardsImageModalProps> = ({
  visible,
  onClose,
  themeImage,
  fallbackImage,
}) => {
  const tw = useTailwind();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Box
        testID="rewards-image-modal"
        twClassName="flex-1 bg-black/80 justify-center items-center"
      >
        {/* Close button in upper right corner */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="absolute right-10 top-1/4 z-50"
        >
          <ButtonIcon
            testID="modal-close-button"
            iconName={IconNameDS.Close}
            size={ButtonIconSize.Lg}
            onPress={onClose}
            twClassName="rounded-full"
          />
        </Box>

        {/* Expanded image */}
        <TouchableOpacity
          style={tw.style('flex-1 w-full justify-center items-center')}
          onPress={onClose}
          activeOpacity={1}
        >
          <Box twClassName="w-full px-4">
            {themeImage ? (
              <RewardsThemeImageComponent
                themeImage={themeImage}
                style={tw.style('w-full', {
                  aspectRatio: 1,
                  maxWidth: Dimensions.get('window').width - 32,
                })}
              />
            ) : fallbackImage ? (
              <Image
                source={fallbackImage}
                testID="fallback-image"
                style={tw.style('w-full', {
                  aspectRatio: 1,
                  maxWidth: Dimensions.get('window').width - 32,
                })}
                resizeMode="contain"
              />
            ) : null}
          </Box>
        </TouchableOpacity>
      </Box>
    </Modal>
  );
};

export default RewardsImageModal;
