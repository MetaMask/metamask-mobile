import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
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
import CardFormField from '../../../components/Onboarding/CardFormField';

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
          accessibilityRole="button"
          style={tw.style('flex-row items-center gap-2 self-start')}
        >
          <Icon name={IconName.ArrowLeft} size={IconSize.Sm} />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('card.card_authentication.fork_wallet_back')}
          </Text>
        </TouchableOpacity>
      )}

      <CardFormField
        label={strings('card.card_authentication.account_label')}
        helpText={
          origin === 'manual'
            ? strings('card.card_authentication.account_helper_pick')
            : undefined
        }
        errorText={walletError}
        errorTestID={CardAuthenticationSelectors.UK_LOGIN_ERROR_TEXT}
      >
        <SelectField
          value={displayAccountLabel}
          onPress={onSelectAccount}
          isError={Boolean(walletError)}
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
      </CardFormField>

      {showSoftLink && (
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Md}
          onPress={onUseCurrentCard}
          testID={CardAuthenticationSelectors.RESUME_SOFT_LINK}
          twClassName="self-start"
        >
          {strings('card.card_authentication.resume_use_current_card')}
        </Button>
      )}
    </Box>
  );
};

export default SignInWalletFields;
