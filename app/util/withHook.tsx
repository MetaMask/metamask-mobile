import React from 'react';

export const withHook = (hook: any) => (Component: any) => (props: any) => {
  const hookProps = hook();
  return <Component {...props} {...hookProps} />;
};
