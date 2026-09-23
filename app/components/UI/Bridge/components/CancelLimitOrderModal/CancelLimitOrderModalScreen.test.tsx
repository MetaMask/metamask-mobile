import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useParams } from '../../../../../util/navigation/navUtils';
import { CancelLimitOrderModalScreen } from './CancelLimitOrderModalScreen';
import { CancelLimitOrderModalSelectorsIDs } from './testIds';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: ReactModule.forwardRef(
      (
        props: {
          children: unknown;
          testID?: string;
          onClose?: () => void;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: () => props.onClose?.(),
        }));

        return (
          <View testID={props.testID}>{props.children as React.ReactNode}</View>
        );
      },
    ),
  };
});

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

describe('CancelOrderModalScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the onConfirm callback handed in by the host screen', () => {
    const onConfirm = jest.fn();
    mockUseParams.mockReturnValue({ onConfirm });

    const { getByTestId } = render(<CancelLimitOrderModalScreen />);
    fireEvent.press(getByTestId(CancelLimitOrderModalSelectorsIDs.CONFIRM_BUTTON));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
