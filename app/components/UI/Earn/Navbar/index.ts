import { strings } from '../../../../../locales/i18n';
import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import { withMetaMetrics } from '../../Stake/utils/metaMetrics/withMetaMetrics';
import { EARN_ACTIONS } from '../Views/InputView/InputView.types';

interface GetEarnNavbarOptions {
  action: EARN_ACTIONS;
  tokenSymbol: string;
  onBack?: () => void;
}

export const getEarnNavbar = withMetaMetrics(
  ({ tokenSymbol, onBack }: GetEarnNavbarOptions) => {
    const title = strings('earn.input_view.title', {
      action: strings('earn.deposit').toLowerCase(),
      token: tokenSymbol,
    });

    return {
      title,
      onBack,
      eventProperties: {
        token_symbol: tokenSymbol,
        action: 'deposit',
        view: 'input',
      },
    };
  },
  {
    event: {
      category: EVENT_NAME.NAVIGATION_DRAWER,
      properties: {
        action: 'EARN',
      },
    },
  },
);
