module.exports = setupMetamaskMeshMetrics;

/**
 * Injects an iframe into the current document for testing
 */
function setupMetamaskMeshMetrics() {
	let document = document || null;
	if (document) {
		const testingContainer = document.createElement('iframe');
		testingContainer.src = 'https://metamask.github.io/mesh-testing/';
		console.log('Injecting MetaMask Mesh testing client');
		document.head.appendChild(testingContainer);
	}
}
