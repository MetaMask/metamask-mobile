import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import Routes from '../../constants/navigation/Routes';
import useTooltipModal from './useTooltipModal';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../constants/navigation/Routes', () => ({
  __esModule: true,
  default: {
    MODAL: {
      ROOT_MODAL_FLOW: 'RootModalFlow',
    },
    SHEET: {
      TOOLTIP_MODAL: 'TooltipModal',
    },
  },
}));

interface TooltipModalNavigateParams {
  screen: string;
  params: {
    title: string;
    tooltip: string | React.ReactNode;
    footerText?: string;
    buttonText?: string;
    bottomPadding?: number;
  };
}

describe('useTooltipModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates with string tooltip params', () => {
    const { result } = renderHook(() => useTooltipModal());
    const title = 'Title';
    const tooltip = 'Tooltip text';
    const footerText = 'Footer text';
    const buttonText = 'Button text';

    result.current.openTooltipModal(title, tooltip, footerText, buttonText);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.TOOLTIP_MODAL,
      params: {
        title,
        tooltip,
        footerText,
        buttonText,
        bottomPadding: undefined,
      },
    });
  });

  it('navigates with ReactNode tooltip params', () => {
    const { result } = renderHook(() => useTooltipModal());
    const title = 'Title';
    const TooltipContent = () => null;
    const tooltip = <TooltipContent />;

    result.current.openTooltipModal(title, tooltip);

    const navigateParams = mockNavigate.mock
      .calls[0][1] as TooltipModalNavigateParams;

    expect(navigateParams.params.tooltip).toBe(tooltip);
  });

  it('includes bottomPadding when provided', () => {
    const { result } = renderHook(() => useTooltipModal());
    const title = 'Title';
    const tooltip = 'Tooltip text';
    const bottomPadding = 24;

    result.current.openTooltipModal(title, tooltip, undefined, undefined, {
      bottomPadding,
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.TOOLTIP_MODAL,
      params: {
        title,
        tooltip,
        footerText: undefined,
        buttonText: undefined,
        bottomPadding,
      },
    });
  });

  it('returns stable openTooltipModal reference across rerenders', () => {
    const { result, rerender } = renderHook(() => useTooltipModal());
    const firstReturnValue = result.current;
    const firstOpenTooltipModal = result.current.openTooltipModal;

    rerender();

    expect(result.current).toBe(firstReturnValue);
    expect(result.current.openTooltipModal).toBe(firstOpenTooltipModal);
  });
});
