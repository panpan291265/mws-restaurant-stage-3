class UrlHelper {

    static get ROOT_URL() {
        let rootUrl = window.location.pathname;
        const slashPos = rootUrl.indexOf('/');
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
        if (path && path !== '/') {
            if (path.startsWith('/'))
                path = path.substring(1);
            url += path;
        }
        return url;
    }

    static getParameterByName(name, url) {
        if (!url)
          url = window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
          results = regex.exec(url);
        if (!results)
          return null;
        if (!results[2])
          return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
      }    

    static goToUrl(path) {
        let url = UrlHelper.getUrl(path);
        window.location.href = url;
    }

}