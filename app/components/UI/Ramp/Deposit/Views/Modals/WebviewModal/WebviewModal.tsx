import React, { useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import HeaderCompactStandard from '../../../../../../../component-library/components-temp/HeaderCompactStandard';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../../constants/navigation/Routes';
import { WebView } from '@metamask/react-native-webview';
import ScreenLayout from '../../../../Aggregator/components/ScreenLayout';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks/useStyles';
import styleSheet from './WebviewModal.styles';
import ErrorView from '../../../components/ErrorView';
import Device from '../../../../../../../util/device';

export interface WebviewModalParams {
  sourceUrl: string;
  handleNavigationStateChange?: (navState: { url: string }) => void;
}

export const createWebviewModalNavigationDetails =
  createNavigationDetails<WebviewModalParams>(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.WEBVIEW,
  );

function WebviewModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const previousUrlRef = useRef<string | null>(null);
  const { sourceUrl, handleNavigationStateChange } =
    useParams<WebviewModalParams>();

  const { height: screenHeight } = useWindowDimensions();

  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const [webviewError, setWebviewError] = useState<string | null>(null);

  const handleNavigationStateChangeWithDedup = (navState: { url: string }) => {
    if (navState.url !== previousUrlRef.current) {
      previousUrlRef.current = navState.url;
      handleNavigationStateChange?.(navState);
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      isFullscreen
      isInteractable={!Device.isAndroid()}
      keyboardAvoidingViewEnabled={false}
    >
      <HeaderCompactStandard
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      />

      <ScreenLayout>
        <ScreenLayout.Body>
          {webviewError ? (
            <ErrorView description={webviewError} />
          ) : (
            <WebView
              style={styles.webview}
              source={{ uri: sourceUrl }}
              onNavigationStateChange={handleNavigationStateChangeWithDedup}
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
              paymentRequestEnabled
              mediaPlaybackRequiresUserAction={false}
            />
          )}
        </ScreenLayout.Body>
      </ScreenLayout>
    </BottomSheet>
  );
}

export default WebviewModal;
