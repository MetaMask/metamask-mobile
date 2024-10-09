import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { EtherscanSupportedHexChainId } from '@metamask/preferences-controller';
import images from 'images/image-icons';
import renderWithProvider from '../../../util/test/renderWithProvider';
import NetworkCell from './NetworkCell';
import Networks from '../../../util/networks';
import {
  MAINNET_SECONDARY_TEXT,
  INCOMING_MAINNET_TOGGLE,
} from '../../Views/Settings/IncomingTransactionsSettings/index.constants';

describe('NetworkCell', () => {
  const { name: mainnetName, chainId } = Networks.mainnet;
  const mockToggleEnableIncomingTransactions = jest.fn();
  const mockShowIncomingTransactionsNetworks = { [chainId]: true };

  const defaultProps = {
    name: mainnetName,
    chainId: chainId as EtherscanSupportedHexChainId,
    imageSource: images.ETHEREUM,
    secondaryText: MAINNET_SECONDARY_TEXT,
    showIncomingTransactionsNetworks: mockShowIncomingTransactionsNetworks,
    toggleEnableIncomingTransactions: mockToggleEnableIncomingTransactions,
    testID: INCOMING_MAINNET_TOGGLE,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<NetworkCell {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should display the correct network name', () => {
    const { getByText } = renderWithProvider(<NetworkCell {...defaultProps} />);
    expect(getByText(mainnetName)).toBeTruthy();
  });

  it('should display the correct secondary text', () => {
    const { getByText } = renderWithProvider(<NetworkCell {...defaultProps} />);
    expect(getByText(MAINNET_SECONDARY_TEXT)).toBeTruthy();
  });

  it('should have the correct switch value', () => {
    const { getByTestId } = renderWithProvider(
      <NetworkCell {...defaultProps} />,
    );
    const switchComponent = getByTestId(INCOMING_MAINNET_TOGGLE);
    expect(switchComponent.props.value).toBe(true);
  });

  it('should call toggleEnableIncomingTransactions when switch is toggled', () => {
    const { getByTestId } = renderWithProvider(
      <NetworkCell {...defaultProps} />,
    );
    const switchComponent = getByTestId(INCOMING_MAINNET_TOGGLE);

    fireEvent(switchComponent, 'onValueChange', false);

    expect(mockToggleEnableIncomingTransactions).toHaveBeenCalledWith(
      chainId,
      false,
    );
  });
});
