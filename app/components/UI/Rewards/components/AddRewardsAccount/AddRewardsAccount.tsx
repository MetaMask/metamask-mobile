import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import MetamaskRewardsPointsAlternativeImage from '../../../../../images/rewards/metamask-rewards-points-alternative.svg';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { selectSourceToken } from '../../../../../core/redux/slices/bridge';
import { useLinkAccountAddress } from '../../hooks/useLinkAccountAddress';
import { strings } from '../../../../../../locales/i18n';

interface AddRewardsAccountProps {
  account?: InternalAccount;
  testID?: string;
}

const AddRewardsAccount: React.FC<AddRewardsAccountProps> = ({
  account,
  testID = 'add-rewards-account',
}) => {
  const tw = useTailwind();
  const sourceToken = useSelector(selectSourceToken);
  const getSelectedAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const [isSuccess, setIsSuccess] = useState(false);
  const accountScope = useMemo(() => {
    if (account) {
      return account;
    }
    const sourceChainId = sourceToken?.chainId
      ? formatChainIdToCaip(sourceToken.chainId)
      : undefined;
    if (sourceChainId) {
      return getSelectedAccountByScope(sourceChainId);
    }
    return undefined;
  }, [account, sourceToken, getSelectedAccountByScope]);

  const { linkAccountAddress, isLoading } = useLinkAccountAddress(true);

  const handlePress = useCallback(async () => {
    if (!accountScope) {
      return;
    }

    const success = await linkAccountAddress(accountScope);
    if (success) {
      setIsSuccess(true);
    }
  }, [accountScope, linkAccountAddress]);

  // Don't render if no account available or if successfully linked
  if (!accountScope || isSuccess) {
    return null;
  }

  return (
    <Button
      startAccessory={
        <MetamaskRewardsPointsAlternativeImage
          name="MetamaskRewardsPointsAlternative"
          width={16}
          height={16}
        />
      }
      onPress={handlePress}
      isDisabled={isLoading}
      isLoading={isLoading}
      testID={testID}
      size={ButtonSize.Sm}
      variant={ButtonVariant.Tertiary}
      style={tw.style('p-0')}
    >
      {strings('rewards.link_account_group.link_account')}
    </Button>
  );
};

export default AddRewardsAccount;
