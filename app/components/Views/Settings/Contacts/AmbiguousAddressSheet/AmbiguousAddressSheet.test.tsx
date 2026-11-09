import React from 'react';
import AmbiguousAddressSheet from './AmbiguousAddressSheet';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { fireEvent, screen } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  const ReactNative =
    jest.requireActual<typeof import('react-native')>('react-native');
  const actual = jest.requireActual(
    '@metamask/design-system-react-native',
  ) as Record<string, unknown>;

  return {
    ...actual,
    BottomSheet: ReactModule.forwardRef(
      (
        { children, goBack }: { children: React.ReactNode; goBack: () => void },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: goBack,
        }));
        return <ReactNative.View>{children}</ReactNative.View>;
      },
    ),
  };
});

describe('AmbiguousAddressSheet', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('should render correctly', () => {
    renderScreen(AmbiguousAddressSheet, {
      name: Routes.SHEET.AMBIGUOUS_ADDRESS,
    });
    expect(
      screen.getByText(strings('duplicate_address.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('duplicate_address.body')),
    ).toBeOnTheScreen();
  });

  it('closes when the confirmation button is pressed', () => {
    renderScreen(AmbiguousAddressSheet, {
      name: Routes.SHEET.AMBIGUOUS_ADDRESS,
    });

    fireEvent.press(screen.getByText(strings('duplicate_address.button')));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('closes when the header close button is pressed', () => {
    renderScreen(AmbiguousAddressSheet, {
      name: Routes.SHEET.AMBIGUOUS_ADDRESS,
    });

    fireEvent.press(screen.getByTestId('ambiguous-address-sheet-close'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
