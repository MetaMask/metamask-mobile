import React, { useCallback, useRef, useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import useAuthentication from '../../../../../core/Authentication/hooks/useAuthentication';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { CardHomeSelectors } from '../../Views/CardHome/CardHome.testIds';

interface PasswordBottomSheetParams {
  onSuccess: () => void;
}

export const createPasswordBottomSheetNavigationDetails =
  createNavigationDetails<PasswordBottomSheetParams>(
    Routes.CARD.MODALS.ID,
    Routes.CARD.MODALS.PASSWORD,
  );

const PasswordBottomSheet: React.FC = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const { onSuccess } = useParams<PasswordBottomSheetParams>();
  const { reauthenticate } = useAuthentication();
  const theme = useTheme();
  const tw = useTailwind();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!password.trim()) {
      setError(strings('card.password_bottomsheet.error_empty'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await reauthenticate(password);
      sheetRef.current?.onCloseBottomSheet(() => {
        onSuccess?.();
      });
    } catch {
      setError(strings('card.password_bottomsheet.error_incorrect'));
    } finally {
      setIsLoading(false);
    }
  }, [password, reauthenticate, onSuccess]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const isIOS = Platform.OS === 'ios';

  const content = (
    <>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('card.password_bottomsheet.title')}
        </Text>
      </BottomSheetHeader>

      <View style={tw.style('px-4 pb-4')}>
        <Text
          variant={TextVariant.BodyMD}
          style={tw.style('text-text-alternative mb-4')}
        >
          {strings('card.password_bottomsheet.description')}
        </Text>

        <TextInput
          ref={passwordInputRef}
          style={tw.style(
            'border border-border-default rounded-lg px-4 py-3 text-text-default bg-background-default',
            error && 'border-error-default',
          )}
          placeholder={strings('card.password_bottomsheet.placeholder')}
          placeholderTextColor={theme.colors.text.muted}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleSubmit}
          testID={CardHomeSelectors.PASSWORD_INPUT}
          editable={!isLoading}
        />

        {error && (
          <Text
            variant={TextVariant.BodySM}
            style={tw.style('text-error-default mt-2')}
            testID={CardHomeSelectors.PASSWORD_ERROR}
          >
            {error}
          </Text>
        )}
      </View>

      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        buttonPropsArray={[
          {
            label: strings('card.password_bottomsheet.cancel'),
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
            onPress: handleClose,
            testID: CardHomeSelectors.PASSWORD_CANCEL_BUTTON,
          },
          {
            label: strings('card.password_bottomsheet.confirm'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            onPress: handleSubmit,
            loading: isLoading,
            testID: CardHomeSelectors.PASSWORD_CONFIRM_BUTTON,
          },
        ]}
      />
    </>
  );

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      testID={CardHomeSelectors.PASSWORD_BOTTOM_SHEET}
      keyboardAvoidingViewEnabled={isIOS}
    >
      {isIOS ? (
        content
      ) : (
        <KeyboardAwareScrollView
          enableOnAndroid
          enableAutomaticScroll
          extraScrollHeight={200}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={tw.style('pb-2')}
        >
          {content}
        </KeyboardAwareScrollView>
      )}
    </BottomSheet>
  );
};

export default PasswordBottomSheet;
