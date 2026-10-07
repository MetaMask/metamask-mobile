import { mockTheme } from '../../../../../util/theme';
import additionalVerificationStyleSheet from './AdditionalVerification.styles';
import verifyIdentityStyleSheet from './VerifyIdentity.styles';

describe('NativeFlow image styles', () => {
  it('sizes the AdditionalVerification image from the shorter window side', () => {
    const styles = additionalVerificationStyleSheet({
      theme: mockTheme,
      vars: { shortSide: 400 },
    });

    expect(styles.image).toMatchObject({ width: 400, height: 300 });
  });

  it('sizes the VerifyIdentity image from the shorter window side', () => {
    const styles = verifyIdentityStyleSheet({
      theme: mockTheme,
      vars: { shortSide: 400 },
    });

    expect(styles.image).toMatchObject({ width: 260, height: 196 });
  });
});
