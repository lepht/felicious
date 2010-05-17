var OAuthHelper = new Class({
	
	Implements: Events,
	
	initialize: function(options){
		this.consumerKey = options.consumerKey;
		this.consumerSecret = options.consumerSecret;
		
		this.urls = options.urls || {};
		
		this.token = options.token;
		this.tokenSecret = options.tokenSecret;
		this.tokenLifetime = 3600000;
		this.tokenTimestamp = 0;
		this.verifier = undefined;
		this.sessionHandle = options.sessionHandle;
		
		this.refreshTokenIntervalID;
		this.request;
		
		if(this.isLoggedIn()){
			this.refreshToken();
			this.refreshTokenIntervalID = setInterval(this.refresh.bind(this), 120000); //refresh every 2 minutes
		}
	},
	
	//initializes the login procedure. logs out the current user
	login: function(){
		return this.requestToken();
	},
	
	logout: function(){
		if(this.request)
			this.request.cancel();
		
		this.token = undefined;
		this.tokenSecret = undefined;
		this.verifier = undefined;
		this.sessionHandle = undefined;
		
		clearInterval(this.refreshTokenIntervalID);
		this.refreshTokenIntervalID = undefined;
		
		this.fireEvent('loggedOut');
		
		return this;
	},
	
	isLoggedIn: function(){
		return Boolean(this.token && this.sessionHandle);
	},
	
	//returns true if the access token nears its expiration time
	isExpired: function(){
		return this.tokenTimestamp + (this.tokenLifetime * .7) < new Date().getTime();
	},
	
	//refresh access token if it expired
	refresh: function(){
		if(this.isLoggedIn() && this.isExpired())
			this.refreshToken();
		
		return this;
	},
	
	//returns a signed url
	sign: function(url, parameters){
		parameters = parameters || {};
		var oauth = OAuthSimple().sign({
			path: url,
			parameters: $extend(parameters, {oauth_version: '1.0'}),
			signatures:{
				consumer_key: this.consumerKey,
				shared_secret: this.consumerSecret,
				oauth_token: this.token,
				oauth_token_secret: this.tokenSecret
			}
		});
		
		return oauth.signed_url;
	},
	
	requestToken: function(){
		this.logout();
		
		var url = this.sign(this.urls.requestToken, {'oauth_callback': this.urls.callback});
		var self = this;
		
		this.request = new Request({
			method: 'get',
			'url': url,
			onSuccess: function(responseText){
				var response = responseText.parseQueryString();
				self.token = response.oauth_token;
				self.tokenSecret = response.oauth_token_secret;
				self.requestAccessToken(response.xoauth_request_auth_url);
			},
			onFailure: function(){
				console.log('request token failed');
			}
		}).send();
		
		return this;
	},
	
	requestAccessToken: function(url){
		//window.open(url, 'felicious', 'location=yes,links=no,scrollbars=no,toolbar=no,width=550,height=550');
		chrome.windows.create({'url': url, width: 550, height: 550, 'type': 'popup'});
		return this;
	},
	
	verify: function(verifier){
		return this.getToken(verifier);
	},
	
	getToken: function(verifier){
		var url = this.sign(this.urls.getToken, {'oauth_verifier': verifier});
		var self = this;
		
		this.request = new Request({
			method: 'GET',
			'url': url,
			onSuccess: function(responseText){
				var response = responseText.parseQueryString();
				self.token = response.oauth_token;
				self.tokenSecret = response.oauth_token_secret;
				self.sessionHandle = response.oauth_session_handle;
				self.tokenTimestamp = new Date().getTime();
				
				self.fireEvent('loggedIn');
				self.refreshTokenIntervalID = setInterval(self.refresh.bind(self), 120000); //refresh every 2 minutes
			},
			
			onFailure: function(){
				console.log('get token failed');
			}
		}).send();
		
		return this;
	},
	
	refreshToken: function(){
		var url = this.sign(this.urls.getToken, {'oauth_session_handle': this.sessionHandle});
		var self = this;
		
		this.request = new Request({
			method: 'GET',
			'url': url,
			onSuccess: function(responseText){
				var response = responseText.parseQueryString();
				self.token = response.oauth_token;
				self.tokenSecret = response.oauth_token_secret;
				self.tokenTimestamp = new Date().getTime();
				self.fireEvent('tokenRefreshed');
			},
			
			onFailure: function(xhr){
				console.log('refresh token failed');
				
				//logout on authorization error
				if(xhr.status == 401){
					this.logout();
				}
			}
		}).send();
		
		return this;
	}
});