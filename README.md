EwsArchive comes style-free, meaning there are no default css only html with javascript functionality.
#### Easyweb ArticleList Component Features:

1. **Click Load:** This option allows users to load more items by clicking a "Load More" button.
2. **Auto Load:** The component can automatically load new items when the user scrolls to the bottom of the list.
3. **Pagination:** It supports pagination with buttons for navigating to the next or previous pages.
4. **Custom Event Handling:** The component provides hooks for developers to attach custom functionality to various events within the article listing cycle.

This component is designed to provide a seamless and flexible user experience for displaying and interacting with archived content.


### Base HTML-structure with default DOM-Selectors

```
<!-- Main wrapper with default selector [ews-archive-wrapper] -->
<div class="article-list-wrapper" ews-archive-wrapper>

	<!-- CSS-Loader -->
	<div ews-archive-loader>
		<span class="loader"></span>
	</div>
	
	<!-- Article-list with default selector [ews-archive-article-list] -->
	<div ews-archive-article-list>
		<!-- EASYWEB ARTICLE-LIST -->
		<ew-template for-key="articleList" />
	</div>
	
	<!-- LOAD TYPES -->
	<!-- AutoLoad -->
	<!-- No autoload element needed, is created automatically -->

	<!-- ClickLoad -->
	<!-- Load more button with default selector [ews-archive-loadmore] -->
	<button ews-archive-loadmore>
		<span>Ladda fler</span>
	</button>

	<!-- Pagination -->
	<div>
		<!-- Pagination prev-button [ews-archive-paginate-prev] -->
		<button ews-archive-paginate-prev>
			<span>Prev</span>
		</button>
		<!-- Pagination next-button [ews-archive-paginate-next] -->
		<button ews-archive-paginate-next>
			<span>Next</span>
		</button>
	</div>
</div>

--------------------------

ew-template: articleList

<ew-list for-key="$">
    <article ews-archive-article ews-total-count="@Value("$parent/articleList/$count")">
		<!-- Article Content -->
    </article>
</ew-list>

```

#### Important
```
Required on the article:

ews-total-count="@Value("$parent/articleList/$count")"```
```

#### Init EwsArchive with Options: 

```
const articleList = new EwsArchive({
    fetchKey: "articles",
    baseUrl: "/"
   
    on: {
        loadingChanged: function () {
        },
        beforeRender: function () {
        },
        afterRender: function () {
        },
        beforeFetch: function () {
        }
    }
});

```


## Options

| Option     | Default     | Description  |
| ---------- | ----------  | ------------ |
| FetchKey: | Null        | **String:** The Easyweb ArticleList Key, **REQUIRED** |
| BaseUrl:  | Null        | **String:** The BaseUrl from where the ArticleList is located ie. /myfolder/, defaults to location.href|           
| mainWrapperSelector: | `"[ews-archive-wrapper]"` | **String:** DOM-Selector of main-wrapper in which all else exists |
| archiveSelector: | `"[ews-archive-article-list]"` | **String:** DOM-Selector of article-list in which all else exists |
| articleSelector: | `"[ews-archive-article]"` | **String:** DOM-Selector for each item in article-list |
| loadMoreSelector: | `"[ews-archive-loadmore]"` | **String:** DOM-Selector for the trigger of load more items, needed for clickLoad" |
| loadMode: | "autoLoad" | **String:** "autoLoad", "clickLoad" or "pagination". The load-style of the list. "autoLoad" automatically creates and binds autoLoad-element with function for loading |
| loaderSelector: | `"[ews-archive-loader]"` | **String:** DOM-Selector for a css-loader, get class "show" if article-list is loading items |
| defaultPageSize: | 12     | **Number:** Default number of items "per page" |
| scrollTopOffset: | -300 | **Number:** When loading items with pagination, the site scrolls to top of archive, this value is for offsetting |
| Pagination: {`paginateNext`, `paginatePrev`} | (Default below)  |              |
| ...paginateNext: | `"[ews-archive-paginate-next]"` | **String:** DOM-Selector for the Paginate next trigger (if loadMode: "pagination") |
| ...paginatePrev: | `"[ews-archive-paginate-prev]"` | **String:** DOM-Selector for the Paginate prev trigger (if loadMode: "pagination") |
| on: { `loadingChanged`, `beforeRender`, `afterRender`, `beforeFetch` }| () => void | Object with event-hooks for custom functionality, more under "Events" |
| restrictArchive | false | **Boolean**: Restricts searchParams to only apply to the initialized articleList. While having multiple articleLists on a page they apply to all as default |


## Events

EwsArchive comes with a couple of useful events you can use. Events can be set when initializing the Archive:

1. Using `on` parameter on EwsArchive initialization:

```
const articleList = new EwsArchive({
    fetchKey: "articles",
    baseUrl: "/"
    totalCount: 244,
	
    on: {
        loadingChanged: function () {
	        myFunction();
        },
        beforeRender: function () {
	        myFunction();
        },
        afterRender: function () {
	        myFunction();
        },
        beforeFetch: function () {
	        myFunction();
        }
    }
});

```

2. Using `on` method after EwsArchive initialization.

```
const articleList = new EwsArchive({
	//Options
});


articleList.on('afterRender', function () {

})
```

| Name | Arguments | Description |
|------- |------- | -------| 
| loadingChanged | (loading: boolean) | Event will be fired as soon as loading-status changes, will switch between true/false |
| beforeRender | (EwsArchive: instance) | Event will be fired after fetch has started but before any rendering of items |
| afterRender | (EwsArchive: instance) | Event will be fired after fetched content has been rendered in the DOM |
| beforeFetch | (EwsArchive: instance) | Event will be fired just before a fetch has started |


## Methods

EwsArchive also comes with a few useful methods that can be used after initialization

Example of usage:

```
EwsArchive.setOptions({});

EwsArchive.actionGoToPage(4);
```

| Name | Arguments | Description |
|------- |------- | -------| 
| setOptions | Options{} | Sets new options to the archive which re-initializes it, unbinds/binds all necessary events and fetches based on new options |
| setSearchParams | URLSearchParams (optional) | Inject new searchParams or it re-sets based on location.search  |
| setUrlFromParams | - | sets the URL from active searchParams, also pushes a history.state based on the new URL |
| actionLoadMore | - | Loads more items (based on current page and pagesize) |
| actionGoToNext | - | Goes to/Fetches the next page |
| actionGoToPrev | - | Goes to/Fetches the previous page|
| actionGoToPage | number | Go / Fetch a specific page, if auto-/click-load it automatically fetch and renders all pages in between current and requested |







