import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  ListItem,
  ListItemVariant,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import useMoneyVaultApy from '../../../Money/hooks/useMoneyVaultApy';
import { isPositiveNumberOrZero } from '../../../Money/utils/number';
import MoonPayPoweredByLogo from '../../../../../images/moonpay-powered-by-logo.svg';
import { CreateVirtualBankAccountSelectorsIDs } from './CreateVirtualBankAccount.testIds';
import { useVbaArrivalTime } from './hooks/useVbaArrivalTime';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  VBA_SCREEN_CONTENT_STATE,
  VBA_SCREEN_ID,
  VBA_SCREEN_PERFORMANCE_CONFIG,
} from './vbaScreenPerformance';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

const FeatureRow = ({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) => (
  <ListItem
    variant={ListItemVariant.TwoLines}
    avatar={
      <AvatarIcon iconName={icon} severity={AvatarIconSeverity.Neutral} />
    }
    title={title}
    description={description}
  />
);

interface CreateVirtualBankAccountProps {
  onSuccess: () => void | Promise<void>;
}

const CreateVirtualBankAccount = ({
  onSuccess,
}: CreateVirtualBankAccountProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const { apyPercent } = useMoneyVaultApy();
  const { arrivalTimeframe } = useVbaArrivalTime();

  // The product pitch renders from static content; the vendor terms moved to
  // the KYC terms screen that follows.
  useScreenPerformance({
    config: VBA_SCREEN_PERFORMANCE_CONFIG,
    screenId: VBA_SCREEN_ID.VENDOR_TERMS,
    contentReady: true,
    contentState: VBA_SCREEN_CONTENT_STATE.POPULATED,
  });

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleContinue = useCallback(async () => {
    if (isAdvancing) {
      return;
    }
    setIsAdvancing(true);
    try {
      await onSuccess();
    } finally {
      setIsAdvancing(false);
    }
  }, [isAdvancing, onSuccess]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        onBack={handleBack}
        backButtonProps={{
          testID: CreateVirtualBankAccountSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow pb-6')}
        testID={CreateVirtualBankAccountSelectorsIDs.CONTAINER}
      >
        <TitleStandard
          title={strings(
            'virtual_bank_account.create_virtual_bank_account.title',
          )}
          bottomLabel={strings(
            'virtual_bank_account.create_virtual_bank_account.description',
          )}
          twClassName="px-4 pb-4"
        />

        <Box>
          <FeatureRow
            icon={IconName.MoneyBag}
            title={strings(
              'virtual_bank_account.create_virtual_bank_account.feature_no_fees_title',
            )}
            description={strings(
              'virtual_bank_account.create_virtual_bank_account.feature_no_fees_description',
            )}
          />
          <FeatureRow
            icon={IconName.Clock}
            title={
              arrivalTimeframe
                ? strings(
                    'virtual_bank_account.create_virtual_bank_account.feature_arrives_title',
                    { timeframe: arrivalTimeframe },
                  )
                : strings(
                    'virtual_bank_account.create_virtual_bank_account.feature_arrives_title_no_timeframe',
                  )
            }
            description={strings(
              'virtual_bank_account.create_virtual_bank_account.feature_arrives_description',
            )}
          />
          <FeatureRow
            icon={IconName.Refresh}
            title={strings(
              'virtual_bank_account.create_virtual_bank_account.feature_set_up_title',
            )}
            description={strings(
              'virtual_bank_account.create_virtual_bank_account.feature_set_up_description',
            )}
          />
          <FeatureRow
            icon={IconName.TrendUp}
            title={strings(
              'virtual_bank_account.create_virtual_bank_account.feature_earn_title',
            )}
            description={
              isPositiveNumberOrZero(apyPercent)
                ? strings(
                    'virtual_bank_account.create_virtual_bank_account.feature_earn_description',
                    { percentage: apyPercent },
                  )
                : strings(
                    'virtual_bank_account.create_virtual_bank_account.feature_earn_description_no_apy',
                  )
            }
          />
        </Box>
      </ScrollView>

      <Box twClassName="gap-4 px-4 pt-4 pb-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isAdvancing}
          // The loading state toggles whether Fabric flattens this row. If that
          // lands in the same commit that removes the screen, Android crashes
          // re-parenting the label ("The specified child already has a parent").
          contentWrapperProps={{ collapsable: false }}
          isDisabled={isAdvancing}
          onPress={handleContinue}
          testID={
            CreateVirtualBankAccountSelectorsIDs.AGREE_AND_CONTINUE_BUTTON
          }
        >
          {strings('virtual_bank_account.create_virtual_bank_account.button')}
        </Button>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="h-10 justify-center gap-1 opacity-40"
        >
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings(
              'virtual_bank_account.create_virtual_bank_account.powered_by',
            )}
          </Text>
          <MoonPayPoweredByLogo name="moonpay-powered-by-logo" />
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default CreateVirtualBankAccount;
