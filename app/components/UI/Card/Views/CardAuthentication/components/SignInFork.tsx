import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { CardAuthenticationSelectors } from '../CardAuthentication.testIds';

interface SignInForkProps {
  reason: 'no_match' | 'check_failed';
  onSelectEmail: () => void;
  onSelectWallet: () => void;
  onTryAgain: () => void;
  onNotSure: () => void;
}

const SignInFork = ({
  reason,
  onSelectEmail,
  onSelectWallet,
  onTryAgain,
  onNotSure,
}: SignInForkProps) => {
  const tw = useTailwind();
  return (
    <Box
      twClassName="gap-3"
      testID={CardAuthenticationSelectors.FORK_CONTAINER}
    >
      <Box twClassName="gap-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('card.card_authentication.fork_title')}
        </Text>
        <Text variant={TextVariant.BodyMd} twClassName="text-text-alternative">
          {strings(
            reason === 'check_failed'
              ? 'card.card_authentication.fork_body_api_error'
              : 'card.card_authentication.fork_body',
          )}
        </Text>
      </Box>

      <TouchableOpacity
        onPress={onSelectEmail}
        testID={CardAuthenticationSelectors.FORK_EMAIL}
        style={tw.style(
          'flex-row items-center gap-3 p-4 rounded-xl border border-border-muted bg-background-muted',
        )}
      >
        <Icon name={IconName.Mail} size={IconSize.Lg} />
        <Box twClassName="flex-1 gap-0.5">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('card.card_authentication.fork_email_title')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-text-alternative"
          >
            {strings('card.card_authentication.fork_email_body')}
          </Text>
        </Box>
        <Icon name={IconName.ArrowRight} size={IconSize.Sm} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onSelectWallet}
        testID={CardAuthenticationSelectors.FORK_WALLET}
        style={tw.style(
          'flex-row items-center gap-3 p-4 rounded-xl border border-border-muted bg-background-muted',
        )}
      >
        <Icon name={IconName.Wallet} size={IconSize.Lg} />
        <Box twClassName="flex-1 gap-0.5">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('card.card_authentication.fork_wallet_title')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-text-alternative"
          >
            {strings('card.card_authentication.fork_wallet_body')}
          </Text>
        </Box>
        <Icon name={IconName.ArrowRight} size={IconSize.Sm} />
      </TouchableOpacity>

      {reason === 'check_failed' && (
        <TouchableOpacity
          onPress={onTryAgain}
          testID={CardAuthenticationSelectors.FORK_TRY_AGAIN}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-text-alternative py-2"
          >
            {strings('card.card_authentication.fork_try_again')}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={onNotSure}
        testID={CardAuthenticationSelectors.FORK_NOT_SURE}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-primary-default py-2"
        >
          {strings('card.card_authentication.fork_not_sure')}
        </Text>
      </TouchableOpacity>
    </Box>
  );
};

export default SignInFork;
