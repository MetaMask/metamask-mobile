import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { forwardRef, useImperativeHandle } from 'react';
import { Image } from 'expo-image';
import {
  usePredictBottomSheet,
  type PredictBottomSheetRef,
} from '../../hooks/usePredictBottomSheet';

interface PredictPreviewSheetProps {
  renderHeader?: () => React.ReactNode;
  renderRightComponent?: () => React.ReactNode;
  title?: string;
  image?: string;
  subtitle?: string;
  isFullscreen?: boolean;
  children: (closeSheet: () => void) => React.ReactNode;
  onDismiss?: () => void;
  testID?: string;
}

export type PredictPreviewSheetRef = PredictBottomSheetRef;

const PredictPreviewSheet = forwardRef<
  PredictPreviewSheetRef,
  PredictPreviewSheetProps
>(
  (
    {
      renderHeader,
      renderRightComponent,
      title,
      image,
      subtitle,
      isFullscreen = true,
      children,
      onDismiss,
      testID,
    },
    ref,
  ) => {
    const tw = useTailwind();
    const {
      sheetRef,
      isVisible,
      closeSheet,
      handleSheetClosed,
      getRefHandlers,
    } = usePredictBottomSheet({ onDismiss });

    useImperativeHandle(ref, getRefHandlers, [getRefHandlers]);

    if (!isVisible) {
      return null;
    }

    return (
      <BottomSheet
        ref={sheetRef}
        isInteractable
        isFullscreen={isFullscreen}
        onClose={handleSheetClosed}
        testID={testID}
      >
        <BottomSheetHeader
          onClose={closeSheet}
          // Override internal styles that set width of start accessory to same size as close button,
          // to allow for left aligned predict header content
          startAccessoryWrapperProps={{ style: tw.style('w-0') }}
          style={tw.style('gap-0 pl-4')}
          testID="preview-sheet-header"
        >
          {renderHeader ? (
            renderHeader()
          ) : (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3 flex-1 min-w-0"
              testID="preview-sheet-header-content"
            >
              {image && (
                <Image
                  source={{ uri: image }}
                  style={tw.style('w-12 h-12 rounded-xl')}
                />
              )}
              <Box twClassName="flex-1 min-w-0 shrink">
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-1 min-w-0"
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    twClassName="text-default shrink"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    testID="preview-sheet-title"
                  >
                    {title}
                  </Text>
                  {renderRightComponent ? renderRightComponent() : null}
                </Box>
                {subtitle && (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    fontWeight={FontWeight.Medium}
                    numberOfLines={1}
                    testID="preview-sheet-subtitle"
                  >
                    {subtitle}
                  </Text>
                )}
              </Box>
            </Box>
          )}
        </BottomSheetHeader>
        {children(closeSheet)}
      </BottomSheet>
    );
  },
);

export default PredictPreviewSheet;
