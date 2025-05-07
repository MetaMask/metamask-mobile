import { AnvilManager,defaultOptions } from './anvil-manager';

type Hex = `0x${string}`;

async function main(): Promise<void> {
    const server = new AnvilManager();
    await server.start(defaultOptions);

    const accounts = await server.getAccounts();
    const firstAccount = accounts[0] as Hex;
    const balanceInWei = '10';

    await server.setAccountBalance(balanceInWei,firstAccount);

    // eslint-disable-next-line no-console
    console.log(accounts);

    await server.quit();
}

main()
