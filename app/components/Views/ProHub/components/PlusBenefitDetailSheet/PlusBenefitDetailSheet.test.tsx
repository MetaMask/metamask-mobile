import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import PlusBenefitDetailSheet from './PlusBenefitDetailSheet';
import { PlusBenefitDetailSheetTestIds } from './PlusBenefitDetailSheet.testIds';
import {
  PlusBenefitDetailStatus,
  type PlusBenefitDetail,
} from '../MemberPricingOnTrades/mapPlusBenefitToDetail';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: unknown[]) => ({}),
  }),
}));

const toRegex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const swapsDetail: PlusBenefitDetail = {
  id: 'swaps',
  titleKey: 'pro_hub.member_pricing.swaps.label',
  status: PlusBenefitDetailStatus.Available,
  kind: 'currency',
  used: 100,
  remaining: 400,
  allowance: 500,
  feePercent: '0.3%',
  resetsOn: 'Sep 15',
  ctaRoute: Routes.BRIDGE.ROOT,
  ctaLabelKey: 'pro_hub.benefit_detail.cta.swaps',
  showRetry: false,
};

describe('PlusBenefitDetailSheet', () => {
  it('renders usage, reset date, fee, and status for a swaps benefit', () => {
    const { getByTestId } = render(
      <PlusBenefitDetailSheet
        detail={swapsDetail}
        onClose={jest.fn()}
        onRetry={jest.fn()}
        onCta={jest.fn()}
      />,
    );

    expect(getByTestId(PlusBenefitDetailSheetTestIds.TITLE)).toHaveTextContent(
      strings('pro_hub.member_pricing.swaps.label'),
    );
    expect(getByTestId(PlusBenefitDetailSheetTestIds.STATUS)).toHaveTextContent(
      strings('pro_hub.benefit_detail.status.available'),
    );
    expect(getByTestId(PlusBenefitDetailSheetTestIds.USED)).toHaveTextContent(
      toRegex('$100'),
    );
    expect(
      getByTestId(PlusBenefitDetailSheetTestIds.REMAINING),
    ).toHaveTextContent(toRegex('$400'));
    expect(
      getByTestId(PlusBenefitDetailSheetTestIds.RESETS_ON),
    ).toHaveTextContent(
      strings('pro_hub.member_pricing.resets_on', { date: 'Sep 15' }),
    );
    expect(getByTestId(PlusBenefitDetailSheetTestIds.FEE)).toHaveTextContent(
      toRegex('0.3%'),
    );
  });

  it('navigates when the CTA is pressed', () => {
    const onCta = jest.fn();

    const { getByTestId } = render(
      <PlusBenefitDetailSheet
        detail={swapsDetail}
        onClose={jest.fn()}
        onRetry={jest.fn()}
        onCta={onCta}
      />,
    );

    fireEvent.press(getByTestId(PlusBenefitDetailSheetTestIds.CTA));

    expect(onCta).toHaveBeenCalledWith(Routes.BRIDGE.ROOT);
  });

  it('exposes an accessibility label with status and allowance', () => {
    const { getByLabelText } = render(
      <PlusBenefitDetailSheet
        detail={swapsDetail}
        onClose={jest.fn()}
        onRetry={jest.fn()}
        onCta={jest.fn()}
      />,
    );

    expect(
      getByLabelText(
        strings('pro_hub.benefit_detail.accessibility', {
          title: strings('pro_hub.member_pricing.swaps.label'),
          status: strings('pro_hub.benefit_detail.status.available'),
          used: '$100',
          limit: '$500',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('calls retry when the benefit is temporarily unavailable', () => {
    const onRetry = jest.fn();
    const unavailable: PlusBenefitDetail = {
      id: 'perps',
      titleKey: 'pro_hub.member_pricing.perps.label',
      status: PlusBenefitDetailStatus.Unavailable,
      showRetry: true,
    };

    const { getByTestId } = render(
      <PlusBenefitDetailSheet
        detail={unavailable}
        onClose={jest.fn()}
        onRetry={onRetry}
        onCta={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId(PlusBenefitDetailSheetTestIds.RETRY));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('opens the protection learn-more URL', () => {
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const protection: PlusBenefitDetail = {
      id: 'transaction_protection',
      titleKey: 'pro_hub.also_included.transaction_protection.title',
      status: PlusBenefitDetailStatus.Available,
      learnMoreUrl: 'https://metamask.io',
      showRetry: false,
    };

    const { getByTestId } = render(
      <PlusBenefitDetailSheet
        detail={protection}
        onClose={jest.fn()}
        onRetry={jest.fn()}
        onCta={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId(PlusBenefitDetailSheetTestIds.LEARN_MORE));

    expect(openUrl).toHaveBeenCalledWith('https://metamask.io');
    openUrl.mockRestore();
  });
});
