import React, { useRef, useState } from 'react';
import { Dimensions } from 'react-native';

import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../../constants/navigation/Routes';
import { WebView } from '@metamask/react-native-webview';
import ScreenLayout from '../../../../Aggregator/components/ScreenLayout';
import { strings } from '../../../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
interface WebviewModalParams {
  sourceUrl: string;
  handleNavigationStateChange?: (navState: { url: string }) => void;
}

export const createWebviewModalNavigationDetails = createNavigationDetails(
  Routes.DEPOSIT.MODALS.ID,
  Routes.DEPOSIT.MODALS.WEBVIEW,
);

function WebviewModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { sourceUrl, handleNavigationStateChange } =
    useParams<WebviewModalParams>();

  const [webviewError, setWebviewError] = useState<string | null>(null);

  const screenHeight = Dimensions.get('window').height;
  const customSheetStyle = {
    height: screenHeight * 0.93,
  };

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack style={customSheetStyle}>
      <BottomSheetHeader
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      />

      <ScreenLayout>
        <ScreenLayout.Body>
          {webviewError ? (
            // TODO: Replace this with a proper error view
            <Text variant={TextVariant.HeadingMD} color={TextColor.Error}>
              {webviewError}
            </Text>
          ) : (
            <WebView
              source={{ uri: sourceUrl }}
              onNavigationStateChange={handleNavigationStateChange}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                if (nativeEvent.url === sourceUrl) {
                  const webviewHttpError = strings(
                    'deposit.webview_modal.error',
                    { code: nativeEvent.statusCode },
                  );
                  setWebviewError(webviewHttpError);
                }
              }}
              allowsInlineMediaPlayback
              enableApplePay
              mediaPlaybackRequiresUserAction={false}
            />
          )}
        </ScreenLayout.Body>
      </ScreenLayout>
    </BottomSheet>
  );
}

export default WebviewModal;
