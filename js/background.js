var Delicious = new Class({
	
	//Implements: Events,
	
	initialize: function(username, password, autosynch){
		this.username = username;
		this.password = password;
		this.autosynch = Boolean(parseInt(localStorage.autosynch) || 0);
		this.lastUpdate = null;
		
		this.isWorking = false;
		this.autoUpdateInterval = 900000; //Update Every 15 minutes
		
		this.posts = [];
		this.tags = [];
		
		this.updateIn(this.autoUpdateInterval);
	},
	
	onComplete: function(){
		this.isWorking = false;
	},
	
	cancel: function(){
		if(this.currentRequest && this.currentRequest.running)
			this.currentRequest.cancel();
		this.currentRequest = null;
	},
	
	updateIn: function(time){
		$clear(this.autoUpdateID);
		this.autoUpdateID = this.autoUpdate.delay(time, this);
	},
	
	autoUpdate: function(){
		if(this.autosynch){
			this.update();
		}
		this.updateIn(this.autoUpdateInterval);
	},
	
	update: function(){
		if(this.isWorking || !this.autosynch)
			return this;
		
		console.log('update');
		this.cancel();
		this.isWorking = true;
		var baseURL = 'https://' + this.username + ':' + this.password + '@api.del.icio.us/v1/';
		var self = this;
		
		this.currentRequest = new Request({
			method: 'get',
			onSuccess: function(responseText, responseXML){
				var time = responseXML.getElementsByTagName('update')[0].getAttribute('time');
				if(time > (localStorage['lastUpdate'] || '')){
					self.load();
				}else{
					console.log('no update');
					//self.fireEvent('noupdate');
					chrome.extension.sendRequest('noupdate');
					self.onComplete();
				}
			},
			onFailure: function(){
				console.log('posts/update failed');
				//self.fireEvent('error');
				chrome.extension.sendRequest('error');
				self.onComplete();
			}
		}).send({'url': baseURL + 'posts/update'});
		
		return this;
	},
	
	load: function(){
		this.cancel();
		
		console.log('load');
		this.isWorking = true;
		var baseURL = 'https://' + this.username + ':' + this.password + '@api.del.icio.us/v1/';
		var self = this;
		
		this.currentRequest = new Request({
			method: 'get', 
			onSuccess: function(responseText, responseXML){
				console.log('success');
				
				var postsXML = responseXML.getElementsByTagName('post');
				var a = [];
				var tagIndex = {};
				var tags = [];
				
				for (var i = 0; i < postsXML.length; i++) {
					var postTags = postsXML[i].getAttribute('tag').split(' ');
					
					a.push({
						title: postsXML[i].getAttribute('description'),
						url: postsXML[i].getAttribute('href'),
						time: postsXML[i].getAttribute('time'),
						tags: postTags,
						hash: postsXML[i].getAttribute('hash'),
						notes: postsXML[i].getAttribute('extended'),
						shared: postsXML[i].getAttribute('shared')
					});
					
					postTags.each(function(item){
						tagIndex[item] = (tagIndex[item] || 0) + 1;
					});
				}
				
				$each(tagIndex, function(item, key){
					tags.push({name: key, count: item});
				});
				
				localStorage['posts'] = JSON.encode(a);
				localStorage['tags'] = JSON.encode(tags);
				localStorage['lastUpdate'] = formatDate(new Date());
				
				self.tags = tags;
				self.posts = a;
				self.onComplete();
				//self.fireEvent('update');
				chrome.extension.sendRequest('updated');
			},
			
			onFailure: function(xhr){
				console.log('posts/all failed');
				//self.fireEvent('error');
				chrome.extension.sendRequest('error');
				self.onComplete();
			}
		}).send({url: baseURL + 'posts/all'});
		
		return this;
	}
});

function formatDate(d){
	var pad = function(s){
		return ('' + s).length < 2 ? '0' + s : '' + s;
	}
	
	return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z';
}

var delicious;

document.addEvent('domready', function(){
	delicious = new Delicious(localStorage.username, localStorage.password, localStorage.autosynch);
	
	delicious.posts = JSON.decode(localStorage.posts) || [];
	delicious.tags = JSON.decode(localStorage.tags) || [];
	
	delicious.update();
	
	chrome.extension.onRequest.addListener(function(request){
		if(request == 'update'){
			delicious.update();
		}else if(request == 'reload'){
			delicious.load();
		}else if(request == 'updateoptions'){
			delicious.cancel();
			if(delicious.username != localStorage.username){
				delicious.username = localStorage.username;
				localStorage.lastUpdate = '';
			}
			delicious.password = localStorage.password;
			delicious.autosynch = Boolean(parseInt(localStorage.autosynch) || 0);
			delicious.updateIn(10000); //Update Bookmarks 10 seconds after options changed
			console.log('options updated');
		}
	});
});