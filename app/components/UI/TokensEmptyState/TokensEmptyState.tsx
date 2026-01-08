import React from 'react';
import { Image } from 'react-native';
import {
  TabEmptyState,
  type TabEmptyStateProps,
} from '../../../component-library/components-temp/TabEmptyState';
import { useAssetFromTheme } from '../../../util/theme';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import emptyStateDefiLight from '../../../images/empty-state-defi-light.png';
import emptyStateDefiDark from '../../../images/empty-state-defi-dark.png';

interface TokensEmptyStateProps extends TabEmptyStateProps {}

export const TokensEmptyState: React.FC<TokensEmptyStateProps> = ({
  ...props
}) => {
  const tokensImage = useAssetFromTheme(
    emptyStateDefiLight,
    emptyStateDefiDark,
  );
  const tw = useTailwind();
  const navigation = useNavigation();

  const handleLink = () => {
    navigation.navigate(Routes.SETTINGS_VIEW, {
      screen: Routes.ONBOARDING.GENERAL_SETTINGS,
    });
  };

  return (
    <TabEmptyState
      testID="tokens-empty-state"
      icon={
        <Image
          source={tokensImage}
          resizeMode="contain"
          style={tw.style('w-[72px] h-[72px]')}
        />
      }
      description={strings('wallet.tokens_empty_description')}
      actionButtonText={strings('wallet.show_tokens_without_balance')}
      actionButtonProps={{
        onPress: handleLink,
      }}
      {...props}
    />
  );
};
