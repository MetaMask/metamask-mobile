// Third party dependencies
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import Text, { TextVariant, TextColor } from '../../Texts/Text';
import { useStyles } from '../../../hooks';
import { useTheme } from '../../../../util/theme';
import Checkbox from '../../../../component-library/components/Checkbox';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
// Internal dependencies
import {
  WEBVIEW_SCROLL_END_EVENT,
  WEBVIEW_SCROLL_NOT_END_EVENT,
} from './ModalMandatory.constants';
import stylesheet from './ModalMandatory.styles';
import { TermsOfUseModalSelectorsIDs } from '../../../../../e2e/selectors/Onboarding/TermsOfUseModal.selectors';
import BottomSheet, { BottomSheetRef } from '../../BottomSheets/BottomSheet';
import { useNavigation } from '@react-navigation/native';
import { throttle } from 'lodash';
import type { RootParamList } from '../../../../util/navigation/types';
import type { StackScreenProps } from '@react-navigation/stack';

type MandatoryModalProps = StackScreenProps<RootParamList, 'ModalMandatory'>;

const ModalMandatory = ({ route }: MandatoryModalProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(stylesheet, {});
  const webViewRef = useRef<WebView>(null);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();

  const [isWebViewLoaded, setIsWebViewLoaded] = useState<boolean>(false);
  const [isScrollEnded, setIsScrollEnded] = useState<boolean>(false);
  const [isCheckboxSelected, setIsCheckboxSelected] = useState<boolean>(false);

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

  const themeCSS = useMemo(() => {
    const sanitizeColor = (color: string): string =>
      color.replace(/[^#a-fA-F0-9(),.\s%]/g, '');

    const safeColors = {
      bg: sanitizeColor(colors.background.default),
      text: sanitizeColor(colors.text.alternative),
      primary: sanitizeColor(colors.primary.default),
      primaryAlt: sanitizeColor(colors.primary.alternative),
      bgAlt: sanitizeColor(colors.background.alternative),
      border: sanitizeColor(colors.border.default),
    };

    return `
      <style>
        :root {
          --bg: ${safeColors.bg};
          --text: ${safeColors.text};
          --primary: ${safeColors.primary};
          --primary-alt: ${safeColors.primaryAlt};
          --bg-alt: ${safeColors.bgAlt};
          --border: ${safeColors.border};
        }
        body {
          background-color: var(--bg) !important;
          color: var(--text) !important;
          font-family: Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          font-size: 14px;
          font-weight: 400;
          padding: 0px !important;
          line-height: 1.5;
          margin-top: -50px !important;
        }
        body > div > div > div > div {
          max-width: 100% !important;
        }
        *, *::before, *::after {
          background-color: var(--bg) !important;
          color: var(--text) !important;
          padding: 0px;
        }
        h1, h2, h3, h4, h5, h6, p, div, span, section, article, header, footer, main, ul, ol, li {
          color: var(--text) !important;
        }
        a { color: var(--primary) !important; }
        a:visited { color: var(--primary-alt) !important; }
        table, th, td {
          background-color: var(--bg) !important;
          color: var(--text) !important;
          border-color: var(--border) !important;
        }
        pre, code {
          background-color: var(--bg-alt) !important;
          color: var(--text) !important;
        }
      </style>
    `;
  }, [colors]);

  const scrollToEndWebView = () => {
    if (isWebViewLoaded) {
      webViewRef.current?.injectJavaScript(scrollToEndJS);
    }
  };

  const scrollToEnd = () => {
    if (body.source === 'WebView') {
      let source = { uri: '', html: '' };
      if (body.uri) {
        source.uri = body.uri;
      } else if (body.html) {
        source.html = body.html;
      }

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

  const onPress = () => {
    navigation.goBack();
    if (onAccept) {
      onAccept();
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
        {headerTitle}
      </Text>
    </View>
  );

  const onMessage = (event: { nativeEvent: { data: string } }) => {
    if (event.nativeEvent.data === WEBVIEW_SCROLL_END_EVENT) {
      setIsScrollEnded(true);
    } else {
      setIsScrollEnded(false);
    }
  };

  const renderScrollEndButton = () => (
    <View
      style={[
        styles.scrollToEndButton,
        // eslint-disable-next-line react-native/no-inline-styles
        isScrollEnded && {
          display: 'none',
        },
      ]}
    >
      <ButtonIcon
        testID={TermsOfUseModalSelectorsIDs.SCROLL_ARROW_BUTTON}
        onPress={scrollToEnd}
        iconName={IconName.ArrowDown}
        iconColor={colors.primary.inverse}
        hitSlop={12}
      />
    </View>
  );

  const isCloseToBottom = useCallback(
    ({ layoutMeasurement, contentOffset, contentSize }: NativeScrollEvent) => {
      const paddingToBottom = 20;
      if (
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom
      ) {
        setIsScrollEnded(true);
      } else {
        setIsScrollEnded(false);
      }
    },
    [],
  );

  const throttledCloseToBottom = useMemo(
    () => throttle(isCloseToBottom, 50),
    [isCloseToBottom],
  );

  const removeElements = (html: string) => {
    html = html.replace(/<h1 class="title">.*?<\/h1>/gs, '');
    html = html.replace(/<p class="sub-title">.*?<\/p>/gs, '');
    return html;
  };

  const renderWebView = (
    body: Extract<
      MandatoryModalProps['route']['params']['body'],
      { source: 'WebView' }
    >,
  ) => {
    let source = { uri: '', html: '' };
    if (body.uri) {
      source.uri = body.uri;
    } else if (body.html) {
      source.html = body.html;
    }

    if (source.html) {
      const themedHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            ${themeCSS}
          </head>
          <body>
            ${source.html}
          </body>
        </html>
      `;
      source.html = removeElements(themedHTML);
    }

    return (
      <WebView
        ref={webViewRef}
        nestedScrollEnabled
        source={source}
        injectedJavaScript={isScrollEndedJS}
        onLoad={() => setIsWebViewLoaded(true)}
        onMessage={onMessage}
        onScroll={({ nativeEvent }) => {
          throttledCloseToBottom(nativeEvent as NativeScrollEvent);
        }}
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

  return (
    <BottomSheet ref={bottomSheetRef} shouldNavigateBack isInteractable={false}>
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
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {checkboxText}
          </Text>
        </TouchableOpacity>
        <ButtonPrimary
          label={buttonText}
          isDisabled={
            isScrollToEndNeeded
              ? !isScrollEnded || !isCheckboxSelected
              : !isCheckboxSelected
          }
          style={{
            ...styles.confirmButton,
          }}
          onPress={onPress}
          testID={buttonTestId}
        />
        {isScrollToEndNeeded && renderScrollEndButton()}
        {footerHelpText ? (
          <Text
            style={styles.footerHelpText}
            variant={TextVariant.BodySM}
            color={TextColor.Alternative}
          >
            {footerHelpText}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
};

export default ModalMandatory;
