import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { NetworksManagementViewSelectorsIDs } from '../NetworksManagementView.testIds';
import DeleteNetworkModal from './DeleteNetworkModal';

describe('DeleteNetworkModal', () => {
  const networkName = 'TestNet';
  const onClose = jest.fn();
  const onConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal content', () => {
    const { getByTestId, getByText } = render(
      <DeleteNetworkModal
        ref={null}
        networkName={networkName}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(
      getByTestId(NetworksManagementViewSelectorsIDs.DELETE_MODAL),
    ).toBeOnTheScreen();
    expect(
      getByText(
        `${strings('app_settings.delete')} ${networkName} ${strings('app_settings.network')}`,
      ),
    ).toBeOnTheScreen();
    expect(getByText(strings('app_settings.network_delete'))).toBeOnTheScreen();
  });

  it('calls onClose from cancel button', () => {
    const { getByTestId } = render(
      <DeleteNetworkModal
        ref={null}
        networkName={networkName}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(
      getByTestId(NetworksManagementViewSelectorsIDs.DELETE_CANCEL_BUTTON),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm from delete button', () => {
    const { getByTestId } = render(
      <DeleteNetworkModal
        ref={null}
        networkName={networkName}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(
      getByTestId(NetworksManagementViewSelectorsIDs.DELETE_CONFIRM_BUTTON),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
