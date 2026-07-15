import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { NetworkManagementItem } from '../NetworksManagementView.types';
import EditNetworkMenu from './EditNetworkMenu';

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const RN = jest.requireActual<typeof import('react')>('react');
    return {
      __esModule: true,
      default: RN.forwardRef(
        (props: { children: React.ReactNode }, _ref: React.Ref<unknown>) =>
          RN.createElement(RN.Fragment, null, props.children),
      ),
    };
  },
);

const mockItem: NetworkManagementItem = {
  chainId: '0xa',
  name: 'Optimism',
  isTestNet: false,
  imageSource: 1,
  rpcUrl: 'https://optimism.example.com',
  hasMultipleRpcs: false,
  isPopular: true,
  isAdded: true,
};

const defaultProps = {
  rpcUrl: 'https://optimism.example.com',
  chainId: '0xa',
  canDelete: true,
  networks: [mockItem],
  onClose: jest.fn(),
  onEdit: jest.fn(),
  onDelete: jest.fn(),
};

const renderMenu = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<EditNetworkMenu {...defaultProps} {...overrides} />);

beforeEach(() => jest.clearAllMocks());

describe('EditNetworkMenu', () => {
  it('renders the edit action', () => {
    const { getByText } = renderMenu();
    expect(getByText(strings('transaction.edit'))).toBeOnTheScreen();
  });

  it('renders the delete action when canDelete is true', () => {
    const { getByText } = renderMenu();
    expect(getByText(strings('app_settings.delete'))).toBeOnTheScreen();
  });

  it('hides the delete action when canDelete is false', () => {
    const { queryByText } = renderMenu({ canDelete: false });
    expect(queryByText(strings('app_settings.delete'))).not.toBeOnTheScreen();
  });

  it('calls onEdit with rpcUrl when edit is pressed', () => {
    const { getByText } = renderMenu();
    fireEvent.press(getByText(strings('transaction.edit')));
    expect(defaultProps.onEdit).toHaveBeenCalledWith(
      'https://optimism.example.com',
    );
  });

  it('calls onDelete with the matching network item when delete is pressed', () => {
    const { getByText } = renderMenu();
    fireEvent.press(getByText(strings('app_settings.delete')));
    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockItem);
  });

  it('does not call onDelete when chainId has no match in networks', () => {
    const { getByText } = renderMenu({ chainId: '0xdeadbeef' });
    fireEvent.press(getByText(strings('app_settings.delete')));
    expect(defaultProps.onDelete).not.toHaveBeenCalled();
  });
});
