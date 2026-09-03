import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { ButtonVariant } from '@metamask/design-system-react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../util/test/initial-root-state';
import RampInfoBottomSheet, {
  type RampInfoBottomSheetProps,
} from './RampInfoBottomSheet';

const mockOnCloseBottomSheet = jest.fn();

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        { children, testID }: { children: React.ReactNode; testID?: string },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});

const TEST_IDS = {
  MODAL: 'ramp-info-bottom-sheet',
  CLOSE_BUTTON: 'bottomsheetheader-close-button',
} as const;

function renderSheet(props: Partial<RampInfoBottomSheetProps> = {}) {
  const Component = () => (
    <RampInfoBottomSheet
      testIDs={TEST_IDS}
      title="Title copy"
      description="Description copy"
      actions={[{ label: 'Got it', variant: ButtonVariant.Primary }]}
      {...props}
    />
  );

  return renderScreen(
    Component,
    { name: Routes.SHEET.RAMPS_SERVICE_DISRUPTION_MODAL },
    { state: initialRootState },
  );
}

describe('RampInfoBottomSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the title, description and sheet testID', () => {
    renderSheet();

    expect(screen.getByTestId(TEST_IDS.MODAL)).toBeOnTheScreen();
    expect(screen.getByText('Title copy')).toBeOnTheScreen();
    expect(screen.getByText('Description copy')).toBeOnTheScreen();
  });

  it('renders every provided action button', () => {
    renderSheet({
      actions: [
        { label: 'Contact support', variant: ButtonVariant.Secondary },
        { label: 'Got it', variant: ButtonVariant.Primary },
      ],
    });

    expect(screen.getByText('Contact support')).toBeOnTheScreen();
    expect(screen.getByText('Got it')).toBeOnTheScreen();
  });

  it('closes the sheet when the header close button is pressed', () => {
    renderSheet();

    fireEvent.press(screen.getByTestId(TEST_IDS.CLOSE_BUTTON));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet when an action without a custom handler is pressed', () => {
    renderSheet();

    fireEvent.press(screen.getByText('Got it'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('invokes a custom action handler instead of closing the sheet', () => {
    const onPress = jest.fn();
    renderSheet({
      actions: [
        { label: 'Contact support', variant: ButtonVariant.Secondary, onPress },
      ],
    });

    fireEvent.press(screen.getByText('Contact support'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(mockOnCloseBottomSheet).not.toHaveBeenCalled();
  });
});
