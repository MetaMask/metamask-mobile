const santizeUrl = (url: string) => {
    return url.replace(/\/$/, '');
};

export default santizeUrl;