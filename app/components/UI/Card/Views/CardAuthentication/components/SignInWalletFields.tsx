import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  FontWeight,
  Label,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  AvatarAccount,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import SelectField from '../../../components/Onboarding/SelectField';
import {
  getAvatarAccountVariant,
  type AccountAvatarVariant,
} from '../../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { CardAuthenticationSelectors } from '../CardAuthentication.testIds';

interface SignInWalletFieldsProps {
  origin: 'linked' | 'resume' | 'manual';
  displayAccountLabel?: string;
  displayAccountAddress?: string;
  avatarAccountType: AccountAvatarVariant;
  walletError: string | null;
  showSoftLink: boolean;
  onBack?: () => void;
  onSelectAccount: () => void;
  onUseCurrentCard: () => void;
}

const SignInWalletFields = ({
  origin,
  displayAccountLabel,
  displayAccountAddress,
  avatarAccountType,
  walletError,
  showSoftLink,
  onBack,
  onSelectAccount,
  onUseCurrentCard,
}: SignInWalletFieldsProps) => {
  const tw = useTailwind();
  return (
    <Box twClassName="gap-4">
      {origin === 'manual' && onBack && (
        <TouchableOpacity
          onPress={onBack}
          style={tw.style('flex-row items-center gap-2 self-start')}
        >
          <Icon name={IconName.ArrowLeft} size={IconSize.Sm} />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-text-alternative"
          >
            {strings('card.card_authentication.fork_wallet_back')}
          </Text>
        </TouchableOpacity>
      )}

      <Box>
        <Label>{strings('card.card_authentication.account_label')}</Label>
        <SelectField
          value={displayAccountLabel}
          onPress={onSelectAccount}
          testID={CardAuthenticationSelectors.ACCOUNT_SELECT}
          startAccessory={
            displayAccountAddress ? (
              <AvatarAccount
                address={displayAccountAddress}
                variant={getAvatarAccountVariant(avatarAccountType)}
                size={AvatarBaseSize.Sm}
              />
            ) : undefined
          }
        />
        {origin === 'manual' ? (
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-text-alternative mt-1"
          >
            {strings('card.card_authentication.account_helper_pick')}
          </Text>
        ) : null}
        {walletError ? (
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-error-default mt-1"
            testID={CardAuthenticationSelectors.UK_LOGIN_ERROR_TEXT}
          >
            {walletError}
          </Text>
        ) : null}
      </Box>

      {showSoftLink && (
        <TouchableOpacity
          onPress={onUseCurrentCard}
          testID={CardAuthenticationSelectors.RESUME_SOFT_LINK}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-primary-default py-2"
          >
            {strings('card.card_authentication.resume_use_current_card')}
          </Text>
        </TouchableOpacity>
      )}
    </Box>
  );
};

export default SignInWalletFields;
