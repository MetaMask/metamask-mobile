import React, { useCallback, useRef, useState } from 'react';
import { Image } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import CardScreenshotDeterrent from '../CardScreenshotDeterrent/CardScreenshotDeterrent';
import { ViewPinBottomSheetSelectors } from './ViewPinBottomSheet.testIds';

interface ViewPinBottomSheetParams {
  imageUrl: string;
}

export const createViewPinBottomSheetNavigationDetails =
  createNavigationDetails<ViewPinBottomSheetParams>(
    Routes.CARD.MODALS.ID,
    Routes.CARD.MODALS.VIEW_PIN,
  );

const ViewPinBottomSheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { imageUrl } = useParams<ViewPinBottomSheetParams>();
  const tw = useTailwind();
  const [isImageLoading, setIsImageLoading] = useState(true);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      testID={ViewPinBottomSheetSelectors.BOTTOM_SHEET}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('card.view_pin_bottomsheet.title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-6 items-center">
        <Box
          twClassName="w-full rounded-lg overflow-hidden"
          style={{ aspectRatio: 3 / 1 }}
        >
          {isImageLoading && (
            <Skeleton
              height={'100%'}
              width={'100%'}
              style={tw.style('rounded-lg absolute inset-0 z-10')}
              testID={ViewPinBottomSheetSelectors.PIN_IMAGE_SKELETON}
            />
          )}
          <Image
            source={{ uri: imageUrl }}
            style={tw.style('w-full h-full')}
            resizeMode="contain"
            onLoad={() => setIsImageLoading(false)}
            onError={() => setIsImageLoading(false)}
            testID={ViewPinBottomSheetSelectors.PIN_IMAGE}
          />
        </Box>
      </Box>

      <CardScreenshotDeterrent enabled />
    </BottomSheet>
  );
};

export default ViewPinBottomSheet;
