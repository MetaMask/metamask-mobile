import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ManualBackupConfirmErrorSheet from './ManualBackupConfirmErrorSheet';
import { ManualBackupConfirmErrorSheetSelectorsIDs } from './ManualBackupConfirmErrorSheet.testIds';
import { strings } from '../../../../locales/i18n';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  const actual = jest.requireActual('@metamask/design-system-react-native');

  return {
    ...actual,
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          testID,
          onClose,
        }: {
          children?: React.ReactNode;
          testID?: string;
          onClose?: () => void;
        },
        ref: React.ForwardedRef<unknown>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: (callback?: () => void) => {
            callback?.();
          },
          onCloseBottomSheet: (callback?: () => void) => {
            onClose?.();
            callback?.();
          },
        }));

        return <RNView testID={testID}>{children}</RNView>;
      },
    ),
  };
});

describe('ManualBackupConfirmErrorSheet', () => {
  it('does not render when hidden', () => {
    const { queryByTestId } = render(
      <ManualBackupConfirmErrorSheet isVisible={false} onDismiss={jest.fn()} />,
    );

    expect(
      queryByTestId(ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET),
    ).toBeNull();
  });

  it('renders title, description, and try-again CTA when visible', () => {
    const { getByTestId, getByText } = render(
      <ManualBackupConfirmErrorSheet isVisible onDismiss={jest.fn()} />,
    );

    expect(
      getByTestId(ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET),
    ).toBeOnTheScreen();
    expect(
      getByTestId(ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET_TITLE),
    ).toHaveTextContent(strings('manual_backup_step_2.error-title'));
    expect(
      getByTestId(
        ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET_DESCRIPTION,
      ),
    ).toHaveTextContent(strings('manual_backup_step_2.error-description'));
    expect(
      getByText(strings('manual_backup_step_2.error-button')),
    ).toBeOnTheScreen();
  });

  it('dismisses when try-again is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <ManualBackupConfirmErrorSheet isVisible onDismiss={onDismiss} />,
    );

    fireEvent.press(
      getByTestId(
        ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET_TRY_AGAIN_BUTTON,
      ),
    );

    expect(onDismiss).toHaveBeenCalled();
  });

  it('dismisses when close is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <ManualBackupConfirmErrorSheet isVisible onDismiss={onDismiss} />,
    );

    fireEvent.press(
      getByTestId(
        ManualBackupConfirmErrorSheetSelectorsIDs.ERROR_SHEET_CLOSE_BUTTON,
      ),
    );

    expect(onDismiss).toHaveBeenCalled();
  });
});
