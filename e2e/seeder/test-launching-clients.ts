import {createAnvilClients} from './anvil-clients'
import { createAnvil } from '@viem/anvil';

async function main(){
    const server = createAnvil();
    await server.start();

   const {walletClient} = createAnvilClients(1337, 8545);

   const accounts = await walletClient.getAddresses();

   // eslint-disable-next-line no-console
   console.log(accounts);

   await server.stop();
}

main();