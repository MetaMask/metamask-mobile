import React, { useCallback, useState } from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import MetamaskRewardsPointsAlternativeImage from '../../../../../images/rewards/metamask-rewards-points-alternative.svg';
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
  const [isSuccess, setIsSuccess] = useState(false);

  const { linkAccountAddress, isLoading } = useLinkAccountAddress(true);

  const handlePress = useCallback(async () => {
    if (!account) {
      return;
    }

    const success = await linkAccountAddress(account);
    if (success) {
      setIsSuccess(true);
    }
  }, [account, linkAccountAddress]);

  // Don't render if no account available or if successfully linked
  if (!account || isSuccess) {
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
