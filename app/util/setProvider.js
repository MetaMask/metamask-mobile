/* globals Web3 */
window.web3 = new Web3(window.ethereum);
if (!window.chrome) {
	window.chrome = { webstore: true };
	window.ethereum.isMetaMask = window.web3.currentProvider.isMetaMask = true;
}
