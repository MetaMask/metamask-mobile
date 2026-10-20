import React, { useCallback } from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { setApplePayHomeBannerDismissed } from '../../../core/redux/slices/card';
import ManageCardListItem from '../../UI/Card/components/ManageCardListItem';
import { AddToWalletButton } from '../../UI/Card/pushProvisioning/components/AddToWalletButton';
import { getWalletName } from '../../UI/Card/pushProvisioning/constants';
import applePayMark from '../../UI/Card/components/ApplePayUsageSheet/assets/apple-pay-mark.png';
import hero from '../../UI/Card/Views/ApplePaySplash/assets/hero.png';
import { navigateToApplePayEntry } from '../../UI/Card/Views/ApplePaySplash/navigateToApplePayEntry';
import { usePresentApplePayHomeSplash } from '../../UI/Card/Views/ApplePaySplash/usePresentApplePayHomeSplash';
import {
  useApplePayHomeEligibility,
  type ApplePayHomeEligibility,
} from '../../UI/Card/Views/ApplePaySplash/useApplePayHomeEligibility';

const ApplePayHomeBanner = ({
  eligibility,
}: {
  eligibility: ApplePayHomeEligibility;
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const tw = useTailwind();

  const handlePress = useCallback(() => {
    if (eligibility.mode === 'none') {
      return;
    }
    navigateToApplePayEntry(navigation, eligibility.mode);
  }, [eligibility.mode, navigation]);

  const handleClose = useCallback(() => {
    dispatch(setApplePayHomeBannerDismissed(true));
  }, [dispatch]);

  if (eligibility.mode === 'none') {
    return null;
  }

  return (
    <Box
      twClassName="mx-4 mt-4 flex-row items-center gap-3 rounded-xl bg-background-muted p-3"
      testID="apple-pay-home-banner"
    >
      <Image
        source={hero}
        resizeMode="contain"
        accessible={false}
        style={tw.style('h-16 w-12')}
      />
      <Box twClassName="min-w-0 flex-1 gap-2">
        <Text variant={TextVariant.BodyMd}>
          {strings('card.apple_pay_home_banner.description')}
        </Text>
        {eligibility.showRegionLine ? (
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {strings('banner.card.subtitle')}
          </Text>
        ) : null}
        {eligibility.mode === 'sign_in' ? (
          <ManageCardListItem
            title={strings('card.push_provisioning.add_to_wallet', {
              walletName: getWalletName(),
            })}
            startAccessory={
              <Image
                source={applePayMark}
                resizeMode="contain"
                accessible={false}
                style={tw.style('w-8 h-5')}
              />
            }
            rightIcon={IconName.ArrowRight}
            onPress={handlePress}
            testID="apple-pay-home-banner-add-row"
          />
        ) : (
          <AddToWalletButton
            onPress={handlePress}
            buttonStyle="black"
            testID="apple-pay-home-banner-add"
          />
        )}
      </Box>
      <Box flexDirection={BoxFlexDirection.Column}>
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Sm}
          onPress={handleClose}
          accessibilityLabel={strings('card.apple_pay_splash.close')}
          testID="apple-pay-home-banner-close"
        />
      </Box>
    </Box>
  );
};

const ApplePayHomePrompt = () => {
  const eligibility = useApplePayHomeEligibility();
  usePresentApplePayHomeSplash(eligibility);

  if (!eligibility.showBanner) {
    return null;
  }

  return <ApplePayHomeBanner eligibility={eligibility} />;
};

export default ApplePayHomePrompt;
