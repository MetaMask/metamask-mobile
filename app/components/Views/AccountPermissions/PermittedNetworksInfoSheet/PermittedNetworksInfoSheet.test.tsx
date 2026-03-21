import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PermittedNetworksInfoSheet from './PermittedNetworksInfoSheet';
import { strings } from '../../../../../locales/i18n';
import { PermittedNetworksInfoSheetTestIds } from './PermittedNetworksInfoSheet.constants';

const mockHandleClose = jest.fn() as jest.Mock<void, []>;

jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const MockBottomSheet = ({
      children,
      ref,
    }: {
      children: React.ReactNode;
      ref: { current: { onCloseBottomSheet: () => void } | null };
    }) => {
      if (ref) {
        ref.current = {
          onCloseBottomSheet: mockHandleClose,
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
