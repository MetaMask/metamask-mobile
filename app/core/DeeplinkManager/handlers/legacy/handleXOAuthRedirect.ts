export const handleXOAuthRedirect = ({
  xOAuthPath,
}: {
  xOAuthPath: string;
}) => {
  const cleanPath = xOAuthPath.startsWith('?')
    ? xOAuthPath.slice(1)
    : xOAuthPath;
  const urlParams = new URLSearchParams(cleanPath);

  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const error = urlParams.get('error');

  // console.log('X OAuth Redirect:', { code, state, error });

  // TODO: Implement X OAuth flow here
};
