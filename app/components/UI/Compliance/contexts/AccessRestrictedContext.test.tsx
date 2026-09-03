import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import {
  AccessRestrictedProvider,
  useAccessRestrictedModal,
} from './AccessRestrictedContext';
import { AccessRestrictedModalSelectorsIDs } from '../AccessRestrictedModal/AccessRestrictedModal.testIds';
import { METAMASK_SUPPORT_URL } from '../../../../constants/urls';
import Routes from '../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return {
      __esModule: true,
      default: jest.fn(
        ({
          children,
          testID,
        }: {
          children: React.ReactNode;
          testID?: string;
        }) => <View testID={testID}>{children}</View>,
      ),
    };
  },
);

const TestConsumer = () => {
  const {
    showAccessRestrictedModal,
    hideAccessRestrictedModal,
    isAccessRestricted,
  } = useAccessRestrictedModal();
  return (
    <>
      <Text testID="is-restricted">{String(isAccessRestricted)}</Text>
      <Pressable testID="show-btn" onPress={showAccessRestrictedModal} />
      <Pressable testID="hide-btn" onPress={hideAccessRestrictedModal} />
    </>
  );
};

describe('AccessRestrictedContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides isAccessRestricted as false by default', () => {
    const { getByTestId } = render(
      <AccessRestrictedProvider>
        <TestConsumer />
      </AccessRestrictedProvider>,
    );

    expect(getByTestId('is-restricted').props.children).toBe('false');
  });

  it('sets isAccessRestricted to true when showAccessRestrictedModal is called', () => {
    const { getByTestId } = render(
      <AccessRestrictedProvider>
        <TestConsumer />
      </AccessRestrictedProvider>,
    );

    act(() => {
      fireEvent.press(getByTestId('show-btn'));
    });

    expect(getByTestId('is-restricted').props.children).toBe('true');
  });

  it('sets isAccessRestricted back to false when hideAccessRestrictedModal is called', () => {
    const { getByTestId } = render(
      <AccessRestrictedProvider>
        <TestConsumer />
      </AccessRestrictedProvider>,
    );

    act(() => {
      fireEvent.press(getByTestId('show-btn'));
    });
    expect(getByTestId('is-restricted').props.children).toBe('true');

    act(() => {
      fireEvent.press(getByTestId('hide-btn'));
    });
    expect(getByTestId('is-restricted').props.children).toBe('false');
  });

  it('throws when useAccessRestrictedModal is used outside provider', () => {
    const spy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() => render(<TestConsumer />)).toThrow(
      'useAccessRestrictedModal must be used within an AccessRestrictedProvider',
    );

    spy.mockRestore();
  });

  it('opens the support consent sheet when contact support is tapped', () => {
    const { getByTestId } = render(
      <AccessRestrictedProvider>
        <TestConsumer />
      </AccessRestrictedProvider>,
    );

    act(() => {
      fireEvent.press(getByTestId('show-btn'));
    });

    const contactSupportBtn = getByTestId(
      AccessRestrictedModalSelectorsIDs.CONTACT_SUPPORT_BUTTON,
    );
    act(() => {
      fireEvent.press(contactSupportBtn);
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SUPPORT_CONSENT_SHEET,
      params: {
        onConfirm: expect.any(Function),
        onReject: expect.any(Function),
      },
    });
    expect(getByTestId('is-restricted').props.children).toBe('false');
  });

  it('navigates to the support webview with the plain URL when consent is rejected', () => {
    const { getByTestId } = render(
      <AccessRestrictedProvider>
        <TestConsumer />
      </AccessRestrictedProvider>,
    );

    act(() => {
      fireEvent.press(getByTestId('show-btn'));
    });
    act(() => {
      fireEvent.press(
        getByTestId(AccessRestrictedModalSelectorsIDs.CONTACT_SUPPORT_BUTTON),
      );
    });

    const { onReject } = mockNavigate.mock.calls[0][1].params;
    act(() => {
      onReject();
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: METAMASK_SUPPORT_URL,
        title: 'Contact support',
      },
    });
  });
});
