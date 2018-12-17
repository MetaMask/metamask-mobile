/* globals Web3 */
window.web3 = new Web3(window.ethereum);
if (!window.chrome) {
	window.chrome = { webstore: true };
}
