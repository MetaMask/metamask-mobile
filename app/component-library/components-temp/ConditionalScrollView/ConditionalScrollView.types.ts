import { ScrollViewProps } from 'react-native';

export interface ConditionalScrollViewProps {
  /**
   * Content to render inside the conditional scroll view
   */
  children: React.ReactNode;
  /**
   * If true, wraps children in ScrollView. If false, renders children directly.
   */
  isScrollEnabled: boolean;
  /**
   * Optional props to pass to ScrollView when isScrollEnabled is true
   */
  scrollViewProps?: ScrollViewProps;
}
