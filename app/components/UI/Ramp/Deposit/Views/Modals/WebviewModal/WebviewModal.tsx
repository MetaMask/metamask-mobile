import React, { useRef, useState } from 'react';

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
import ErrorView from '../../../../Aggregator/components/ErrorView';
import { strings } from '../../../../../../../../locales/i18n';

interface ProviderModalNavigationDetails {
  onExitToWalletHome?: () => void;
  sourceUrl: string;
  handleNavigationStateChange?: (navState: { url: string }) => void;
  error?: string;
}

export const createProviderModalNavigationDetails = createNavigationDetails(
  Routes.DEPOSIT.MODALS.ID,
  Routes.DEPOSIT.MODALS.WEBVIEW,
);

function WebviewModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const {
    sourceUrl,
    handleNavigationStateChange,
    error: errorParam,
  } = useParams<ProviderModalNavigationDetails>();

  const [webviewError, setWebviewError] = useState<string | null>(null);

  const error = webviewError || errorParam;

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack isFullscreen>
      <BottomSheetHeader
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      />

      {error ? (
        <ScreenLayout>
          <ScreenLayout.Body>
            {/* TODO: Replace this with a proper error view */}
            <ErrorView description={error} location="Provider Webview" />
          </ScreenLayout.Body>
        </ScreenLayout>
      ) : (
        <ScreenLayout>
          <ScreenLayout.Body>
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
          </ScreenLayout.Body>
        </ScreenLayout>
      )}
    </BottomSheet>
  );
}

export default WebviewModal;
