import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PermittedNetworksInfoSheet from './PermittedNetworksInfoSheet';
import { strings } from '../../../../../locales/i18n';
import { PermittedNetworksInfoSheetTestIds } from './PermittedNetworksInfoSheet.constants';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

describe('PermittedNetworksInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display the correct title', () => {
    const { getByText } = renderWithProvider(<PermittedNetworksInfoSheet />);
    expect(
      getByText(strings('permissions.permitted_networks')),
    ).toBeOnTheScreen();
  });

  it('should display the correct description', () => {
    const { getByText } = renderWithProvider(<PermittedNetworksInfoSheet />);
    expect(
      getByText(
        strings('permissions.permitted_networks_info_sheet_description'),
      ),
    ).toBeOnTheScreen();
  });

  it('should display the "Got it" button with correct text', () => {
    const { getByText } = renderWithProvider(<PermittedNetworksInfoSheet />);
    expect(getByText(strings('permissions.got_it'))).toBeOnTheScreen();
  });

  it('should apply correct styles to containers', () => {
    const { getByTestId } = renderWithProvider(<PermittedNetworksInfoSheet />);

    const mainContainer = getByTestId(
      PermittedNetworksInfoSheetTestIds.CONTAINER,
    );
    const descriptionContainer = getByTestId(
      PermittedNetworksInfoSheetTestIds.DESCRIPTION_CONTAINER,
    );
    const buttonsContainer = getByTestId(
      PermittedNetworksInfoSheetTestIds.BUTTONS_CONTAINER,
    );

    expect(mainContainer.props.style).toMatchObject({
      paddingHorizontal: 16,
      alignItems: 'center',
    });

    expect(descriptionContainer.props.style).toMatchObject({
      marginBottom: 16,
    });

    expect(buttonsContainer.props.style).toMatchObject({
      flexDirection: 'row',
      gap: 16,
    });
  });

  it('navigates back when Got It button is pressed', () => {
    const { getByTestId } = renderWithProvider(<PermittedNetworksInfoSheet />);

    fireEvent.press(
      getByTestId(PermittedNetworksInfoSheetTestIds.GOT_IT_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
