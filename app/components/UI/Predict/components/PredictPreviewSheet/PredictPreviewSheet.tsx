import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetHeaderVariant,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { forwardRef, useImperativeHandle } from 'react';
import { Image } from 'react-native';
import {
  usePredictBottomSheet,
  type PredictBottomSheetRef,
} from '../../hooks/usePredictBottomSheet';

interface PredictPreviewSheetProps {
  renderHeader?: () => React.ReactNode;
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
          variant={BottomSheetHeaderVariant.Display}
          twClassName="px-6 py-4"
        >
          {renderHeader ? (
            renderHeader()
          ) : (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-3 flex-1 min-w-0"
            >
              {image && (
                <Image
                  source={{ uri: image }}
                  style={tw.style('w-12 h-12 rounded')}
                />
              )}
              <Box twClassName="flex-1 min-w-0 shrink">
                <Text
                  variant={TextVariant.HeadingMd}
                  twClassName="text-default"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  testID="preview-sheet-title"
                >
                  {title}
                </Text>
                {subtitle && (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    twClassName="font-medium"
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
