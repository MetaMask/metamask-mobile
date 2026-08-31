import React from 'react';
import { render } from '@testing-library/react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import RecurringBottomSheet, {
  BRIDGE_TABS_BAR_HEIGHT,
} from './RecurringBottomSheet';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactModule = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<{
    View: typeof import('react-native').View;
  }>('react-native');

  return {
    ...jest.requireActual('@metamask/design-system-react-native'),
    BottomSheet: ReactModule.forwardRef(function MockBottomSheet(
      {
        style,
        children,
        ...props
      }: {
        style?: StyleProp<ViewStyle>;
        children?: React.ReactNode;
      },
      _ref: React.Ref<object>,
    ) {
      return (
        <View testID="ds-bottom-sheet" style={style} {...props}>
          {children}
        </View>
      );
    }),
  };
});

describe('RecurringBottomSheet', () => {
  it('pulls the overlay up by the bridge tabs bar height', () => {
    const { getByTestId } = render(<RecurringBottomSheet />);

    expect(getByTestId('ds-bottom-sheet')).toHaveStyle({
      top: -BRIDGE_TABS_BAR_HEIGHT,
      zIndex: 1,
    });
  });

  it('keeps caller style after the tabs offset', () => {
    const { getByTestId } = render(
      <RecurringBottomSheet style={{ opacity: 0.5 }} />,
    );

    expect(getByTestId('ds-bottom-sheet')).toHaveStyle({
      top: -BRIDGE_TABS_BAR_HEIGHT,
      zIndex: 1,
      opacity: 0.5,
    });
  });
});
