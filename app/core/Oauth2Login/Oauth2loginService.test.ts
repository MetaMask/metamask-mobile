// import Oauth2LoginService from './Oauth2loginService';

// describe('Oauth2 login', () => {
//   afterEach(() => {
//     StorageWrapper.clearAll();
//     jest.restoreAllMocks();
//   });

//   it('should return a type password', async () => {
//     try {
//       const result = await Oauth2LoginService.handleCodeFlow({
//         provider: 'google',
//         clientId: AndroidGoogleWebGID,
//         idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImMzN2RhNzVjOWZiZTE4YzJjZTkxMjViOWFhMWYzMDBkY2IzMWU4ZDkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI4ODIzNjMyOTE3NTEta3A5NDBzazNoczFzdWVscDl1dXRsMDI3ajRlYmxwczMuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI4ODIzNjMyOTE3NTEtMmEzN2NjaHJxOW9jMWxmajFwNDE5b3R2YWhuYmhndXYuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDE1NTk2NTkyMzQ1MTg0MzgwMzMiLCJoZCI6InRvci51cyIsImVtYWlsIjoiY2hlcm5nd29laUB0b3IudXMiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibm9uY2UiOiIxMjMxMzEyMzEyMyIsIm5hbWUiOiJDaGVybmcgV29laSBMZWUiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS0xlWjdKTzl0aF93bi1fQmJ2WnpMZV8xU0JnSTRFWFdCek13c3FScy1XN25xTEd3PXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IkNoZXJuZyBXb2VpIiwiZmFtaWx5X25hbWUiOiJMZWUiLCJpYXQiOjE3NDQ5ODY3NzMsImV4cCI6MTc0NDk5MDM3M30.RG5U2dFCE2lD5jeO8x6AX4gAiSgqJF8rewzRXsS487K_dzKEcXx2rmsjQWY6YJBiKpb3IAXtMtcPnWC40ctCdtnve0Ox1vv6Copyrz3SEZMzGuZkhQhxGshmVEaSvmr0Vuf7KM-KFMHdj3zDT2sCOqKQ6UdaDHaSDjjx-omuBZNFOFhCrC5weqBQ9E-2Bq1EwNJMnUUiJkNc_sY7SXyAzPlPIfyoRaXt66LA6R2RipQR-2Vf0_tVviScQRkwvtGwDZxgttScoN5CFdSzbpr2olHK3JytqPM9wUc0kE9TrlaYLneKWrWQKwZpauX2uIO2lpGjbn3pTR4GEPdX1TFcWA',
//         web3AuthNetwork: 'sapphire_devnet',
//       });
//       console.log(result);
//       expect(result).toEqual({ type: 'success', existingUser: false });
//     } catch (error) {
//       console.log(error);
//     }
//   });

// });

export async function testCodeFlow() {
  // const result = await Oauth2LoginService.handleSeedlessAuthenticate({
  //   provider: 'google',
  //   clientId: AndroidGoogleWebGID,
  //   idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImMzN2RhNzVjOWZiZTE4YzJjZTkxMjViOWFhMWYzMDBkY2IzMWU4ZDkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI4ODIzNjMyOTE3NTEta3A5NDBzazNoczFzdWVscDl1dXRsMDI3ajRlYmxwczMuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI4ODIzNjMyOTE3NTEtMmEzN2NjaHJxOW9jMWxmajFwNDE5b3R2YWhuYmhndXYuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDE1NTk2NTkyMzQ1MTg0MzgwMzMiLCJoZCI6InRvci51cyIsImVtYWlsIjoiY2hlcm5nd29laUB0b3IudXMiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibm9uY2UiOiIxMjMxMzEyMzEyMyIsIm5hbWUiOiJDaGVybmcgV29laSBMZWUiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS0xlWjdKTzl0aF93bi1fQmJ2WnpMZV8xU0JnSTRFWFdCek13c3FScy1XN25xTEd3PXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IkNoZXJuZyBXb2VpIiwiZmFtaWx5X25hbWUiOiJMZWUiLCJpYXQiOjE3NDQ5ODY3NzMsImV4cCI6MTc0NDk5MDM3M30.RG5U2dFCE2lD5jeO8x6AX4gAiSgqJF8rewzRXsS487K_dzKEcXx2rmsjQWY6YJBiKpb3IAXtMtcPnWC40ctCdtnve0Ox1vv6Copyrz3SEZMzGuZkhQhxGshmVEaSvmr0Vuf7KM-KFMHdj3zDT2sCOqKQ6UdaDHaSDjjx-omuBZNFOFhCrC5weqBQ9E-2Bq1EwNJMnUUiJkNc_sY7SXyAzPlPIfyoRaXt66LA6R2RipQR-2Vf0_tVviScQRkwvtGwDZxgttScoN5CFdSzbpr2olHK3JytqPM9wUc0kE9TrlaYLneKWrWQKwZpauX2uIO2lpGjbn3pTR4GEPdX1TFcWA',
  //   web3AuthNetwork: 'sapphire_devnet',
  // });
  // console.log(result);
}
