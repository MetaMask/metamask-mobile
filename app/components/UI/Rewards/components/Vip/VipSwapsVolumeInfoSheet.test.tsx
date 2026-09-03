import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import VipSwapsVolumeInfoSheet, {
  VIP_SWAPS_VOLUME_INFO_SHEET_TEST_IDS,
} from './VipSwapsVolumeInfoSheet';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');

  const passthrough = ({
    children,
    testID,
  }: {
    children?: React.ReactNode;
    testID?: string;
  }) => ReactActual.createElement(View, { testID }, children);

  return {
    BottomSheet: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
    Box: passthrough,
    BoxAlignItems: { Center: 'center', Start: 'start', End: 'end' },
    BoxFlexDirection: { Row: 'row', Column: 'column' },
    BoxJustifyContent: { Between: 'between', Center: 'center', End: 'end' },
    ButtonIcon: ({
      onPress,
      testID,
    }: {
      onPress?: () => void;
      testID?: string;
    }) => ReactActual.createElement(Pressable, { testID, onPress }),
    FontWeight: { Medium: 'medium', Bold: 'bold' },
    Icon: passthrough,
    IconColor: { IconDefault: 'default', IconAlternative: 'alt' },
    IconName: { Close: 'Close', Info: 'Info' },
    IconSize: { Sm: 'sm', Md: 'md', Lg: 'lg', Xl: 'xl' },
    Text: ({ children, ...rest }: { children?: React.ReactNode }) =>
      ReactActual.createElement(Text, rest, children),
    TextColor: { TextDefault: 'default', TextAlternative: 'alt' },
    TextVariant: { HeadingMd: 'headingMd', BodyMd: 'bodyMd' },
  };
});

describe('VipSwapsVolumeInfoSheet', () => {
  it('renders the daily-refresh title and description', () => {
    const { getByTestId } = render(
      <VipSwapsVolumeInfoSheet onClose={jest.fn()} />,
    );

    const sheet = getByTestId(VIP_SWAPS_VOLUME_INFO_SHEET_TEST_IDS.SHEET);
    expect(sheet).toHaveTextContent(/Swaps volume/);
    expect(sheet).toHaveTextContent(/updates once per day/);
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <VipSwapsVolumeInfoSheet onClose={onClose} />,
    );

    fireEvent.press(getByTestId(VIP_SWAPS_VOLUME_INFO_SHEET_TEST_IDS.CLOSE));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
