import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PercentageRow } from './percentage-row';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { strings } from '../../../../../../../locales/i18n';
import { MUSD_CONVERSION_APY } from '../../../../../UI/Earn/constants/musd';
import { MUSD_EVENTS_CONSTANTS } from '../../../../../UI/Earn/constants/events';
import { TransactionType } from '@metamask/transaction-controller';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import AppConstants from '../../../../../../core/AppConstants';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();

jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

function render() {
  return renderWithProvider(<PercentageRow />);
}

describe('PercentageRow', () => {
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    mockBuild.mockReturnValue({ name: 'mock-built-event' });
    mockAddProperties.mockImplementation(() => ({ build: mockBuild }));
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
    }));

    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.musdConversion,
    } as ReturnType<typeof useTransactionMetadataRequest>);
  });

  it('renders label, tooltip trigger and APY when not loading', () => {
    const { getByText, getByTestId } = render();

    expect(getByText(strings('earn.claimable_bonus'))).toBeOnTheScreen();
    expect(getByTestId('info-row-tooltip-open-btn')).toBeOnTheScreen();
    expect(getByText(`${MUSD_CONVERSION_APY}%`)).toBeOnTheScreen();
  });

  it('renders skeleton when transaction pay is loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = render();

    expect(getByTestId('percentage-row-skeleton')).toBeOnTheScreen();
  });

  it('opens the tooltip modal when the info button is pressed', () => {
    const { getByTestId, getByText } = render();

    fireEvent.press(getByTestId('info-row-tooltip-open-btn'));

    expect(
      getByText(strings('earn.claimable_bonus_tooltip'), { exact: false }),
    ).toBeOnTheScreen();
    expect(getByTestId('percentage-row-tooltip-terms-link')).toBeOnTheScreen();
  });

  it('tracks the terms-of-use event and opens the URL when the terms link is pressed', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(undefined);

    const { getByTestId } = render();

    fireEvent.press(getByTestId('info-row-tooltip-open-btn'));
    fireEvent.press(getByTestId('percentage-row-tooltip-terms-link'));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.MUSD_BONUS_TERMS_OF_USE_PRESSED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.PERCENTAGE_ROW,
      url: AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    expect(openUrlSpy).toHaveBeenCalledWith(
      AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
    );
  });

  it('renders nothing for non-musdConversion transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.simpleSend,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { toJSON } = render();

    expect(toJSON()).toBeNull();
  });
});
