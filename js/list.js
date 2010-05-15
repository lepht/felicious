var List = new Class({
	initialize: function(el, options){
		this.element = $(el);
		this.defaultSort = null; //todo: remove
		
		this.localStorageID = options.localStorageID || null; //store sort order in local storage using this id
		//this.createElement = options.createElement || $empty;
		this.sortOrder = options.sortOrder || 'asc';
		this.sorters = options.sorters || {};
		this.currentSorter = options.currentSorter || '';
		this.currentFilter = '';
		this.views = [];
		this.currentView = localStorage[this.localStorageID + 'View'] || 'list';
		
		//restore saved sort order
		if(localStorage[this.localStorageID + 'Order']){
			var sort = localStorage[this.localStorageID + 'Order'].split(' ');
			this.currentSorter = sort[0];
			this.sortOrder = sort[1];
		}
		
		//
		this.setData(options.data || []);
	},
	
	filter: function(q){
		this.currentFilter = q;
		var regExp = new RegExp(q, 'i');
		var children = this.element.getChildren();
		var el;
		
		for(var i = children.length - 1; i >= 0; i--){
			el = children[i];
			if(!q || el.get('text').match(regExp)){
				el.removeClass('hidden');
			}else{
				el.addClass('hidden');
			}
		}
		
		return this;
	},
	
	sort: function(sorter){
		if(sorter){	
			this.currentSorter = sorter;
			this.storeSortOrder();
		}
		
		this.data.sort(this.sorters[this.currentSorter]);
		if(this.sortOrder == 'desc')
			this.data.reverse();
		
		return this;
	},
	
	toggleSortOrder: function(){
		if(this.sortOrder == 'asc'){
			this.sortOrder = 'desc';
		}else{
			this.sortOrder = 'asc';
		}
		this.storeSortOrder();
		this.data.reverse();
		return this;
	},
	
	storeSortOrder: function(){
		if(this.localStorageID){
			//store sort order in local storage
			localStorage[this.localStorageID + 'Order'] = this.currentSorter + ' ' + this.sortOrder;
		}
		return this;
	},
	
	update: function(){
		//this.element.empty();
		this.element.getChildren().dispose();
		
		for(var i = 0; i < this.data.length; i++){
			this.element.appendChild(this.createElement(this.data[i]));
		}
		
		if(this.currentFilter)
			this.filter(this.currentFilter);
		
		return this;
	},
	
	setData: function(data){
		this.data = data;
		this.currentFilter = '';
		this.sort();
		return this;
	},
	
	setView: function(view){
		var element = this.element;
		$each(this.views, function(view){
			element.removeClass(view);
		});
		element.addClass(view);
		this.currentView = view;
		
		//store view in local storage
		localStorage[this.localStorageID + 'View'] = this.currentView;
		return this;
	},
	
	createElement: function(item){
		return new Element('li', {'text': item});
	}
});


var PostList = new Class({
	Extends: List,

	createElement: function(item){
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
});


var TagList = new Class({
	Extends: List,
	
	initialize: function(){
		this.parent.apply(this, arguments);
		this.views = [
			'list',
			'cloud'
		];
		this.setView(this.currentView);
	},
	
	setData: function(data){
		var maxCount = 0;
		
		for(var i = data.length - 1; i >= 0; i--){
			maxCount = maxCount > data[i].count ? maxCount : data[i].count;
		}
		
		this.maxCount = maxCount;
		
		return this.parent(data);
	},
	
	createElement: function(item){
		var cache = tagElementCache[item.name];
		var size = 1 + Math.ceil(Math.log(item.count) / Math.log(this.maxCount) * 4);
		
		if(cache){
			cache.countElement.innerText = item.count;
			cache.className = 'size_' + size;
			return cache;
		}

		var tag = item.name;
		var tagCount = item.count;
		
		var li = new Element('li', {'class': 'size_' + size});
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
});