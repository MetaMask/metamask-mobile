import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import SpendingLimitOptionsSheet, {
  createSpendingLimitOptionsNavigationDetails,
} from './SpendingLimitOptionsSheet';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockUseParams = jest.fn();
const mockCloseSheet = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
  createNavigationDetails: jest.fn((stackId: string, screenName: string) =>
    jest.fn((params?: unknown) => [stackId, { screen: screenName, params }]),
  ),
}));

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-shadow
    const React = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return React.forwardRef(
      (
        { children }: { children: React.ReactNode },
        ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
      ) => {
        React.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (cb?: () => void) => {
            mockCloseSheet(cb);
            cb?.();
          },
        }));
        return <View testID="spending-limit-options-sheet">{children}</View>;
      },
    );
  },
);

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-shadow
    const React = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View, Pressable } = require('react-native');
    return ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose: () => void;
    }) => (
      <View>
        <Pressable testID="sheet-header-close" onPress={onClose} />
        {children}
      </View>
    );
  },
);

describe('SpendingLimitOptionsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      currentLimitType: 'full',
      currentCustomLimit: '',
      callerRoute: Routes.CARD.HOME,
      callerParams: { foo: 'bar' },
    });
  });

  it('exports navigation details factory for card modals stack', () => {
    const details = createSpendingLimitOptionsNavigationDetails({
      currentLimitType: 'restricted',
      currentCustomLimit: '100',
      callerRoute: Routes.CARD.HOME,
      callerParams: { a: 1 },
    });
    expect(details).toEqual([
      Routes.CARD.MODALS.ID,
      {
        screen: Routes.CARD.MODALS.SPENDING_LIMIT_OPTIONS,
        params: {
          currentLimitType: 'restricted',
          currentCustomLimit: '100',
          callerRoute: Routes.CARD.HOME,
          callerParams: { a: 1 },
        },
      },
    ]);
  });

  it('navigates back to caller with selected full limit on confirm', () => {
    const { getByText } = renderWithProvider(
      <SpendingLimitOptionsSheet />,
      {},
      true,
      false,
    );

    fireEvent.press(getByText('Confirm'));

    expect(mockCloseSheet).toHaveBeenCalledWith(expect.any(Function));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.HOME, {
      foo: 'bar',
      returnedLimitType: 'full',
      returnedCustomLimit: '',
    });
  });

  it('navigates with restricted limit and sanitized custom amount', () => {
    mockUseParams.mockReturnValue({
      currentLimitType: 'restricted',
      currentCustomLimit: '50',
      callerRoute: Routes.CARD.HOME,
      callerParams: undefined,
    });

    const { getByTestId, getByText } = renderWithProvider(
      <SpendingLimitOptionsSheet />,
      {},
      true,
      false,
    );

    fireEvent.changeText(
      getByTestId('limit-option-restricted-input'),
      '123.45',
    );
    fireEvent.press(getByText('Confirm'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.HOME, {
      returnedLimitType: 'restricted',
      returnedCustomLimit: '123.45',
    });
  });

  it('closes sheet when header close is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <SpendingLimitOptionsSheet />,
      {},
      true,
      false,
    );

    fireEvent.press(getByTestId('sheet-header-close'));

    expect(mockCloseSheet).toHaveBeenCalledWith(undefined);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('switches from restricted back to full and confirms', () => {
    mockUseParams.mockReturnValue({
      currentLimitType: 'restricted',
      currentCustomLimit: '100',
      callerRoute: Routes.CARD.HOME,
      callerParams: { baz: 'qux' },
    });

    const { getByTestId, getByText } = renderWithProvider(
      <SpendingLimitOptionsSheet />,
      {},
      true,
      false,
    );

    fireEvent.press(getByTestId('limit-option-full'));
    fireEvent.press(getByText('Confirm'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.HOME, {
      baz: 'qux',
      returnedLimitType: 'full',
      returnedCustomLimit: '100',
    });
  });

  it('sanitizes non-numeric characters from custom limit input', () => {
    mockUseParams.mockReturnValue({
      currentLimitType: 'restricted',
      currentCustomLimit: '',
      callerRoute: Routes.CARD.HOME,
      callerParams: undefined,
    });

    const { getByTestId, getByText } = renderWithProvider(
      <SpendingLimitOptionsSheet />,
      {},
      true,
      false,
    );

    fireEvent.changeText(
      getByTestId('limit-option-restricted-input'),
      'abc$50.00xyz',
    );
    fireEvent.press(getByText('Confirm'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.HOME, {
      returnedLimitType: 'restricted',
      returnedCustomLimit: expect.stringMatching(/^[\d.]*$/),
    });
  });
});
