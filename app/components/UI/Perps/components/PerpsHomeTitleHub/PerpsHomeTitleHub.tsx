import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import {
  Box,
  BoxFlexDirection,
  SensitiveText,
  SensitiveTextLength,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
  TitleHub,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { selectPerpsNetwork } from '../../selectors/perpsController';
import { usePerpsProvider } from '../../hooks/usePerpsProvider';
import { usePerpsLiveAccount } from '../../hooks/stream';
import { formatPerpsBalance } from '../../utils/formatUtils';
import { PerpsProviderSelectorBadge } from '../PerpsProviderSelector';
import {
  PerpsHomeViewSelectorsIDs,
  PerpsMarketBalanceActionsSelectorsIDs,
} from '../../Perps.testIds';

export interface PerpsHomeTitleHubProps {
  testID?: string;
  twClassName?: string;
}

const PerpsHomeTitleHub: React.FC<PerpsHomeTitleHubProps> = ({
  testID = PerpsHomeViewSelectorsIDs.HOME_HEADING,
  twClassName = 'px-4 pb-3',
}) => {
  const privacyMode = useSelector(selectPrivacyMode);
  const network = useSelector(selectPerpsNetwork);
  const isTestnet = network === 'testnet';
  const { isMultiProviderEnabled } = usePerpsProvider();
  const { account: perpsAccount } = usePerpsLiveAccount({ throttleMs: 1000 });

  const screenTitle = strings('perps.title');
  const totalBalance = perpsAccount?.totalBalance || '0';
  const spendableBalance = perpsAccount?.spendableBalance || '0';
  const totalBn = BigNumber(totalBalance);
  const isBalanceEmpty = !totalBn.isFinite() || totalBn.isZero();

  const titleEndAccessory = useMemo(() => {
    if (isMultiProviderEnabled) {
      return (
        <PerpsProviderSelectorBadge
          testID={testID ? `${testID}-provider-badge` : undefined}
        />
      );
    }

    if (isTestnet) {
      return (
        <Tag
          severity={TagSeverity.Warning}
          testID={testID ? `${testID}-testnet-badge` : undefined}
        >
          Testnet
        </Tag>
      );
    }

    return undefined;
  }, [isMultiProviderEnabled, isTestnet, testID]);

  return (
    <TitleHub
      testID={testID}
      title={screenTitle}
      titleEndAccessory={titleEndAccessory}
      titleProps={{
        testID: testID ? `${testID}-title` : undefined,
      }}
      amount={
        !isBalanceEmpty ? (
          <SensitiveText
            variant={TextVariant.DisplayLg}
            color={TextColor.TextDefault}
            testID={PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE}
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
          >
            {formatPerpsBalance(totalBalance)}
          </SensitiveText>
        ) : undefined
      }
      bottomLabel={
        !isBalanceEmpty ? (
          <Box flexDirection={BoxFlexDirection.Row}>
            <SensitiveText
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              isHidden={privacyMode}
              length={SensitiveTextLength.Short}
              testID={
                PerpsMarketBalanceActionsSelectorsIDs.AVAILABLE_BALANCE_TEXT
              }
            >
              {formatPerpsBalance(spendableBalance)}
            </SensitiveText>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {' '}
              {strings('perps.available')}
            </Text>
          </Box>
        ) : undefined
      }
      twClassName={twClassName}
    />
  );
};

export default PerpsHomeTitleHub;
