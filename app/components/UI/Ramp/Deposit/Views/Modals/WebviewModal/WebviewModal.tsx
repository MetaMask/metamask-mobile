import React, { useRef, useState } from 'react';
import { useWindowDimensions, TouchableOpacity } from 'react-native';

import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../../../component-library/components/Icons/Icon';
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
  const { sourceUrl, handleNavigationStateChange } =
    useParams<WebviewModalParams>();

  const { height: screenHeight } = useWindowDimensions();

  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const [webviewError, setWebviewError] = useState<string | null>(null);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      isFullscreen
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader
        endAccessory={
          <TouchableOpacity>
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSizes.Lg}
              iconColor={IconColor.Alternative}
              onPress={() => sheetRef.current?.onCloseBottomSheet()}
            />
          </TouchableOpacity>
        }
        style={styles.headerWithoutPadding}
      />

      <ScreenLayout>
        <ScreenLayout.Body>
          {webviewError ? (
            <ErrorView description={webviewError} />
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
