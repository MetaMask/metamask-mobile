const { getLocal } = require('mockttp');

const mockServer = getLocal();

async function startMockServer() {
    // Start the server on any available port
    await mockServer.start();

    // Intercept GET requests to the specific URL and respond with a custom response
    await mockServer.get('/networks/1/suggestedGasFees')
        .forHost('gas.api.cx.metamask.io')
        .withHeaders({ 'x-client-id': 'mobile' })
        .thenReply(200, JSON.stringify({ message: 'Mocked response from mockttp!' }), {
            'Content-Type': 'application/json'
        });

    console.log(`Mock server running at ${mockServer.url}`);
}

// Call the function to start the mock server
startMockServer();

// Stop the server when the script is terminated
process.on('SIGINT', async () => {
    await mockServer.stop();
    console.log('Mock server stopped');
    process.exit();
});
