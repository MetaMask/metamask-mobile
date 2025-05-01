import { AnvilManager } from './anvil-manager';
// import { createAnvil } from '@viem/anvil';

async function main(){
    const Anvil = new AnvilManager();
    await Anvil.start({hardfork:'London'});
    
//    const {walletClient,publicClient,testClient} = createAnvilClients(1337, 8545);

   const accounts = await Anvil.getAccounts();
   const balanceInWei = '10';

   await Anvil.setAccountBalance(accounts[0],balanceInWei)


   // eslint-disable-next-line no-console
   console.log(accounts);

   await Anvil.quit();
}

main();