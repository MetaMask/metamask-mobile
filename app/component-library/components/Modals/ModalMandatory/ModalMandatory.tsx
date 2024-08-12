// Third party dependencies
import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from '@metamask/react-native-webview';

// External dependencies.
import ButtonPrimary from '../../Buttons/Button/variants/ButtonPrimary';
import Text from '../../Texts/Text';
import { useStyles } from '../../../hooks';
import { useTheme } from '../../../../util/theme';
import ReusableModal, {
  ReusableModalRef,
} from '../../../../components/UI/ReusableModal';
import Checkbox from '../../../../component-library/components/Checkbox';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';

// Internal dependencies
import {
  WEBVIEW_SCROLL_END_EVENT,
  WEBVIEW_SCROLL_NOT_END_EVENT,
} from './ModalMandatory.constants';
import {
  BodyWebView,
  BodyWebViewUri,
  MandatoryModalProps,
} from './ModalMandatory.types';
import stylesheet from './ModalMandatory.styles';
import { TermsOfUseModalSelectorsIDs } from '../../../../../e2e/selectors/Modals/TermsOfUseModal.selectors';

const ModalMandatory = ({ route }: MandatoryModalProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(stylesheet, {});
  const modalRef = useRef<ReusableModalRef>(null);
  const webViewRef = useRef<WebView>(null);

  const [isWebViewLoaded, setIsWebViewLoaded] = useState<boolean>(false);
  const [isScrollEnded, setIsScrollEnded] = useState<boolean>(false);
  const [isCheckboxSelected, setIsCheckboxSelected] = useState<boolean>(false);

  const [isFloatingButton, setIsFloatingButtonBackground] = useState(true);

  const scrollRef = useRef<ScrollView>(null);

  const {
    headerTitle,
    footerHelpText,
    buttonText,
    body,
    onAccept,
    checkboxText,
    onRender,
    isScrollToEndNeeded,
    scrollEndBottomMargin,
    containerTestId,
    buttonTestId,
  } = route.params;

  const scrollToEndJS = `window.scrollTo(0, document.body.scrollHeight - ${
    scrollEndBottomMargin ?? 1
  } );`;

  const isScrollEndedJS = `(function(){ window.onscroll = function() {
    if (window.scrollY + window.innerHeight + ${
      scrollEndBottomMargin ?? 1
    } >= document.documentElement.scrollHeight) {
      window.ReactNativeWebView.postMessage('${WEBVIEW_SCROLL_END_EVENT}');
    }else{
      window.ReactNativeWebView.postMessage('${WEBVIEW_SCROLL_NOT_END_EVENT}');
    }
  }})();`;

  const scrollToEndWebView = () => {
    if (isWebViewLoaded) {
      webViewRef.current?.injectJavaScript(scrollToEndJS);
    }
  };

  const isBodyWebViewUri = (
    webviewBody: BodyWebView,
  ): webviewBody is BodyWebViewUri =>
    (webviewBody as BodyWebViewUri).uri !== undefined;

  const scrollToEnd = () => {
    if (body.source === 'WebView') {
      const source = isBodyWebViewUri(body)
        ? { uri: body.uri }
        : { html: body.html };

      if (source.uri) {
        scrollToEndWebView();
        return;
      }
      webViewRef.current?.injectJavaScript(scrollToEndJS);
    }
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const handleSelect = () => {
    setIsCheckboxSelected(!isCheckboxSelected);
  };

  useEffect(() => {
    onRender?.();
  }, [onRender]);

  /**
   * Disable back press
   */
  useEffect(() => {
    const hardwareBackPress = () => true;

    BackHandler.addEventListener('hardwareBackPress', hardwareBackPress);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', hardwareBackPress);
    };
  }, []);

  const renderHeader = () => (
    <Text style={styles.headerText}>{headerTitle}</Text>
  );

  const onPress = () => {
    modalRef.current?.dismissModal(onAccept);
  };

  const onMessage = (event: { nativeEvent: { data: string } }) => {
    if (event.nativeEvent.data === WEBVIEW_SCROLL_END_EVENT) {
      setIsScrollEnded(true);
      setIsFloatingButtonBackground(false);
    } else {
      setIsScrollEnded(false);
      setIsFloatingButtonBackground(true);
    }
  };

  const renderScrollEndButton = () => (
    <View
      style={[
        styles.scrollToEndButton,
        // eslint-disable-next-line react-native/no-inline-styles
        !isFloatingButton && {
          display: 'none',
        },
      ]}
    >
      <ButtonIcon
        testID={TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON}
        onPress={scrollToEnd}
        iconName={IconName.ArrowDown}
        hitSlop={12}
      />
    </View>
  );

  const isCloseToBottom = ({
    layoutMeasurement,
    contentOffset,
    contentSize,
  }: NativeScrollEvent) => {
    const paddingToBottom = 20;
    if (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    ) {
      setIsScrollEnded(true);
      setIsFloatingButtonBackground(false);
    } else {
      setIsScrollEnded(false);
      setIsFloatingButtonBackground(true);
    }
  };

  const renderWebView = (webviewBody: BodyWebView) => {
    const source = isBodyWebViewUri(webviewBody)
      ? { uri: webviewBody.uri }
      : { html: webviewBody.html };

    return (
      <WebView
        ref={webViewRef}
        nestedScrollEnabled
        source={source}
        injectedJavaScript={isScrollEndedJS}
        onLoad={() => setIsWebViewLoaded(true)}
        onMessage={onMessage}
        onScroll={({ nativeEvent }) =>
          isCloseToBottom(nativeEvent as NativeScrollEvent)
        }
        {...(source.uri && {
          onShouldStartLoadWithRequest: (req) => source.uri === req.url,
        })}
      />
    );
  };

  const renderBody = () => {
    if (body.source === 'Node')
      return (
        <ScrollView
          ref={scrollRef}
          onScroll={({
            nativeEvent,
          }: NativeSyntheticEvent<NativeScrollEvent>) =>
            isCloseToBottom(nativeEvent)
          }
          scrollEventThrottle={50}
        >
          {body.component()}
        </ScrollView>
      );
  };

  const buttonBackgroundColor = () => {
    if (isScrollToEndNeeded) {
      return {
        backgroundColor:
          !isScrollEnded || !isCheckboxSelected
            ? colors.primary.muted
            : colors.primary.default,
      };
    }

    return {
      backgroundColor: !isCheckboxSelected
        ? colors.primary.muted
        : colors.primary.default,
    };
  };

  return (
    <ReusableModal ref={modalRef} style={styles.screen} isInteractable={false}>
      <View style={styles.modal} testID={containerTestId}>
        {renderHeader()}
        <View
          style={styles.bodyContainer}
          testID={TermsOfUseModalSelectorsIDs.WEBVIEW}
        >
          {body.source === 'WebView' ? renderWebView(body) : renderBody()}
        </View>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={handleSelect}
          activeOpacity={1}
          testID={TermsOfUseModalSelectorsIDs.CHECKBOX}
        >
          <Checkbox onPress={handleSelect} isChecked={isCheckboxSelected} />
          <Text style={styles.checkboxText}>{checkboxText}</Text>
        </TouchableOpacity>
        <ButtonPrimary
          label={buttonText}
          disabled={
            isScrollToEndNeeded
              ? !isScrollEnded || !isCheckboxSelected
              : !isCheckboxSelected
          }
          style={{
            ...styles.confirmButton,
            ...buttonBackgroundColor(),
          }}
          onPress={onPress}
          testID={buttonTestId}
        />
        {isScrollToEndNeeded && renderScrollEndButton()}
        {footerHelpText ? (
          <Text style={styles.footerHelpText}>{footerHelpText}</Text>
        ) : null}
      </View>
    </ReusableModal>
  );
};

export default ModalMandatory;
