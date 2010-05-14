var List = new Class({
	initialize: function(el, options){
		this.element = $(el);
		this.defaultSort = null; //todo: remove
		
		this.localStorageID = options.localStorageID || null; //store sort order in local storage using this id
		this.createElement = options.createElement || $empty;
		this.data = options.data || [];
		this.sortOrder = options.sortOrder || 'asc';
		this.sorters = options.sorters || {};
		this.currentSorter = options.currentSorter || '';
		this.currentFilter = '';
		
		//restore saved sort order
		if(localStorage[this.localStorageID + 'Order']){
			var sort = localStorage[this.localStorageID + 'Order'].split(' ');
			this.currentSorter = sort[0];
			this.sortOrder = sort[1];
		}
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
		
		this.update();
		
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
		this.update();
	},
	
	storeSortOrder: function(){
		if(this.localStorageID){
			//store sort order in local storage
			localStorage[this.localStorageID + 'Order'] = this.currentSorter + ' ' + this.sortOrder;
		}
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
	}
});