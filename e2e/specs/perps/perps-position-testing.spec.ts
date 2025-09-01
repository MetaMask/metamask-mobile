import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePerps } from '../../tags';
import { loginToApp } from '../../viewHelper';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import PerpsView from '../../pages/Perps/PerpsView';
import { PerpsE2EMockService } from '../../api-mocking/mock-responses/perps-e2e-mocks';
import { PerpsHelpers } from './helpers/perps-helpers';

describe(SmokePerps('Perps Position Testing Profile'), () => {
  it('valida posiciones iniciales y actualiza una posición', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .withPerpsProfile('position-testing')
          .ensureSolanaModalSuppressed()
          .build(),
        restartDevice: true,
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
      },
      async () => {
        await loginToApp();
        await PerpsHelpers.navigateToPerpsTab();

        // Verificar presencia de las tres posiciones del perfil
        await PerpsView.expectPerpsTabPosition('ETH', 3, 'long', 0);
        await PerpsView.expectPerpsTabPosition('BTC', 10, 'short', 1);
        await PerpsView.expectPerpsTabPosition('SOL', 20, 'long', 2);

        // Actualizar PnL de ETH y volver a verificar
        const svc = PerpsE2EMockService.getInstance();
        svc.mockUpdatePosition('ETH', {
          unrealizedPnl: '200.00',
          returnOnEquity: '0.08',
        });

        // Revalidar que sigue visible (la UI se actualiza por subscripción)
        await PerpsView.expectPerpsTabPosition('ETH', 3, 'long', 0);
      },
    );
  });
});
