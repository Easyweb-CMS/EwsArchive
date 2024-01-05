//EwsArchive 1.0

interface IOptions {
    fetchKey: string,
    defaultPageSize: number,
    baseUrl?: string,
    mainWrapperSelector?: string,
    archiveSelector?: string,
    articleSelector?: string,
    loadMoreSelector?: string,
    loadMode?: "clickLoad" | "autoLoad" | "pagination",
    loaderSelector?: string,
    scrollTopOffset?: number,
    restrictArchive?: boolean,

    pagination?: {
        paginateNext?: string,
        paginatePrev?: string
    },
    
    on?: {
        loadingChanged?: (loading: boolean) => void,
        beforeRender?: () => void,
        afterRender?: () => void,
        beforeFetch?: () => void,
        init?: () => void
    }
}

interface Event {
    el: HTMLElement | Document | Window,
    eventName: "popstate" | "scroll" | "click" | "change" | "input" | "mouseout" | "mouseover" | "mouseenter" | "resize",
    function: () => void
}

type AppendMode = "prepend" | "replace" | "append";

export class EwsArchive {
    //Default-options?
    private options: IOptions = {
        fetchKey: null,
        baseUrl: window.location.pathname,
        mainWrapperSelector: "[ews-archive-wrapper]", //Mainwrapper selector sent in on initialization
        archiveSelector: "[ews-archive-article-list]", //DOMelement to querySelect (".element", "#element", "[element]"), This is where the articles exists as direct childs.
        articleSelector: "[ews-archive-article]", //DOMelement to querySelect (".element", "#element", "[element]"), For the children (ie. each article)
        loadMoreSelector: "[ews-archive-loadmore]", //DOMelement to querySelect (".element", "#element", "[element]"), Representing the trigger for load more articles functionalty, works with loadMode "clickLoad". 
        loadMode: "autoLoad", //Article load-style, choose from "clickLoad" | "autoLoad" | "pagination", Default is set to autoLoad
        defaultPageSize: 12, //Default page size represent the number of items to fetch on each load more, should be the same as the ArticleViewList setting in Easyweb
        loaderSelector: "[ews-archive-loader]",
        scrollTopOffset: -300,
        restrictArchive: false,
        
        pagination: {
            paginateNext: "[ews-archive-paginate-next]",
            paginatePrev: "[ews-archive-paginate-prev]",
        },

        on: {
            loadingChanged: () => { },
            beforeRender: () => { },
            afterRender: () => { },
            beforeFetch: () => { }
        }
    };

    //Various elements created based on selectors?
    private readonly el: HTMLElement;
    private readonly archiveEl: HTMLElement | null;
    private readonly loadMoreBtn: HTMLElement | null;
    private readonly loaderEls: HTMLElement[] | null = null;
    private readonly autoLoadEl: HTMLElement | null = null;

    private searchParams: URLSearchParams;
    private events: Event[] = [];

    private readonly paginationPrev: HTMLElement | null = null;
    private readonly paginationNext: HTMLElement | null = null;

    private readonly on: any;

    //To be calculated 
    public totalCount: number;
    public totalPages: number;
    public loading: boolean;
    public endOfItems: boolean;
    public currentPage: number;

    constructor(options: IOptions) {
        //articleArchive takes custom options, custom option keys overwrites defaultOptions
        this.options = {
            ...this.options,
            ...options
        };

        //Required! main DOMelement wrapper for the archive, within this el-scope all other elements required should exist
        this.el = document.querySelector(this.options.mainWrapperSelector);

        if (!this.el) return;

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
        }

        //Init
        this._init()
    }

    private _error(err: string) {
        var errorMsgs: any = {
            noMainWrapper: `Please provide a correct existing DOMElement for the main-wrapper, ${this.options.mainWrapperSelector} not found`,
            noArticleEl: "No article element found on" + ' "' + this.options.articleSelector + '"',
            notValidFetchKey: "A string value for the fetchKey must be provided",
            noTotalCount: "No total count is defined",
            noClickLoadEl: `Loadmode is set to clickload but couldn't find a clickload element on the ${this.options.loadMoreSelector} selector`,
            noPaginationNextEl: `Loadmode is set to pagination but couldn't find a paginate next element on the ${this.options.pagination.paginateNext} selector`,
            noPaginationPrevEl: `Loadmode is set to pagination but couldn't find a paginate prev element on the ${this.options.pagination.paginatePrev} selector`,
            noEwsTotalCount: "Couldnt find the total count [ews-total-count=number] on the article, this is required for calculating totalitems and totalpages"
        }
        if (errorMsgs.hasOwnProperty(err)) {
            console.error(errorMsgs[err]);
        } else {
            console.error("Unknown error");
        }
    }

    private _getElement(selector: string) {
        return this.el.querySelector(selector) as HTMLElement;
    }
    private _getElements(selector: string) {
        return this.el.querySelectorAll(selector) as any as HTMLElement[];
    }

    private getPage() {
        const key = this.options.restrictArchive ? `${this.options.fetchKey}-p` : "p";

        return this.searchParams.get(key) ? Number(this.searchParams.get(key)) : null;
    }

    private setPage(number: Number) {
        const key = this.options.restrictArchive ? `${this.options.fetchKey}-p` : "p";

        this.searchParams.set(key, number.toString())
    }

    private getPageSize() {
        const key = this.options.restrictArchive ? `${this.options.fetchKey}-ps` : "ps";

        return this.searchParams.get(key) ? Number(this.searchParams.get(key)) : null;
    }

    private setPageSize(number: Number) {
        const key = this.options.restrictArchive ? `${this.options.fetchKey}-ps` : "ps";

        this.searchParams.set(key, number.toString())
    }

    private setParam(key: string, value: string) {
        const k = this.options.restrictArchive ? `${this.options.fetchKey}-${key}` : key;

        this.searchParams.set(k, value)
    }

    private _init() {
        //We always need a p for page, if none is set already, set it to 1    
        this.getPage() ?? this.setPage(1);
        this.getPageSize() ?? this.setPageSize(this.options.defaultPageSize);

        this._bindEvents();
        this._updateProperties();
        this._updateDOMelements();

        let page = this.getPage();

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

    }

    private _createRenderReturnAutoLoadEl() {
        const autoLoad = document.createElement('div');

        // Set the attribute "ews-autoload" on the div element
        autoLoad.setAttribute('ews-autoload', '');
        autoLoad.style.height = "40px";
        autoLoad.style.marginTop = "10px";

        // Find the element you want to append the div after
        this.el.appendChild(autoLoad);

        return autoLoad;
    }

    
    private _addEventListener(event: Event) {
        // Add to list to unbind when needed
        this.events.push(event);
        // Bind the event
        event.el.addEventListener(event.eventName, event.function);
    }
    
    //Function for updating various 
    private _updateDOMelements() {

        if (this.loadMoreBtn) {
            if (this.endOfItems) {
                this.loadMoreBtn.classList.add("hide");
            } else {
                this.loadMoreBtn.classList.remove("hide");
            }
        }

        if (this.autoLoadEl) {
            if (this.endOfItems) {
                this.autoLoadEl.classList.add("hide");
            } else {
                this.autoLoadEl.classList.remove("hide");
            }
        }    

        if (this.options.loadMode === "pagination") {
            if (this.getPage() === 1) {
                this.paginationPrev?.classList.add("inactive");
            } else {
                this.paginationPrev?.classList.remove("inactive");
            }
            if (this.getPage() === this.totalPages) {
                this.paginationNext?.classList.add("inactive");
            } else {
                this.paginationNext?.classList.remove("inactive");
            }
        }
    }

    private _updateProperties() {
        var tc = this._getElement("[ews-total-count]")

        if (!tc) {
            this._error("noEwsTotalCount");
            return;
        }

        this.totalCount = Number(tc.getAttribute("ews-total-count"));
        this.totalPages = Math.ceil(this.totalCount / this.options.defaultPageSize);
        this.currentPage = this.getPage();

        const defaultPageSize = this.options.defaultPageSize;
        const currentTotal = this.currentPage * defaultPageSize;

        this.endOfItems = currentTotal >= this.totalCount;
    }

    private _generateFetchUrl(searchParams: URLSearchParams): string {
        var paramsToGenerateFrom = searchParams ? searchParams : this.searchParams;
        return `/template${this.options.baseUrl}?key=${this.options.fetchKey}&${paramsToGenerateFrom.toString()}`;
    }

    private _setLoading(bool: boolean): void {
        this.loading = bool;

        this.el.setAttribute("state", bool ? "loading" : "");

        if (this.loaderEls) {
            if (bool) {
                this.loaderEls.forEach(x => x.classList.add("show"));
            } else {
                this.loaderEls.forEach(x => x.classList.remove("show"));
            }
        }

        this.on.loadingChanged(this.loading);
    }

    //Function for fetching items based on the fetchKey
    private _fetchAndRender(fetchUrl: string, appendMode: AppendMode = "replace") {
        if (this.options.loadMode == "pagination") {
            window.scrollTo({ top: this.el.offsetTop + this.options.scrollTopOffset });
        }

        this._setLoading(true);

        this.on.beforeFetch();

        return fetch(fetchUrl)
            .then(response => response.text())
            .then(data => {
                this.on.beforeRender();
                this._renderItems(data, appendMode)
            }).then(() => {
                this._setLoading(false);
                this._updateProperties();
                this._updateDOMelements();
                this.on.afterRender();
            });
    }

    private _renderItems(data: any, appendMode: AppendMode = "replace") {
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
    }


    private _setParamsAndGoToPage() {
        this.setSearchParams();
        this.actionGoToPage(this.getPage());
    }

    private _bindEvents() {
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
    }

    private _unbindEvents() {
        while (this.events.length) {
            const event = this.events.pop();
            event.el.removeEventListener(event.eventName, event.function);
        }
    }

    public setOptions(options: Partial<IOptions>) {
        this.options = {
            ...this.options,
            ...options
        }

        this._unbindEvents();
        this.setPage(1);
        this._init();
        this.updateUrlAndFetch("replace");
    }

    public setSearchParams(params?: URLSearchParams) {
        if (!params) {
            this.searchParams = new URLSearchParams(location.search);
            return;
        }

        this.searchParams = params;
    }

    //Updates the URL based on current SearchParams and fetches
    public updateUrlAndFetch(appendMode?: AppendMode) {
        const urlString = this.options.baseUrl + "?" + this.searchParams.toString();

        var appendMode = appendMode ?? this.appendHandler();

        if (this.options.loadMode === "autoLoad" || this.options.loadMode === "clickLoad") {
            history.replaceState({ name: this.searchParams.toString() }, "", urlString);
        } else {
            history.pushState({ name: this.searchParams.toString() }, "", urlString);
        }

        this._fetchAndRender(this._generateFetchUrl(this.searchParams), appendMode);
    }

    //Function for deciding how to render fetched content
    //takes a set appendmode or checks certain requirements
    //looks for changed params to decide wether to replace or use default appendMode depending on loadMode
    private appendHandler = (): AppendMode => {
        const latestState = window.history.state;

        const key = this.options.restrictArchive ? `${this.options.fetchKey}-p` : "p";

        var changedParams;

        var appendMode: AppendMode = this.options.loadMode && this.options.loadMode == "pagination" ? "replace" : "append";

        if (latestState) {
            changedParams = this.getChangedParams(latestState.name, this.searchParams.toString())

            if (!(changedParams.length == 1 && changedParams.includes(key))) {
                this.searchParams.set(key, String(1));
                appendMode = "replace";
            }
        }

        return appendMode;
    }

    private getChangedParams(oldParamsString: string, newParamsString: string) {

        const oldParams = new URLSearchParams(oldParamsString);
        const newParams = new URLSearchParams(newParamsString);

        const changedKeys: string[] = [];
     
        newParams.forEach((value, key) => {
            if (oldParams.get(key) !== newParams.get(key)) {
                changedKeys.push(key);
            }
        })

        return changedKeys;
    }

    //Actions
    public actionAutoLoad = () => {
        var containerPos = this.autoLoadEl.getBoundingClientRect().y - window.innerHeight;

        if (containerPos < 1) {
            if (this.loading || this.endOfItems) {
                return false;
            } else {
                this.actionLoadMore();
            }
        }
    }

    public actionLoadMore = () => {
        this.setPage(this.getPage() + 1);
        this.updateUrlAndFetch();
    }

    public actionGoToNext = () => {
        var currentPage = this.getPage();

        if (currentPage < this.totalPages) {
            this.setPage(currentPage + 1)
            this.updateUrlAndFetch();
        } else {
            return
        }
    }

    public actionGoToPrev = () => {
        var currentPage = this.getPage();

        if (currentPage > 1) {
            this.setPage(currentPage - 1)
            this.updateUrlAndFetch();
        } else {
            return
        }
    }

    public actionGoToPage(page: number) {
        if (this.options.loadMode === "autoLoad" || this.options.loadMode === "clickLoad") {
            const key = this.options.restrictArchive ? `${this.options.fetchKey}-p` : "p";

            var localParams = new URLSearchParams(this.searchParams);

            localParams.set(key, String(page));
            this.setSearchParams(localParams);
           
            //For recap of pages, we need to collect each url to be fetched
            var urlsToFetch: string[] = [];

            //Locally created extension of the fetchfunction for handling the urls from the collector
            const recapFetch = (url: string) => {
                this._fetchAndRender(url, "prepend")
                    .then(() => {
                        //After each url, pop another out from the array
                        var nextUrl = urlsToFetch.pop();

                        //if any still exists, fetch again
                        if (nextUrl) {
                            recapFetch(nextUrl)
                        }
                    });
            }

            //For each page to be fetched, create each url from localParams which is a local base from the global searchParams
            //and push it to our collector
            for (var i = 1; i < page + 1; i++) {
                localParams.set(key, String(i));
                if (page !== i) {
                    urlsToFetch.push(this._generateFetchUrl(localParams))
                }
            }

            //Reverse the order and pop the next one in line
            var nextUrl = urlsToFetch.pop();

            //Start it!
            if (nextUrl) {
                recapFetch(nextUrl);
            }

        } else {
            this.setPage(page);
            this.updateUrlAndFetch();
        }
    }
}