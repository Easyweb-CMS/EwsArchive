//EwsArchive 1.0
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var EwsArchive = /** @class */ (function () {
    function EwsArchive(options) {
        var _this = this;
        //Default-options?
        this.options = {
            fetchKey: null,
            baseUrl: window.location.pathname,
            mainWrapperSelector: "[ews-archive-wrapper]",
            archiveSelector: "[ews-archive-article-list]",
            articleSelector: "[ews-archive-article]",
            loadMoreSelector: "[ews-archive-loadmore]",
            loadMode: "autoLoad",
            defaultPageSize: 12,
            loaderSelector: "[ews-archive-loader]",
            scrollTopOffset: -300,
            restrictArchive: false,
            pagination: {
                paginateNext: "[ews-archive-paginate-next]",
                paginatePrev: "[ews-archive-paginate-prev]",
            },
            on: {
                loadingChanged: function () { },
                beforeRender: function () { },
                afterRender: function () { },
                beforeFetch: function () { }
            }
        };
        this.loaderEls = null;
        this.autoLoadEl = null;
        this.events = [];
        this.paginationPrev = null;
        this.paginationNext = null;
        //Function for deciding how to render fetched content
        //takes a set appendmode or checks certain requirements
        //looks for changed params to decide wether to replace or use default appendMode depending on loadMode
        this.appendHandler = function () {
            var latestState = window.history.state;
            var key = _this.options.restrictArchive ? "".concat(_this.options.fetchKey, "-p") : "p";
            var changedParams;
            var appendMode = _this.options.loadMode && _this.options.loadMode == "pagination" ? "replace" : "append";
            if (latestState) {
                changedParams = _this.getChangedParams(latestState.name, _this.searchParams.toString());
                if (!(changedParams.length == 1 && changedParams.includes(key))) {
                    _this.searchParams.set(key, String(1));
                    appendMode = "replace";
                }
            }
            return appendMode;
        };
        //Actions
        this.actionAutoLoad = function () {
            var containerPos = _this.autoLoadEl.getBoundingClientRect().y - window.innerHeight;
            if (containerPos < 1) {
                if (_this.loading || _this.endOfItems) {
                    return false;
                }
                else {
                    _this.actionLoadMore();
                }
            }
        };
        this.actionLoadMore = function () {
            _this.setPage(_this.getPage() + 1);
            _this.updateUrlAndFetch();
        };
        this.actionGoToNext = function () {
            var currentPage = _this.getPage();
            if (currentPage < _this.totalPages) {
                _this.setPage(currentPage + 1);
                _this.updateUrlAndFetch();
            }
            else {
                return;
            }
        };
        this.actionGoToPrev = function () {
            var currentPage = _this.getPage();
            if (currentPage > 1) {
                _this.setPage(currentPage - 1);
                _this.updateUrlAndFetch();
            }
            else {
                return;
            }
        };
        //articleArchive takes custom options, custom option keys overwrites defaultOptions
        this.options = __assign(__assign({}, this.options), options);
        //Required! main DOMelement wrapper for the archive, within this el-scope all other elements required should exist
        this.el = document.querySelector(this.options.mainWrapperSelector);
        if (!this.el)
            return;
        this.searchParams = new URLSearchParams(location.search);
        this.archiveEl = this._getElement(this.options.archiveSelector);
        this.loaderEls = this._getElements(this.options.loaderSelector);
        this.autoLoadEl = (this.options.loadMode === "autoLoad") ? this._createRenderReturnAutoLoadEl() : null;
        if (this.options.loadMode === "clickLoad") {
            this.loadMoreBtn = this._getElement(this.options.loadMoreSelector);
            if (!this.loadMoreBtn) {
                this._error("noClickLoadEl");
            }
        }
        if (this.options.loadMode === "pagination") {
            this.paginationNext = this._getElement(this.options.pagination.paginateNext);
            this.paginationPrev = this._getElement(this.options.pagination.paginatePrev);
            if (!this.paginationNext) {
                this._error("noPaginationNextEl");
            }
            if (!this.paginationPrev) {
                this._error("noPaginationPrevEl");
            }
        }
        this.on = {
            loadingChanged: this.options.on.loadingChanged.bind(this),
            beforeRender: this.options.on.beforeRender.bind(this),
            afterRender: this.options.on.afterRender.bind(this),
            beforeFetch: this.options.on.beforeFetch.bind(this)
        };
        //Init
        this._init();
    }
    EwsArchive.prototype._error = function (err) {
        var errorMsgs = {
            noMainWrapper: "Please provide a correct existing DOMElement for the main-wrapper, ".concat(this.options.mainWrapperSelector, " not found"),
            noArticleEl: "No article element found on" + ' "' + this.options.articleSelector + '"',
            notValidFetchKey: "A string value for the fetchKey must be provided",
            noTotalCount: "No total count is defined",
            noClickLoadEl: "Loadmode is set to clickload but couldn't find a clickload element on the ".concat(this.options.loadMoreSelector, " selector"),
            noPaginationNextEl: "Loadmode is set to pagination but couldn't find a paginate next element on the ".concat(this.options.pagination.paginateNext, " selector"),
            noPaginationPrevEl: "Loadmode is set to pagination but couldn't find a paginate prev element on the ".concat(this.options.pagination.paginatePrev, " selector"),
            noEwsTotalCount: "Couldnt find the total count [ews-total-count=number] on the article, this is required for calculating totalitems and totalpages"
        };
        if (errorMsgs.hasOwnProperty(err)) {
            console.error(errorMsgs[err]);
        }
        else {
            console.error("Unknown error");
        }
    };
    EwsArchive.prototype._getElement = function (selector) {
        return this.el.querySelector(selector);
    };
    EwsArchive.prototype._getElements = function (selector) {
        return this.el.querySelectorAll(selector);
    };
    EwsArchive.prototype.getPage = function () {
        var key = this.options.restrictArchive ? "".concat(this.options.fetchKey, "-p") : "p";
        return this.searchParams.get(key) ? Number(this.searchParams.get(key)) : null;
    };
    EwsArchive.prototype.setPage = function (number) {
        var key = this.options.restrictArchive ? "".concat(this.options.fetchKey, "-p") : "p";
        this.searchParams.set(key, number.toString());
    };
    EwsArchive.prototype.getPageSize = function () {
        var key = this.options.restrictArchive ? "".concat(this.options.fetchKey, "-ps") : "ps";
        return this.searchParams.get(key) ? Number(this.searchParams.get(key)) : null;
    };
    EwsArchive.prototype.setPageSize = function (number) {
        var key = this.options.restrictArchive ? "".concat(this.options.fetchKey, "-ps") : "ps";
        this.searchParams.set(key, number.toString());
    };
    EwsArchive.prototype.setParam = function (key, value) {
        var k = this.options.restrictArchive ? "".concat(this.options.fetchKey, "-").concat(key) : key;
        this.searchParams.set(k, value);
    };
    EwsArchive.prototype._init = function () {
        var _a, _b;
        //We always need a p for page, if none is set already, set it to 1    
        (_a = this.getPage()) !== null && _a !== void 0 ? _a : this.setPage(1);
        (_b = this.getPageSize()) !== null && _b !== void 0 ? _b : this.setPageSize(this.options.defaultPageSize);
        this._bindEvents();
        this._updateProperties();
        this._updateDOMelements();
        var page = this.getPage();
        if (page >= this.totalPages) {
            page = this.totalPages;
        }
        if (page < 1) {
            page = 1;
        }
        this.setPage(page);
        if (page > 1 && (this.options.loadMode === "clickLoad" || this.options.loadMode === "autoLoad")) {
            this.actionGoToPage(page);
        }
    };
    EwsArchive.prototype._createRenderReturnAutoLoadEl = function () {
        var autoLoad = document.createElement('div');
        // Set the attribute "ews-autoload" on the div element
        autoLoad.setAttribute('ews-autoload', '');
        autoLoad.style.height = "40px";
        autoLoad.style.marginTop = "10px";
        // Find the element you want to append the div after
        this.el.appendChild(autoLoad);
        return autoLoad;
    };
    EwsArchive.prototype._addEventListener = function (event) {
        // Add to list to unbind when needed
        this.events.push(event);
        // Bind the event
        event.el.addEventListener(event.eventName, event.function);
    };
    //Function for updating various 
    EwsArchive.prototype._updateDOMelements = function () {
        var _a, _b, _c, _d;
        if (this.loadMoreBtn) {
            if (this.endOfItems) {
                this.loadMoreBtn.classList.add("hide");
            }
            else {
                this.loadMoreBtn.classList.remove("hide");
            }
        }
        if (this.autoLoadEl) {
            if (this.endOfItems) {
                this.autoLoadEl.classList.add("hide");
            }
            else {
                this.autoLoadEl.classList.remove("hide");
            }
        }
        if (this.options.loadMode === "pagination") {
            if (this.getPage() === 1) {
                (_a = this.paginationPrev) === null || _a === void 0 ? void 0 : _a.classList.add("inactive");
            }
            else {
                (_b = this.paginationPrev) === null || _b === void 0 ? void 0 : _b.classList.remove("inactive");
            }
            if (this.getPage() === this.totalPages) {
                (_c = this.paginationNext) === null || _c === void 0 ? void 0 : _c.classList.add("inactive");
            }
            else {
                (_d = this.paginationNext) === null || _d === void 0 ? void 0 : _d.classList.remove("inactive");
            }
        }
    };
    EwsArchive.prototype._updateProperties = function () {
        var tc = this._getElement("[ews-total-count]");
        if (!tc) {
            this._error("noEwsTotalCount");
            return;
        }
        this.totalCount = Number(tc.getAttribute("ews-total-count"));
        this.totalPages = Math.ceil(this.totalCount / this.options.defaultPageSize);
        this.currentPage = this.getPage();
        var defaultPageSize = this.options.defaultPageSize;
        var currentTotal = this.currentPage * defaultPageSize;
        this.endOfItems = currentTotal >= this.totalCount;
    };
    EwsArchive.prototype._generateFetchUrl = function (searchParams) {
        var paramsToGenerateFrom = searchParams ? searchParams : this.searchParams;
        return "/template".concat(this.options.baseUrl, "?key=").concat(this.options.fetchKey, "&").concat(paramsToGenerateFrom.toString());
    };
    EwsArchive.prototype._setLoading = function (bool) {
        this.loading = bool;
        this.el.setAttribute("state", bool ? "loading" : "");
        if (this.loaderEls) {
            if (bool) {
                this.loaderEls.forEach(function (x) { return x.classList.add("show"); });
            }
            else {
                this.loaderEls.forEach(function (x) { return x.classList.remove("show"); });
            }
        }
        this.on.loadingChanged(this.loading);
    };
    //Function for fetching items based on the fetchKey
    EwsArchive.prototype._fetchAndRender = function (fetchUrl, appendMode) {
        var _this = this;
        if (appendMode === void 0) { appendMode = "replace"; }
        if (this.options.loadMode == "pagination") {
            window.scrollTo({ top: this.el.offsetTop + this.options.scrollTopOffset });
        }
        this._setLoading(true);
        this.on.beforeFetch();
        return fetch(fetchUrl)
            .then(function (response) { return response.text(); })
            .then(function (data) {
            _this.on.beforeRender();
            _this._renderItems(data, appendMode);
        }).then(function () {
            _this._setLoading(false);
            _this._updateProperties();
            _this._updateDOMelements();
            _this.on.afterRender();
        });
    };
    EwsArchive.prototype._renderItems = function (data, appendMode) {
        if (appendMode === void 0) { appendMode = "replace"; }
        var loadedItems = document.createRange().createContextualFragment(data);
        if (appendMode === "append") {
            this.archiveEl.appendChild(loadedItems);
            return;
        }
        if (appendMode === "replace") {
            this.archiveEl.innerHTML = data;
            return;
        }
        if ((this.options.loadMode === "autoLoad" || this.options.loadMode === "clickLoad") && appendMode === "prepend") {
            this.archiveEl.prepend(loadedItems);
            return;
        }
        this.archiveEl.innerHTML = data;
    };
    EwsArchive.prototype._setParamsAndGoToPage = function () {
        this.setSearchParams();
        this.actionGoToPage(this.getPage());
    };
    EwsArchive.prototype._bindEvents = function () {
        if (this.loadMoreBtn && this.options.loadMode === "clickLoad") {
            this._addEventListener({
                el: this.loadMoreBtn,
                eventName: "click",
                function: this.actionLoadMore
            });
        }
        if (this.autoLoadEl && this.options.loadMode === "autoLoad") {
            this._addEventListener({
                el: document,
                eventName: "scroll",
                function: this.actionAutoLoad
            });
        }
        if (this.options.loadMode === "pagination") {
            this._addEventListener({
                el: window,
                eventName: "popstate",
                function: this._setParamsAndGoToPage
            });
            if (this.paginationNext) {
                this._addEventListener({
                    el: this.paginationNext,
                    eventName: "click",
                    function: this.actionGoToNext
                });
            }
            if (this.paginationPrev) {
                this._addEventListener({
                    el: this.paginationPrev,
                    eventName: "click",
                    function: this.actionGoToPrev
                });
            }
        }
    };
    EwsArchive.prototype._unbindEvents = function () {
        while (this.events.length) {
            var event_1 = this.events.pop();
            event_1.el.removeEventListener(event_1.eventName, event_1.function);
        }
    };
    EwsArchive.prototype.setOptions = function (options) {
        this.options = __assign(__assign({}, this.options), options);
        this._unbindEvents();
        this.setPage(1);
        this._init();
        this.updateUrlAndFetch("replace");
    };
    EwsArchive.prototype.setSearchParams = function (params) {
        if (!params) {
            this.searchParams = new URLSearchParams(location.search);
            return;
        }
        this.searchParams = params;
    };
    //Updates the URL based on current SearchParams and fetches
    EwsArchive.prototype.updateUrlAndFetch = function (appendMode) {
        var urlString = this.options.baseUrl + "?" + this.searchParams.toString();
        var appendMode = appendMode !== null && appendMode !== void 0 ? appendMode : this.appendHandler();
        if (this.options.loadMode === "autoLoad" || this.options.loadMode === "clickLoad") {
            history.replaceState({ name: this.searchParams.toString() }, "", urlString);
        }
        else {
            history.pushState({ name: this.searchParams.toString() }, "", urlString);
        }
        this._fetchAndRender(this._generateFetchUrl(this.searchParams), appendMode);
    };
    EwsArchive.prototype.getChangedParams = function (oldParamsString, newParamsString) {
        var oldParams = new URLSearchParams(oldParamsString);
        var newParams = new URLSearchParams(newParamsString);
        var changedKeys = [];
        newParams.forEach(function (value, key) {
            if (oldParams.get(key) !== newParams.get(key)) {
                changedKeys.push(key);
            }
        });
        return changedKeys;
    };
    EwsArchive.prototype.actionGoToPage = function (page) {
        var _this = this;
        if (this.options.loadMode === "autoLoad" || this.options.loadMode === "clickLoad") {
            var key = this.options.restrictArchive ? "".concat(this.options.fetchKey, "-p") : "p";
            var localParams = new URLSearchParams(this.searchParams);
            localParams.set(key, String(page));
            this.setSearchParams(localParams);
            //For recap of pages, we need to collect each url to be fetched
            var urlsToFetch = [];
            //Locally created extension of the fetchfunction for handling the urls from the collector
            var recapFetch_1 = function (url) {
                _this._fetchAndRender(url, "prepend")
                    .then(function () {
                    //After each url, pop another out from the array
                    var nextUrl = urlsToFetch.pop();
                    //if any still exists, fetch again
                    if (nextUrl) {
                        recapFetch_1(nextUrl);
                    }
                });
            };
            //For each page to be fetched, create each url from localParams which is a local base from the global searchParams
            //and push it to our collector
            for (var i = 1; i < page + 1; i++) {
                localParams.set(key, String(i));
                if (page !== i) {
                    urlsToFetch.push(this._generateFetchUrl(localParams));
                }
            }
            //Reverse the order and pop the next one in line
            var nextUrl = urlsToFetch.pop();
            //Start it!
            if (nextUrl) {
                recapFetch_1(nextUrl);
            }
        }
        else {
            this.setPage(page);
            this.updateUrlAndFetch();
        }
    };
    return EwsArchive;
}());
export { EwsArchive };
