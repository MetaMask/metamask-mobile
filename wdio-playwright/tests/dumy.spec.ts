import LoginView from '../../e2e/pages/wallet/LoginView';
import { test } from '../fixture';

test('dummy test', async () => {
  // await LoginView.enterPassword('MetaMaskQA123');
  await (await LoginView.passwordInput).fill('MetaMaskQA123');
  await (await LoginView.unlockButton).tap();

  await new Promise((resolve) => setTimeout(resolve, 5000));

  // expect(element).toBeDefined();
  // // Use existing Detox-style PO with Appium-backed compat layer
  // await LoginView.enterPassword('Secret123');
  // await new Promise((resolve) => setTimeout(resolve, 1000));
});
