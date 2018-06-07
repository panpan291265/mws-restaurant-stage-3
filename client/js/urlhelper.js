class UrlHelper {

    static get ROOT_URL() {
        let rootUrl = window.location.pathname;
        const slashPos = rootUrl.lastIndexOf('/');
        if (slashPos >= 0)
            rootUrl = rootUrl.substring(0, slashPos);
        if (!rootUrl) {
            rootUrl = '/';
        } else {
            if (!rootUrl.endsWith('/'))
                rootUrl += '/';
        }
        return rootUrl;
    }

    static getUrl(path) {
        let url = UrlHelper.ROOT_URL;
        if (path && path !== '/')
            url += path;
        return url;
    }

    static goToUrl(path) {
        let url = UrlHelper.getUrl(path);
        window.location.href = url;
    }

}