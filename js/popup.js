var version = '0.2.2';
var selectedTags = [];
var delicious = chrome.extension.getBackgroundPage().delicious;
var notifications;
var postList = null;
var tagList = null;
var postElementCache = {};
var tagElementCache = {};
var isPopup = false;

document.addEvent('domready', function(){
	//initialize
	isPopup = window.location.hash.contains('popup');
	
	postList = new PostList('posts', {
		localStorageID: 'posts',
		sortOrder: 'desc',
		sorters: {
			'name': sortPostByTitle,
			'date': sortPostByTime
		},
		currentSorter: 'date',
		data: delicious.posts
	}).update();
	
	tagList = new TagList('tags',{
		localStorageID: 'tags',
		sortOrder: 'desc',
		sorters: {
			'name': sortTagByName,
			'count': sortTagByCount
		},
		currentSorter: 'count',
		data: delicious.tags
	}).update();
	
	notifications = new Notifications('notifications');
	
	$('breadcrumbs').empty();
	
	$('search').addEventListener('keyup', function(){
		postList.filter(this.get('value'));
		tagList.filter(this.get('value'));
	});
	$('search').focus();
	
	$('tags_title').addEventListener('click', function(){
		clearTags();
		$('search').focus();
	});
	
	$('tag').addEventListener('click', function(){
		chrome.tabs.getSelected(null, function (tab){
			var tabUrl = tab.url;
			var tabTitle = tab.title;
			
			bookmarkURL(tabUrl, tabTitle);
		});
	});
	chrome.tabs.getSelected(null, function(tab){
		var url = tab.url;
		var active = delicious.posts.some(function(item){
			return item.url == tab.url;
		});
		
		if(active){
			$('tag').addClass('active').set('title', 'edit this bookmark');
		}else{
			$('tag').set('title', 'bookmark this page');
		}
	});
	
	new SortMenu('post_sort', postList);
	new SortMenu('tag_sort', tagList);
	var keyboardNavigation = new KeyboardListNavigation('posts', {eventSource: 'search'});
	
	$('search').addEventListener('keydown', function(event){
		console.log(event.keyCode == 13);
		if(event.keyCode == 13 && !keyboardNavigation.currentElement){
			keyboardNavigation.setElement('tags').first();
			event.preventDefault();
		}else if(event.keyCode == 27 && keyboardNavigation.currentElement){ //escape
			keyboardNavigation.clear();
			keyboardNavigation.setElement('posts');
			event.preventDefault();
		}else if(event.keyCode == 27 && selectedTags.length){
			removeTag(selectedTags[selectedTags.length - 1]);
			event.preventDefault();
		}else if(event.keyCode == 27){
			close();
		}else if(event.keyCode != 38 && event.keyCode != 40){
			keyboardNavigation.setElement('posts');
			keyboardNavigation.clear();
		}
	});
	
	window.addEventListener('blur', close);
	
	//Shortcuts
	
	//close popup when shortcut is activated
	var keyDownCallback = function(shortcut){
		if(shortcut == 'popup'){
			close();
		}
	}
	window.addEventListener('keydown', function(event){
		var keyCombination = getKeyCombination(event);
		chrome.extension.sendRequest({
			'type': 'getShortcut', 
			'keyCombination': keyCombination
		}, keyDownCallback);
	});
	
	//Notifications
	
	//dont't show version update notification on install
	if(localStorage['version'] && localStorage['version'] < version){
		notifications.add('felicious has been updated (<a href="javascript:chrome.tabs.create({url: \'options.html\'});">changelog</a>)');
	}
	localStorage['version'] = version;
	
	chrome.extension.onRequest.addListener(function(request){
		if(request.type == 'updated'){
			notifications.add('Your bookmarks have been updated');
		}else if(request.type == 'error'){
			//notifications.add('Bookmark update failed', 'error');
		}else if(request.type == 'noupdate'){
			//notifications.add('Bookmarks still fresh');
		}
	});
	
	if(!delicious.isLoggedIn()){
		notifications.add('Set your user data in the <a href="javascript:chrome.tabs.create({url: \'options.html\'});">options page</a>');
	}else{
		delicious.update();
	}
});

/*closes the window if it was opened with #popup*/
function close(){
	if(isPopup){
		chrome.windows.getCurrent(function(win){	
			chrome.windows.remove(win.id);
		});
	}
}

function bookmarkURL(url, title){
	chrome.extension.sendRequest({
		'type': 'bookmark', 
		'url': url,
		'title': title
	});
	close();
}

/*returns true if array contains every item in items*/
function ArrayContainsEvery(array, items){
	return items.every(function(item){
		return array.contains(item);
	});
}

/*notification helper*/
var Notifications = new Class({
	initialize: function(el){
		this.element = $(el).empty();
	},
	
	add: function(text, type){
		var li = new Element('li', {'html': text}).addClass(type).injectInside(this.element);
		var close = new Element('a', {'text': 'close', href: '#'}).addClass('close').injectInside(li);
		close.addEventListener('click', function(){
			li.dispose();
		});
	}
});

/*populates the sort menu inside el with menu items for each sorter of the given list*/
var SortMenu = new Class({
	initialize: function(el, list){
		this.element = $(el);
		this.list = list;
		this.update();
	},
	
	update: function(){
		var element = this.element;
		var list = this.list;
		var listElement = element.getElement('ul').empty();
		var sortButtons = new Elements();
		var viewButtons = new Elements();
		var sortDirectionButton = element.getElement('a.sort').addClass(list.sortOrder);
		
		//create sorter buttons
		$each(list.sorters, function(item, key){
			var li = new Element('li').injectInside(listElement);
			var anchor = new Element('a', {text: 'sort by ' + key, href: '#'}).injectInside(li);
			anchor.addEventListener('click', function(){
				list.sort(key).update();
				sortButtons.removeClass('active');
				li.addClass('active');
			});
			
			if(list.currentSorter == key)
				li.addClass('active');
			
			sortButtons.push(li);
		}, this);
		
		//create sorte direction button
		sortDirectionButton.addEventListener('click', function(){
			this.removeClass(list.sortOrder);
			list.toggleSortOrder().update();
			this.addClass(list.sortOrder);
		});
		
		//create view buttons
		if(list.views.length > 1){
			listElement.appendChild(new Element('hr'));
			$each(list.views, function(item){
				var li = new Element('li').injectInside(listElement);
				var anchor = new Element('a', {text: 'view as ' + item, href: '#'}).injectInside(li);
				anchor.addEventListener('click', function(){
					list.setView(item);
					viewButtons.removeClass('active');
					li.addClass('active');
				});
				
				if(list.currentView == item)
					li.addClass('active');
				
				viewButtons.push(li);
			}, this);
		}
			
		return this;
	}
});

var KeyboardListNavigation = new Class({
	initialize: function(el, options){
		this.element = $(el);
		this.currentElement = null;
		this.eventSource = $(options.eventSource) || window;
		var self = this;
		
		this.eventSource.addEventListener('keydown', function(event){
			//up
			if(event.keyCode == 38){ 
				self.previous();
				event.preventDefault();
			//down
			}else if(event.keyCode == 40){ 
				self.next();
				event.preventDefault();
			//enter
			}else if(event.keyCode == 13 && self.currentElement){ 
				var e = document.createEvent('MouseEvents');
				e.initEvent('click', true, true);
				self.currentElement.getElement('a').dispatchEvent(e);
				event.preventDefault();
			}
		});
		
		this.eventSource.addEventListener('blur', function(){
			self.clear();
		});
	},
	
	setElement: function(el){
		if(this.element != $(el)){
			this.element = $(el);
			this.currentElement = null;
		}
		return this;
	},
	
	clear: function(){
		if(this.currentElement)
			this.currentElement.removeClass('selected');
		
		this.currentElement = null;
	},
	
	setCurrentElement: function(el){
		this.clear();
		if(!el)
			return;
		
		this.currentElement = el.addClass('selected');
		
		//ensure visibility of currently selected element
		if(el.offsetTop < this.element.scrollTop){
			this.element.scrollTop = el.offsetTop;
		}else if(el.offsetTop + el.offsetHeight > this.element.scrollTop + this.element.offsetHeight){
			this.element.scrollTop = el.offsetTop + el.offsetHeight - this.element.offsetHeight;
		}
	},
	
	next: function(){
		var el = this.currentElement ? this.currentElement.getNext('*:not(.hidden)') : null;
		el ? this.setCurrentElement(el) : this.first();
	},
	
	previous: function(){
		var el = this.currentElement ? this.currentElement.getPrevious('*:not(.hidden)') : null;
		el ? this.setCurrentElement(el) : this.last();
	},
	
	first: function(){
		this.setCurrentElement(this.element.getFirst('*:not(.hidden)'));
	},
	
	last: function(){
		this.setCurrentElement(this.element.getLast('*:not(.hidden)'));
	}
});

/**/
function filterPosts(filterTags){
	var index = {};
	var tags = [];
	var posts = delicious.posts;
	var post;
	var tag;
	
	if(filterTags.length){
		posts = delicious.posts.filter(function(item){
			return !filterTags.length || ArrayContainsEvery(item.tags, filterTags);
		});
	}
	
	for(var i = posts.length - 1; i >= 0; i--){
		post = posts[i];
		for(var i2 = post.tags.length - 1; i2 >= 0; i2--){
			tag = post.tags[i2];
			index[tag] = (index[tag] || 0) + 1;
		}
	}
	
	filterTags.each(function(item){
		delete index[item];
	});
	
	$each(index, function(item, key){
		tags.push({name: key, count: item});
	});
	
	postList.setData(posts).update();
	tagList.setData(tags).update();
}

/**/
function updateBreadcrumbs(){
	listElement = $('breadcrumbs').empty();
	
	selectedTags.each(function(item){
		var li = new Element('li');
		var anchor = new Element('a', {text: item, href: '#'});
		
		anchor.injectInside(li);
		li.injectInside(listElement);
		
		anchor.addEventListener('click', function(){
			li.getAllNext().get('text').each(function(item){
				selectedTags.erase(item);
			});
			updateBreadcrumbs();
		});
	});
	
	filterPosts(selectedTags);
}

/*Tag Selection*/
function clearTags(){
	$('search').set('value', '');
	selectedTags = [];
	updateBreadcrumbs();
}
function selectTag(tag){
	$('search').set('value', '');
	selectedTags.push(tag);
	updateBreadcrumbs();
}
function removeTag(tag){
	$('search').set('value', '');
	selectedTags.erase(tag);
	updateBreadcrumbs();
}

/*Sorters*/
function sortPostByTitle(a, b){
	a = a.title.toLowerCase();
	b = b.title.toLowerCase();
	if(a == b){
		return 0;
	}else if(a < b){
		return -1;
	}else{
		return 1;
	}
}

function sortPostByTime(a, b){
	a = a.time.toLowerCase();
	b = b.time.toLowerCase();
	if(a == b){
		return 0;
	}else if(a < b){
		return -1;
	}else{
		return 1;
	}
}

function sortTagByName(a, b){
	a = a.name.toLowerCase();
	b = b.name.toLowerCase();
	if(a == b){
		return 0;
	}else if(a < b){
		return -1;
	}else{
		return 1;
	}
}

function sortTagByCount(a, b){
	if(a.count == b.count){
		return sortTagByName(b, a);
	}else{
		return a.count - b.count;
	}
}