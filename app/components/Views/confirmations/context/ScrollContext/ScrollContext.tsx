import React, {
  ReactElement,
  RefObject,
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconColor, IconName } from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './ScrollContext.styles';

export interface ScrollContextType {
  isScrollToBottomNeeded: boolean;
}

export const ScrollContext = createContext<ScrollContextType>({
  isScrollToBottomNeeded: false,
});

export const ScrollContextProvider: React.FC<{
  scrollableSection: ReactElement[] | ReactElement;
  staticFooter: ReactElement;
}> = ({ scrollableSection, staticFooter }) => {
  const [hasScrolledToBottom, setScrolledToBottom] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrolledSectionRef = useRef<View | null>(null);
  const { styles } = useStyles(styleSheet, {});

  const checkScrollable = useCallback(() => {
    (scrollViewRef as RefObject<View>)?.current?.measure(
      (_1: unknown, _2: unknown, _3: unknown, scrollViewHeight: number) => {
        scrolledSectionRef.current?.measure(
          (
            _4: unknown,
            _5: unknown,
            _6: unknown,
            scrolledViewHeight: number,
          ) => {
            const scrollable = scrolledViewHeight > scrollViewHeight;
            setIsScrollable(scrollable);
          },
        );
      },
    );
  }, [scrollViewRef, scrolledSectionRef, setIsScrollable]);

  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [scrollViewRef]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isEndReached =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 10;
    setScrolledToBottom(isEndReached);
  };

  return (
    <ScrollContext.Provider
      value={{
        isScrollToBottomNeeded: isScrollable && !hasScrolledToBottom,
      }}
    >
      {isScrollable && !hasScrolledToBottom && (
        <ButtonIcon
          size={ButtonIconSizes.Lg}
          style={styles.scrollButton}
          iconName={IconName.Arrow2Down}
          iconColor={IconColor.Inverse}
          onPress={scrollToBottom}
          testID="scroll-to-bottom-button"
        />
      )}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollable}
        onContentSizeChange={checkScrollable}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <TouchableWithoutFeedback>
          <View ref={scrolledSectionRef} style={styles.scrollableSection}>
            {scrollableSection}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
      {staticFooter}
    </ScrollContext.Provider>
  );
};

export const useScrollContext = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error(
      'useScrollContext must be used within an ScrollContextProvider',
    );
  }
  return context;
};
