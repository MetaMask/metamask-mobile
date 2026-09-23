import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { OpenLimitOrderDetailsModalScreen } from './OpenLimitOrderDetailsModalScreen';
import { OpenLimitOrderDetailsModalSelectorsIDs } from './testIds';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
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

describe('OpenOrderDetailsModalScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays the market comparison for the mocked trigger price', () => {
    const { getByTestId } = render(<OpenLimitOrderDetailsModalScreen />);

    expect(
      getByTestId(OpenLimitOrderDetailsModalSelectorsIDs.TRIGGER_COMPARISON),
    ).toHaveTextContent(
      strings('bridge.limit.from_market', { percent: '4.95' }),
    );
  });

  it('opens the cancel order sheet when the cancel button is pressed', () => {
    const { getByTestId } = render(<OpenLimitOrderDetailsModalScreen />);

    fireEvent.press(
      getByTestId(OpenLimitOrderDetailsModalSelectorsIDs.CANCEL_ORDER_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.CANCEL_LIMIT_ORDER_MODAL,
      params: { onConfirm: expect.any(Function) },
    });
  });

  it('hands the cancel order sheet a confirmation callback', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {
      // Silence the stub warning in test output.
    });
    const { getByTestId } = render(<OpenLimitOrderDetailsModalScreen />);

    fireEvent.press(
      getByTestId(OpenLimitOrderDetailsModalSelectorsIDs.CANCEL_ORDER_BUTTON),
    );
    const { onConfirm } = mockNavigate.mock.calls[0][1].params;
    onConfirm();

    expect(warnSpy).toHaveBeenCalledWith('cancel');

    warnSpy.mockRestore();
  });
});
