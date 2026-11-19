import React, { useCallback, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Label,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { useStyles } from '../../../../hooks/useStyles';
import {
  navigateWithDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import DepositTextField from '../../components/DepositTextField';
import DepositProgressBar from '../../components/DepositProgressBar';
import PoweredByTransak from '../../components/PoweredByTransak';
import PrivacySection from '../../components/PrivacySection';
import {
  createOptionSelectorModalNavigationDetails,
  type SelectOption,
} from '../Modals/OptionSelectorModal';
import { createStateSelectorStyles } from './StateSelector.styles';
import styleSheet from './SourceOfIncome.styles';
import { SOURCE_OF_INCOME_TEST_IDS } from './SourceOfIncome.testIds';

export interface SourceOfIncomeParams {
  sourceOfFundsTypeOptions: SelectOption[];
  employmentStatusOptions: SelectOption[];
  countryOfCitizenshipOptions: SelectOption[];
}

/**
 * Navigates into the Ramp stack from outside it (for example Ramp Settings).
 */
export const createSourceOfIncomeNavDetails = (params: SourceOfIncomeParams) =>
  [
    Routes.RAMP.TOKEN_SELECTION,
    {
      screen: Routes.RAMP.TOKEN_SELECTION_ROOT,
      params: { screen: Routes.RAMP.SOURCE_OF_INCOME, params },
    },
  ] as const;

interface SelectFieldProps {
  label: string;
  placeholder: string;
  options: SelectOption[];
  value?: string;
  onPress: () => void;
  testID: string;
}

const SelectField = ({
  label,
  placeholder,
  options,
  value,
  onPress,
  testID,
}: SelectFieldProps) => {
  const { styles } = useStyles(createStateSelectorStyles, {});
  const selectedName = options.find((option) => option.value === value)?.name;

  return (
    <View style={styles.field}>
      <Label style={styles.label}>{label}</Label>
      <TouchableOpacity
        style={styles.selectorTouchable}
        onPress={onPress}
        activeOpacity={0.7}
        testID={testID}
      >
        <Text
          style={
            selectedName
              ? styles.selectorText
              : [styles.selectorText, styles.placeholderText]
          }
          numberOfLines={1}
        >
          {selectedName ?? placeholder}
        </Text>
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
          style={styles.icon}
        />
      </TouchableOpacity>
    </View>
  );
};

const SourceOfIncome = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { styles } = useStyles(styleSheet, {});
  const {
    sourceOfFundsTypeOptions,
    employmentStatusOptions,
    countryOfCitizenshipOptions,
  } = useParams<SourceOfIncomeParams>();

  const [monthlyVolume, setMonthlyVolume] = useState('');
  const [sourceOfFundsType, setSourceOfFundsType] = useState<string>();
  const [employmentStatus, setEmploymentStatus] = useState<string>();
  const [countryOfCitizenship, setCountryOfCitizenship] = useState<string>();

  const isComplete = Boolean(
    monthlyVolume &&
      sourceOfFundsType &&
      employmentStatus &&
      countryOfCitizenship,
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleMonthlyVolumeChange = useCallback((text: string) => {
    setMonthlyVolume(text.replace(/\D/g, ''));
  }, []);

  const openPicker = useCallback(
    (
      title: string,
      options: SelectOption[],
      selectedValue: string | undefined,
      onSelect: (value: string) => void,
    ) => {
      navigateWithDetails(
        navigation,
        createOptionSelectorModalNavigationDetails({
          title,
          options,
          selectedValue,
          onSelect,
        }),
      );
    },
    [navigation],
  );

  const handleContinue = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          title={strings('deposit.basic_info.navbar_title')}
          onBack={handleBack}
          backButtonProps={{ testID: SOURCE_OF_INCOME_TEST_IDS.BACK_BUTTON }}
          includesTopInset
        />
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenLayout.Content>
            <DepositProgressBar steps={5} currentStep={4} />
            <Text variant={TextVariant.HeadingMd} style={styles.title}>
              {strings('deposit.source_of_income.title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              style={styles.subtitle}
            >
              {strings('deposit.source_of_income.subtitle')}
            </Text>
            <DepositTextField
              label={strings('deposit.source_of_income.monthly_volume')}
              placeholder={strings(
                'deposit.source_of_income.monthly_volume_placeholder',
              )}
              value={monthlyVolume}
              onChangeText={handleMonthlyVolumeChange}
              keyboardType="number-pad"
              returnKeyType="done"
              containerStyle={styles.volumeField}
              testID={SOURCE_OF_INCOME_TEST_IDS.MONTHLY_VOLUME_INPUT}
            />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              style={styles.helper}
            >
              {strings('deposit.source_of_income.monthly_volume_helper')}
            </Text>
            <SelectField
              label={strings('deposit.source_of_income.source_of_funds')}
              placeholder={strings(
                'deposit.source_of_income.source_of_funds_placeholder',
              )}
              options={sourceOfFundsTypeOptions}
              value={sourceOfFundsType}
              onPress={() =>
                openPicker(
                  strings('deposit.source_of_income.source_of_funds'),
                  sourceOfFundsTypeOptions,
                  sourceOfFundsType,
                  setSourceOfFundsType,
                )
              }
              testID={SOURCE_OF_INCOME_TEST_IDS.SOURCE_OF_FUNDS_FIELD}
            />
            <SelectField
              label={strings('deposit.source_of_income.employment_status')}
              placeholder={strings(
                'deposit.source_of_income.employment_status_placeholder',
              )}
              options={employmentStatusOptions}
              value={employmentStatus}
              onPress={() =>
                openPicker(
                  strings('deposit.source_of_income.employment_status'),
                  employmentStatusOptions,
                  employmentStatus,
                  setEmploymentStatus,
                )
              }
              testID={SOURCE_OF_INCOME_TEST_IDS.EMPLOYMENT_STATUS_FIELD}
            />
            <SelectField
              label={strings('deposit.source_of_income.nationality')}
              placeholder={strings(
                'deposit.source_of_income.nationality_placeholder',
              )}
              options={countryOfCitizenshipOptions}
              value={countryOfCitizenship}
              onPress={() =>
                openPicker(
                  strings('deposit.source_of_income.nationality'),
                  countryOfCitizenshipOptions,
                  countryOfCitizenship,
                  setCountryOfCitizenship,
                )
              }
              testID={SOURCE_OF_INCOME_TEST_IDS.NATIONALITY_FIELD}
            />
          </ScreenLayout.Content>
        </KeyboardAwareScrollView>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content style={styles.footerContent}>
          <PrivacySection />
          <Button
            size={ButtonSize.Lg}
            variant={ButtonVariant.Primary}
            isFullWidth
            isDisabled={!isComplete}
            onPress={handleContinue}
            testID={SOURCE_OF_INCOME_TEST_IDS.CONTINUE_BUTTON}
          >
            {strings('deposit.source_of_income.continue')}
          </Button>
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default SourceOfIncome;
