import { processNotification } from '@metamask/notification-services-controller/notification-services';
import {
  createMockNotificationERC1155Received,
  createMockNotificationERC1155Sent,
  createMockNotificationERC20Received,
  createMockNotificationERC20Sent,
  createMockNotificationERC721Received,
  createMockNotificationERC721Sent,
  createMockNotificationEthReceived,
  createMockNotificationEthSent,
  createMockNotificationLidoReadyToBeWithdrawn,
  createMockNotificationLidoStakeCompleted,
  createMockNotificationLidoWithdrawalCompleted,
  createMockNotificationLidoWithdrawalRequested,
  createMockNotificationMetaMaskSwapsCompleted,
  createMockNotificationRocketPoolStakeCompleted,
  createMockNotificationRocketPoolUnStakeCompleted,
} from '@metamask/notification-services-controller/notification-services/mocks';
import { createNotificationMessage } from './create-push-message';

describe('notification-message tests', () => {
  test('displays erc20 sent notification', () => {
    const notification = processNotification(createMockNotificationERC20Sent());
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('Funds sent');
    expect(result?.description).toContain('You successfully sent 4.96K USDC');
  });

  test('displays erc20 received notification', () => {
    const notification = processNotification(
      createMockNotificationERC20Received(),
    );
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('Funds received');
    expect(result?.description).toContain('You received 8.38B SHIB');
  });

  test('displays eth/native sent notification', () => {
    const notification = processNotification(createMockNotificationEthSent());
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('Funds sent');
    expect(result?.description).toContain('You successfully sent 0.005 ETH');
  });

  test('displays eth/native received notification', () => {
    const notification = processNotification(
      createMockNotificationEthReceived(),
    );
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('Funds received');
    expect(result?.description).toContain('You received 808 ETH');
  });

  test('displays metamask swap completed notification', () => {
    const notification = processNotification(
      createMockNotificationMetaMaskSwapsCompleted(),
    );
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('Swap complete');
    expect(result?.description).toContain('Your swap is complete.');
  });

  test('displays erc721 sent notification', () => {
    const notification = processNotification(
      createMockNotificationERC721Sent(),
    );
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('NFT sent');
    expect(result?.description).toContain('You successfully sent an NFT');
  });

  test('displays erc721 received notification', () => {
    const notification = processNotification(
      createMockNotificationERC721Received(),
    );
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('NFT received');
    expect(result?.description).toContain('You received new NFTs');
  });

  test('displays erc1155 sent notification', () => {
    const notification = processNotification(
      createMockNotificationERC1155Sent(),
    );
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('NFT sent');
    expect(result?.description).toContain('You successfully sent an NFT');
  });

  test('displays erc1155 received notification', () => {
    const notification = processNotification(
      createMockNotificationERC1155Received(),
    );
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('NFT received');
    expect(result?.description).toContain('You received new NFTs');
  });

  test('displays rocketpool stake completed notification', () => {
    const notification = processNotification(
      createMockNotificationRocketPoolStakeCompleted(),
    );
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('Stake deposited');
    expect(result?.description).toContain(
      'Your Rocket Pool stake deposit is complete.',
    );
  });

  test('displays rocketpool unstake completed notification', () => {
    const notification = processNotification(
      createMockNotificationRocketPoolUnStakeCompleted(),
    );
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('Unstake complete');
    expect(result?.description).toContain(
      'Your Rocket Pool unstake is complete.',
    );
  });

  test('displays lido stake completed notification', () => {
    const notification = processNotification(
      createMockNotificationLidoStakeCompleted(),
    );
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('Stake deposited');
    expect(result?.description).toContain(
      'Your Lido stake deposit is complete.',
    );
  });

  test('displays lido stake ready to be withdrawn notification', () => {
    const notification = processNotification(
      createMockNotificationLidoReadyToBeWithdrawn(),
    );
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('Stake ready to withdraw');
    expect(result?.description).toContain(
      'Your Lido stake is ready to withdraw.',
    );
  });

  test('displays lido withdrawal requested notification', () => {
    const notification = processNotification(
      createMockNotificationLidoWithdrawalRequested(),
    );
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('Withdrawal requested');
    expect(result?.description).toContain(
      'Your Lido withdrawal request was submitted.',
    );
  });

  test('displays lido withdrawal completed notification', () => {
    const notification = processNotification(
      createMockNotificationLidoWithdrawalCompleted(),
    );
    const result = createNotificationMessage(notification);

    expect(result?.title).toBe('Withdrawal complete');
    expect(result?.description).toContain('Your Lido withdrawal is complete.');
  });
});
