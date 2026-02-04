import React, { useMemo } from 'react';
import { TouchableOpacity, Linking } from 'react-native';
import { useSelector } from 'react-redux';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import TagBase, {
  TagSeverity,
  TagShape,
} from '../../../../../component-library/base-components/TagBase';
import { strings } from '../../../../../../locales/i18n';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../../../Earn/constants/networks';
import { PERPS_SUPPORT_ARTICLES_URLS } from '../../constants/perpsConfig';
import { usePerpsEventTracking } from '../../hooks';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '../../constants/eventNames';
import { FillType, PerpsTransaction } from '../../types/transactionHistory';

interface PerpsFillTagProps {
  transaction: PerpsTransaction;
  /**
   * Optional screen name for analytics tracking
   * Defaults to PERPS_ACTIVITY_HISTORY
   */
  screenName?: string;
}

/**
 * A reusable component that displays forced trade pills (Take Profit, Stop Loss, Liquidation, ADL)
 * for perps transactions based on their fill type.
 */
const PerpsFillTag: React.FC<PerpsFillTagProps> = ({
  transaction,
  screenName = PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_ACTIVITY_HISTORY,
}) => {
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );

  const { track } = usePerpsEventTracking();

  const tagElement = useMemo(() => {
    const { fill } = transaction;

    if (!fill) {
      return null;
    }

    if (fill.fillType === FillType.Standard) {
      return null;
    }

    const fillTypeConfigLookup = {
      [FillType.AutoDeleveraging]: {
        label: strings('perps.transactions.order.auto_deleveraging'),
        severity: TagSeverity.Info,
        textColor: TextColor.Default,
        includesBorder: false,
      },
      [FillType.Liquidation]: {
        // Only show if liquidated user is current user
        // Ensure both values exist to prevent undefined === undefined being true
        condition:
          fill.liquidation?.liquidatedUser != null &&
          selectedAccount?.address != null &&
          fill.liquidation.liquidatedUser === selectedAccount.address,
        label: strings('perps.transactions.order.liquidated'),
        severity: TagSeverity.Danger,
        textColor: TextColor.Error,
        includesBorder: false,
      },
      [FillType.TakeProfit]: {
        label: strings('perps.transactions.order.take_profit'),
        severity: TagSeverity.Default,
        textColor: TextColor.Alternative,
        includesBorder: true,
      },
      [FillType.StopLoss]: {
        label: strings('perps.transactions.order.stop_loss'),
        severity: TagSeverity.Default,
        textColor: TextColor.Alternative,
        includesBorder: true,
      },
    };

    const tagConfig = fillTypeConfigLookup[fill.fillType];

    if (!tagConfig || ('condition' in tagConfig && !tagConfig.condition)) {
      return null;
    }

    const tagContent = (
      <TagBase
        shape={TagShape.Pill}
        severity={tagConfig.severity}
        includesBorder={tagConfig.includesBorder}
      >
        <Text variant={TextVariant.BodyXSMedium} color={tagConfig.textColor}>
          {tagConfig.label}
        </Text>
      </TagBase>
    );

    // Only wrap in TouchableOpacity for ADL fill type which has an action.
    // For other fill types, render the tag directly to allow touch events
    // to bubble up to parent row's navigation handler.
    if (fill.fillType === FillType.AutoDeleveraging) {
      const onTagPress = () => {
        Linking.openURL(PERPS_SUPPORT_ARTICLES_URLS.AdlUrl).catch((error) => {
          console.error('Error opening ADL support article:', error);
        });
        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
          [PERPS_EVENT_PROPERTY.SCREEN_NAME]: screenName,
          [PERPS_EVENT_PROPERTY.TAB_NAME]:
            PERPS_EVENT_VALUE.PERPS_HISTORY_TABS.TRADES,
          [PERPS_EVENT_PROPERTY.ACTION_TYPE]:
            PERPS_EVENT_VALUE.ACTION_TYPE.ADL_LEARN_MORE,
          [PERPS_EVENT_PROPERTY.ASSET]: transaction.asset,
          [PERPS_EVENT_PROPERTY.ORDER_TIMESTAMP]: transaction.timestamp,
        });
      };

      return (
        <TouchableOpacity onPress={onTagPress}>{tagContent}</TouchableOpacity>
      );
    }

    return tagContent;
  }, [transaction, selectedAccount?.address, track, screenName]);

  return tagElement;
};

export default PerpsFillTag;
