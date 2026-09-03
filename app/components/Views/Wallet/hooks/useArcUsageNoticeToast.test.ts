import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import {
  ButtonIconVariant,
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { storeArcUsageNoticeShown } from '../../../../actions/legalNotices';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useArcUsageNoticeToast } from './useArcUsageNoticeToast';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseIsFocused = useIsFocused as jest.MockedFunction<
  typeof useIsFocused
>;

function renderWithToast({
  shouldShow,
  isFocused,
}: {
  shouldShow: boolean;
  isFocused: boolean;
}) {
  const showToast = jest.fn();
  const closeToast = jest.fn();
  const dispatch = jest.fn();
  const built = { name: 'built' };
  const builder = {
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn(() => built),
  };
  mockCreateEventBuilder.mockReturnValue(builder);
  mockUseSelector.mockReturnValue(shouldShow);
  mockUseDispatch.mockReturnValue(dispatch);
  mockUseIsFocused.mockReturnValue(isFocused);

  const toastRef = { current: { showToast, closeToast } };
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      ToastContext.Provider,
      { value: { toastRef } as never },
      children,
    );

  renderHook(() => useArcUsageNoticeToast(), { wrapper });
  return { showToast, closeToast, dispatch, builder, built };
}

describe('useArcUsageNoticeToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the toast with the notice copy when focused and eligible', () => {
    const { showToast } = renderWithToast({
      shouldShow: true,
      isFocused: true,
    });

    expect(showToast).toHaveBeenCalledTimes(1);
    const options = showToast.mock.calls[0][0];
    expect(options.labelOptions[0].label).toBe('Notice');
    expect(options.descriptionOptions.description).toBe(
      'Welcome to Arc! To facilitate and verify your usage of Arc chain, we may share information with Arc team.',
    );
  });

  it('shows the toast with the spec display options when focused and eligible', () => {
    const { showToast } = renderWithToast({
      shouldShow: true,
      isFocused: true,
    });

    expect(showToast.mock.calls[0][0]).toMatchObject({
      variant: ToastVariants.Plain,
      hasNoTimeout: true,
      labelOptions: [{ isBold: true }],
      closeButtonOptions: {
        variant: ButtonIconVariant.Icon,
        iconName: IconName.Close,
      },
    });
  });

  it('stores the shown flag when focused and eligible', () => {
    const { dispatch } = renderWithToast({
      shouldShow: true,
      isFocused: true,
    });

    expect(dispatch).toHaveBeenCalledWith(storeArcUsageNoticeShown());
  });

  it('tracks the Viewed event with the Arc chain id when focused and eligible', () => {
    const { builder, built } = renderWithToast({
      shouldShow: true,
      isFocused: true,
    });

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.ARC_USAGE_NOTICE_TOAST_VIEWED,
    );
    expect(builder.addProperties).toHaveBeenCalledWith({
      chain_id_caip: 'eip155:5042',
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(built);
  });

  it('tracks Dismissed and closes the toast when the close button is pressed', () => {
    const { showToast, closeToast, built } = renderWithToast({
      shouldShow: true,
      isFocused: true,
    });
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();

    showToast.mock.calls[0][0].closeButtonOptions.onPress();

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.ARC_USAGE_NOTICE_TOAST_DISMISSED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(built);
    expect(closeToast).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the selector is false', () => {
    const { showToast, dispatch } = renderWithToast({
      shouldShow: false,
      isFocused: true,
    });

    expect(showToast).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('does nothing while the wallet screen is not focused', () => {
    const { showToast, dispatch } = renderWithToast({
      shouldShow: true,
      isFocused: false,
    });

    expect(showToast).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
