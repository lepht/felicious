var selectedTags = [];
var delicious = chrome.extension.getBackgroundPage().delicious;
var notifications;
var postList = null;
var tagList = null;
var postElementCache = {};
var tagElementCache = {};

document.addEvent('domready', function(){
	//initialize
	postList = new List('posts', {
		localStorageID: 'posts',
		createElement: createPostListItem,
		sortOrder: 'desc',
		sorters: {
			'name': sortPostByTitle,
			'date': sortPostByTime
		},
		currentSorter: 'date',
		data: delicious.posts
	});
	
	tagList = new List('tags',{
		localStorageID: 'tags',
		createElement: createTagListItem,
		sortOrder: 'desc',
		sorters: {
			'name': sortTagByName,
			'count': sortTagByCount
		},
		currentSorter: 'count',
		data: delicious.tags
	});
	
	notifications = new Notifications('notifications');
	
	$('breadcrumbs').empty();
	
	$('search').addEventListener('keyup', function(){
		postList.filter(this.get('value'));
		tagList.filter(this.get('value'));
	});
	$('search').focus();
	
	$('search').addEvent('change', function(){
		if($('search').value){
			$('cancelsearch').addClass('visible');
		}else{
			$('cancelsearch').removeClass('visible');
		}
	});
	
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
	
	chrome.extension.onRequest.addListener(function(request){
		if(request == 'updated'){
			notifications.add('Your bookmarks have been updated');
		}else if(request == 'error'){
			//notifications.add('Bookmark update failed', 'error');
		}else if(request == 'noupdate'){
			//notifications.add('Bookmarks still fresh');
		}
	});
	
	if(!delicious.username && !delicious.password){
		notifications.add('Set your user data in the <a href="javascript:chrome.tabs.create({url: \'options.html\'});">options page</a>');
	}else{
		delicious.update();
	}
	
	postList.sort();
	tagList.sort();
});

function bookmarkURL(url, title){
	if(title){
		var f = 'http://delicious.com/save?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title);
	}else{
		var f = 'http://delicious.com/save?url=' + encodeURIComponent(url);
	}
	
	window.open(f + '&v=5&noui=1&jump=doclose', 'deliciousuiv5', 'location=yes,links=no,scrollbars=no,toolbar=no,width=550,height=550');
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
	
		var listElement = element.getElement('ul');
		var sortButtonElement = element.getElement('a.sort');
		
		sortButtonElement.addClass(list.sortOrder);
		
		listElement.empty();
		$each(list.sorters, function(item, key){
			var li = new Element('li').injectInside(listElement);
			var anchor = new Element('a', {text: 'sort by ' + key, href: '#'}).injectInside(li);
			anchor.addEventListener('click', function(){
				list.sort(key);
				anchor.getParent('ul').getChildren().removeClass('active');
				anchor.getParent().addClass('active');
			});
			
			if(list.currentSorter == key)
				li.addClass('active');
		}, this);
		
		sortButtonElement.addEventListener('click', function(){
			this.removeClass(list.sortOrder);
			list.toggleSortOrder();
			this.addClass(list.sortOrder);
		});
		
		return this;
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
	
	postList.setData(posts);
	tagList.setData(tags);
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

/*List Helpers*/
function createPostListItem(item){
	var cache = postElementCache[item.hash];
	if(cache){
		cache.className = '';
		return cache;
	}

	var postURL = item.url;
	//var faviconURL = 'http://' + (postURL.split('/')[2] || '') + "/favicon.ico";
	
	var li = new Element('li');
	var anchor = new Element('a', {
		'text': item.title, 
		'title': item.tags.join(', ') + '\n' + postURL,
		'href': "javascript:chrome.tabs.create({url: '" + postURL + "'});"
	});
	var edit = new Element('span', {'class': 'edit', 'title': 'edit this bookmark'});
	edit.addEventListener('click', bookmarkURL.pass([postURL, item.title]));
	
	if(item.notes){
		anchor.appendChild(new Element('span', {'class': 'notes', 'text': item.notes}));
	}
	//var favicon = new Element("img", {src: faviconURL});
	
	li.appendChild(anchor);
	li.appendChild(edit);
	//anchor.appendChild(favicon);
	
	postElementCache[item.hash] = li;
	
	return li;
}

function createTagListItem(item){
	var cache = tagElementCache[item.name];
	if(cache){
		cache.countElement.innerText = item.count;
		cache.className = '';
		return cache;
	}

	var tag = item.name;
	var tagCount = item.count;
	
	var li = new Element('li');
	var anchor = new Element('a', {'text': tag, 'href': '#'});
	var count = new Element('span', {'class': 'count', 'text': tagCount});
	li.countElement = count;
	
	if(!tag){
		anchor.addClass('untagged').set('text', 'untagged');
	}
	
	li.appendChild(anchor)
	anchor.appendChild(count);
	
	anchor.addEventListener('click', function(){
		selectTag(tag);
		$('search').focus();
	});
	
	tagElementCache[item.name] = li;
	
	return li;
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