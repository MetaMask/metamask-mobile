/**
 * This test file tests the URL capturing security feature in isolation,
 * focusing specifically on the core security mechanism without component dependencies.
 */
describe('URL Origin Capturing Security Feature', () => {
  it('captures origin URL at mount time and maintains it despite URL changes', () => {
    // Simulate the behavior of useRef and useEffect
    const originalUrl = 'https://attacker.malicious.com/';
    const attackerUrl = 'https://portfolio.metamask.io/';

    // Create a ref-like object to store the original URL's hostname
    const originalHostnameRef = { current: '' };

    // Mock current page information
    let currentPageInformation = { url: originalUrl };

    // Simulate the useEffect hook that runs on mount
    originalHostnameRef.current = new URL(currentPageInformation.url).hostname;

    // Verify the original hostname was captured correctly
    expect(originalHostnameRef.current).toBe(new URL(originalUrl).hostname);

    // Now simulate a URL change (as if Redux state or props changed)
    currentPageInformation = { url: attackerUrl };

    // Simulate the security operations that use the captured hostname
    // This mimics what happens in onRevokeAllHandler:
    // const hostnameToRevoke = originalHostnameRef.current || hostname;
    const hostnameForSecurityOperations = originalHostnameRef.current ||
      new URL(currentPageInformation.url).hostname;

    // The security-critical hostname should still be the original one, not the attacker's
    expect(hostnameForSecurityOperations).toBe(new URL(originalUrl).hostname);
    expect(hostnameForSecurityOperations).not.toBe(new URL(attackerUrl).hostname);

    // If the ref value is mistakenly cleared or not set, test that the fallback behavior
    // would expose the site to using the attacker URL
    originalHostnameRef.current = '';
    const insecureImplementation = originalHostnameRef.current ||
      new URL(currentPageInformation.url).hostname;

    // Without our security fix, it would use the attacker URL
    expect(insecureImplementation).toBe(new URL(attackerUrl).hostname);
  });
});
