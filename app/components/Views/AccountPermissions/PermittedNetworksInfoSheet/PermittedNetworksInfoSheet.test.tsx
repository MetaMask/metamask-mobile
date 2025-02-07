import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PermittedNetworksInfoSheet from './PermittedNetworksInfoSheet';
import { strings } from '../../../../../locales/i18n';
import { PermittedNetworksInfoSheetTestIds } from './PermittedNetworksInfoSheet.constants';

const mockOnCloseBottomSheet = jest.fn();

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const MockBottomSheet = ({ children, ref }: any) => {
      // Assign mock function to ref
      if (ref) {
        ref.current = {
          onCloseBottomSheet: mockOnCloseBottomSheet,
        };
      }
      return <>{children}</>;
    };
    return MockBottomSheet;
  },
);

describe('PermittedNetworksInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<PermittedNetworksInfoSheet />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should display the correct title', () => {
    const { getByText } = renderWithProvider(<PermittedNetworksInfoSheet />);
    expect(getByText(strings('permissions.permitted_networks'))).toBeDefined();
  });

  it('should display the correct description', () => {
    const { getByText } = renderWithProvider(<PermittedNetworksInfoSheet />);
    expect(
      getByText(
        strings('permissions.permitted_networks_info_sheet_description'),
      ),
    ).toBeDefined();
  });

  it('should display the "Got it" button with correct text', () => {
    const { getByText } = renderWithProvider(<PermittedNetworksInfoSheet />);
    expect(getByText(strings('permissions.got_it'))).toBeDefined();
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
});
