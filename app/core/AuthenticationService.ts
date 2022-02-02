export enum AuthenticationType {
	BIOMETRIC = 'Biometric',
	PIN_CODE = 'PinCode',
	PASSWORD = 'Password',
}

const AuthenticationService = () => {
	const login = () => {
		//Unlock KeyringController
		//Set state values
	};
	const logout = () => {
		//Unlock KeyringController
		//Set state values
	};
	const checkAuthenticationMethod = () => {
		//Access SecureKeyChain
		//Return Auth Type
	};
};

export default AuthenticationService;
