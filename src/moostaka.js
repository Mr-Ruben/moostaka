/**
 * Moostaka is a simple single page web application (SPA) framework handling
 * routing and rendering of templates.
 * 
 * @see https://github.com/mrvautin/moostaka
 */
class Moostaka {
    /**
     * Instantiate the SPA
     * 
     * @param {Object} opts - a dictionary of options. Supported keys are:
     *          {string} defaultRoute - the default route. defaults to '/'
     *          {string} viewLocation - a url fragment for locating page
     *                  templates. defaults to '/views'
     */
    constructor(opts) {
        this.routes = [];

        // define the defaults
        this.defaultRoute = '/';
        this.viewLocation = '/views';

        // redirect to default route if none defined
        if(location.pathname === '') {
            history.pushState('data', this.defaultRoute, this.defaultRoute);
        }

        // override the defaults
        if(opts) {
            this.defaultRoute = typeof opts.defaultRoute !== 'undefined' ? opts.defaultRoute : this.defaultRoute;
            this.viewLocation = typeof opts.viewLocation !== 'undefined' ? opts.viewLocation : this.viewLocation;
        }

        let self = this;
        // hook up events
        document.addEventListener('click', (event) => {
            if(event.target.matches('a[href], a[href] *')) {
                event.preventDefault();
                if(event.target.href){
                    let url = event.target.href.replace('http://', '').replace('https://', '').replace(event.target.host, '');
                    history.pushState('data', event.target.textContent, url);
                    self.navigate(url);
                } else {
                    // go to default route
                    history.pushState('data', 'home', this.defaultRoute);
                    self.navigate(this.defaultRoute);
                }
            }
        }, false);

        // pop state
        window.onpopstate = (e) => {
            self.navigate(location.pathname);
        };

        // hook onload event
        window.onload = () => {
            self.navigate(location.pathname);
        };
    }

    /**
     * handle navigation events routing to a "route" if one is defined which
     * matches the specified pathname
     *  
     * @param {string} pathname the uri to change to
     */
    navigate(pathname) {
        if(this.onnavigate) {
            this.onnavigate(pathname);
        }

        // if no path, go to default
        if(!pathname || pathname === '/') {
            pathname = this.defaultRoute;
        }

        let routeMatch = false;
        for(let i = 0, len = this.routes.length; i < len; i++) {
            let params = {};
            let hashParts = pathname.split('/');

            if(typeof this.routes[i].pattern === 'string') {
                let routeParts = this.routes[i].pattern.split('/');
                let thisRouteMatch = true;

                for(let x = 0; x < routeParts.length; x++) {
                    // A wildcard is found, lets break and return what we have already
                    if(routeParts[x] === '*') {
                        break;
                    }

                    // check if segment length differs for strict matching
                    if(routeParts.length !== hashParts.length) {
                        thisRouteMatch = false;
                    }

                    // if not optional params we check it
                    if(routeParts[x].substring(0, 1) !== ':') {
                        if(lowerCase(routeParts[x]) !== lowerCase(hashParts[x])) {
                            thisRouteMatch = false;
                        }
                    } else {
                        // this is an optional param that the user will want
                        let partName = routeParts[x].substring(1);
                        params[partName] = hashParts[x];
                    }
                }

                // if route is matched
                if(thisRouteMatch === true) {
                    routeMatch = true;
                    this.routes[i].handler(params);
                    return;
                }
            } else {
                if(pathname.substring(1).match(this.routes[i].pattern)) {
                    this.routes[i].handler({'hash': pathname.substring(1).split('/')});
                    return;
                }
            }
        }

        // no routes were matched. Redirect to a server side 404 for best SEO
        if(routeMatch === false) {
            history.pushState('data', 'home', this.defaultRoute);
        }
    }

    /**
     * Render a template into a specified HTMLElement node
     * 
     * @param {HTMLElement|string} an element node or a string specifiying an
     *      HTMLElement node e.g. '#content' for <div id="content"></div> 
     * @param {string} view - the name of an .mst file in the views location
     *      to use as a template
     * @param {?object} params - additional parameters for the Mustache template
     *      renderer
     * @param {?object} options - a dictionary of options. supported keys:
     *      {array<string>} tags - a list of delimiters for Mustache to use
     * @param {?function} callback - a callback function to invoke once the
     *      template has been rendered into place
     */
    render(element, view, params, options, callback) {
        let destination = null;
        if(element instanceof HTMLElement) {
            destination = element;
        } else {
            destination = document.querySelector(element);
        }
        if(!params) {
            params = {};
        }
        if(!options) {
            options = {};
        }
        if(options && typeof options.tags === 'undefined') {
            Mustache.tags = [ '{{', '}}' ];
        }
        if(options && typeof options.append === 'undefined') {
            options.append = false;
        }

        let url = this.viewLocation + '/' + view.replace('.mst', '') + '.mst';
        fetch(url).then((response) => {
            return response.text();
        }).then(template => {
            if(options.append === true) {
                destination.innerHTML += Mustache.render(template, params);
            } else {
                while(destination.firstChild) {
                    destination.removeChild(destination.firstChild);
                }
                destination.innerHTML = Mustache.render(template, params);
            }
            if(callback instanceof Function) {
                callback();
            }
        });
    }

    /**
     * Render a template and the as rendered template to the callback as a
     * string parameter
     * 
     * @param {string} view - the name of an .mst file in the views location
     *      to use as a template
     * @param {?object} params - additional parameters for the Mustache template
     *      renderer
     * @param {?object} options - a dictionary of options. supported keys:
     *      {array<string>} tags - a list of delimiters for Mustache to use
     * @param {function} callback - a callback function to invoke once the
     *      template has been rendered. The string value of the rendered
     *      template will be passed to the function as its first and only
     *      paramter
     */
    getHtml(view, params, options, callback) {
        if(!(callback instanceof Function)) {
            throw new TypeError("callback is not a function");
        }
        if(!params) {
            params = {};
        }
        if(!options) {
            options = {};
        }
        if(typeof options.tags === 'undefined') {
            Mustache.tags = [ '{{', '}}' ];
        } else {
            Mustache.tags = options.tags;
        }
        if(typeof options.markdown === 'undefined') {
            options.markdown = false;
        }

        let url = this.viewLocation + '/' + view.replace('.mst', '') + '.mst';
        fetch(url).then(response => {
            return response.text();
        }).then(template => {
            if(window.markdownit && options.markdown === true) {
                let md = window.markdownit();
                callback(Mustache.render(md.render(template), params));
            } else {
                callback(Mustache.render(template, params));
            }
        });
    }

    /**
     * Add a route to the SPA
     * 
     * @param {string} pattern - a pattern string that if matched to the URI
     *      will cause the specified handler to be invoked 
     * @param {function} handler - a callback function to invoke when the user
     *      navigates to this route.
     */
    route(pattern, handler) {
        this.routes.push({pattern: pattern, handler: handler});
    }
}

function lowerCase(value){
    if(value){
        return value.toLowerCase();
    }
    return value;
}
