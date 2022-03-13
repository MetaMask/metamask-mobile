// eslint-disable-next-line import/prefer-default-export
export const formatId = (id: string) => (id.startsWith('/') ? id : '/' + id);
