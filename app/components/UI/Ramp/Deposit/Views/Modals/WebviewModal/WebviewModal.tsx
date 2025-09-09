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
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../../../../util/navigation/types';
import { WebView } from '@metamask/react-native-webview';
import ScreenLayout from '../../../../Aggregator/components/ScreenLayout';
import { strings } from '../../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../../component-library/hooks/useStyles';
import styleSheet from './WebviewModal.styles';
import ErrorView from '../../../components/ErrorView';

type WebviewModalProps = StackScreenProps<RootParamList, 'DepositWebviewModal'>;

function WebviewModal({ route }: WebviewModalProps) {
  const { sourceUrl, handleNavigationStateChange } = route.params;
  const sheetRef = useRef<BottomSheetRef>(null);
  const previousUrlRef = useRef<string | null>(null);

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
              mediaPlaybackRequiresUserAction={false}
            />
          )}
        </ScreenLayout.Body>
      </ScreenLayout>
    </BottomSheet>
  );
}

export default WebviewModal;
