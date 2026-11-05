import React, { useCallback, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
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
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import {
  METAMASK_PRIVACY_NOTICE_URL,
  METAMASK_TERMS_URL,
  VERIFIED_IDENTITY_DELETE_LEARN_MORE_URL,
} from '../../../Ramp/Views/VirtualBankAccount/constants';
import { trackIdentityTerms } from '../../utils/trackIdentityTerms';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_CONTENT_STATE,
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import {
  InlineLink,
  TermsCard,
  TermsLinkRow,
  TermsParty,
  TermsSectionTitle,
  TermsStepCounter,
} from './IdentityTermsComponents';

const verifyIdentityString = (key: string) =>
  strings(`virtual_bank_account.verify_identity.${key}`);

const VERIFICATION_STEPS = [
  {
    id: 'photograph-id',
    icon: IconName.Card,
    title: 'step_photograph_id',
  },
  {
    id: 'take-selfie',
    icon: IconName.FaceId,
    title: 'step_take_selfie',
  },
  {
    id: 'confirm-details',
    icon: IconName.UserCheck,
    title: 'step_confirm_details',
  },
  {
    id: 'answer-questions',
    icon: IconName.Clipboard,
    title: 'step_answer_questions',
  },
] as const;

const BENEFITS = [
  { id: 'reuse', icon: IconName.Flash },
  { id: 'control', icon: IconName.Key },
  { id: 'delete', icon: IconName.Trash },
] as const;

interface VbaVerifyIdentityProps {
  /** Opens Our verification partners (screen 2 of 2). */
  onContinue: () => void;
}

/**
 * Screen 1 of 2 of the identity terms: MetaMask's own consent. It names idOS
 * only (idOS engages Sumsub), links MetaMask's Terms of Use and Privacy Notice,
 * and Agree and Continue (always enabled) opens Our verification partners,
 * where idOS and Sumsub are agreed to before the camera opens. Back exits the
 * flow to Money home.
 */
const VbaVerifyIdentity = ({ onContinue }: VbaVerifyIdentityProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  useScreenPerformance({
    config: KYC_SCREEN_PERFORMANCE_CONFIG,
    screenId: KYC_SCREEN_ID.IDENTITY_VERIFICATION_TERMS,
    contentReady: true,
    contentState: KYC_SCREEN_CONTENT_STATE.POPULATED,
  });

  const handleBack = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  useEffect(() => {
    trackIdentityTerms('viewed');
  }, []);

  return (
    <Box twClassName="flex-1 bg-default">
      <SafeAreaView
        edges={['right', 'bottom', 'left']}
        style={tw.style('flex-1')}
      >
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          onBack={handleBack}
          backButtonProps={{
            accessibilityLabel: strings('navigation.back'),
            testID: VbaVerifyIdentitySelectorsIDs.BACK_BUTTON,
          }}
          endAccessory={
            <TermsStepCounter
              current={1}
              testID={VbaVerifyIdentitySelectorsIDs.STEP_COUNTER}
            />
          }
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow pb-6')}
          testID={VbaVerifyIdentitySelectorsIDs.CONTAINER}
        >
          <TitleStandard
            title={verifyIdentityString('title')}
            bottomLabel={verifyIdentityString('description')}
            twClassName="px-4 pb-4"
          />
          <Box>
            {VERIFICATION_STEPS.map((step) => (
              <ListItem
                key={step.id}
                variant={ListItemVariant.OneLine}
                avatar={
                  <AvatarIcon
                    iconName={step.icon}
                    severity={AvatarIconSeverity.Neutral}
                    size={AvatarIconSize.Lg}
                  />
                }
                title={verifyIdentityString(step.title)}
                testID={`${VbaVerifyIdentitySelectorsIDs.STEP}-${step.id}`}
              />
            ))}
          </Box>

          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            twClassName="px-4 pb-1 pt-6"
          >
            {verifyIdentityString('partners_heading')}
          </Text>
          <Box>
            {BENEFITS.map((benefit) => (
              <ListItem
                key={benefit.id}
                variant={ListItemVariant.MultiLine}
                avatar={
                  <AvatarIcon
                    iconName={benefit.icon}
                    severity={AvatarIconSeverity.Neutral}
                    size={AvatarIconSize.Lg}
                  />
                }
                title={verifyIdentityString(`benefit_${benefit.id}_title`)}
                description={
                  benefit.id === 'delete' ? (
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {verifyIdentityString('benefit_delete_body')}{' '}
                      <InlineLink
                        url={VERIFIED_IDENTITY_DELETE_LEARN_MORE_URL}
                        variant={TextVariant.BodySm}
                        testID={VbaVerifyIdentitySelectorsIDs.LEARN_MORE_LINK}
                      >
                        {verifyIdentityString('learn_more_link')}
                      </InlineLink>
                    </Text>
                  ) : (
                    verifyIdentityString(`benefit_${benefit.id}_body`)
                  )
                }
                descriptionProps={{ fontWeight: FontWeight.Regular }}
                testID={`${VbaVerifyIdentitySelectorsIDs.BENEFIT}-${benefit.id}`}
              />
            ))}
          </Box>

          <TermsSectionTitle>
            {verifyIdentityString('terms_section_title_metamask')}
          </TermsSectionTitle>
          <TermsCard>
            <TermsParty name={verifyIdentityString('party_metamask')}>
              <TermsLinkRow
                title={verifyIdentityString('footer_terms')}
                url={METAMASK_TERMS_URL}
                testID={VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_ROW}
              />
              <TermsLinkRow
                title={verifyIdentityString('footer_privacy_notice')}
                url={METAMASK_PRIVACY_NOTICE_URL}
                testID={
                  VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_NOTICE_ROW
                }
              />
            </TermsParty>
          </TermsCard>
        </ScrollView>

        <Box twClassName="gap-4 px-4 pb-2 pt-4">
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={VbaVerifyIdentitySelectorsIDs.METAMASK_AGREEMENT}
          >
            {verifyIdentityString('footer_agreement_metamask_start')}
            <InlineLink
              url={METAMASK_TERMS_URL}
              variant={TextVariant.BodySm}
              testID={VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK}
            >
              {verifyIdentityString('footer_terms')}
            </InlineLink>
            {verifyIdentityString('footer_agreement_metamask_middle')}
            <InlineLink
              url={METAMASK_PRIVACY_NOTICE_URL}
              variant={TextVariant.BodySm}
              testID={
                VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_NOTICE_LINK
              }
            >
              {verifyIdentityString('footer_privacy_notice')}
            </InlineLink>
            {verifyIdentityString('footer_agreement_metamask_end')}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onContinue}
            testID={VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON}
          >
            {verifyIdentityString('agree_and_continue_button')}
          </Button>
        </Box>
      </SafeAreaView>
    </Box>
  );
};

export default VbaVerifyIdentity;
