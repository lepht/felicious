document.addEvent('domready', function(){
	var oauthHelper = chrome.extension.getBackgroundPage().oauthHelper;
	
	//init form values
	$('username').value = localStorage.username || '';
	$('password').value = localStorage.password || '';
	$('autosynch').checked = Boolean(parseInt(localStorage.autosynch) || 0);
	
	if(localStorage.loginMethod == 'yahoo'){
		$('yahoo').checked = true;
	}else{
		$('delicious').checked = true;
	}
	
	updateLoginForm();
	
	//register events
	$('username').addEventListener('change', function(){
		localStorage.username = this.value;
		update();
	});
	$('password').addEventListener('change', function(){
		localStorage.password = this.value;
		update();
	});
	$('autosynch').addEventListener('change', function(){
		localStorage.autosynch = this.checked ? 1 : 0;
		update();
	});
	
	$('synchnow').addEventListener('click', function(){
		chrome.extension.sendRequest({'type': 'reload'});
		$('synchnow').addClass('working');
		$('synchnow').removeClass('error');
	});
	
	$('yahoo_login').addEventListener('click', function(){
		if(!this.getParent('.disabled'))
			oauthHelper.login();
	});
	$('yahoo_logout').addEventListener('click', function(){
		oauthHelper.logout();
	});
	
	$('delicious').addEvent('click', selectLoginType);
	$('yahoo').addEvent('click', selectLoginType);
	
	chrome.extension.onRequest.addListener(function(request){
		if(request.type == 'error'){
			if($('synchnow').hasClass('working')){
				$('synchnow').removeClass('working');
				$('synchnow').addClass('error');
			}
		}else if(request.type == 'updated'){
			$('synchnow').removeClass('working');
		}else if(request.type == 'oauthLoginStateChanged'){
			updateLoginForm();
		}
	});
	
	//helper functions
	function selectLoginType(){
		updateLoginForm();
		update();
	}
	
	function updateLoginForm(){
		localStorage.loginMethod = $('yahoo').checked ? 'yahoo' : 'delicious';
		
		if(localStorage.loginMethod != 'delicious'){
			$('delicious_form').addClass('disabled');
			$('delicious_form').getElements('input').set('disabled', true);
		}else{
			$('delicious_form').removeClass('disabled');
			$('delicious_form').getElements('input').set('disabled', false);
		}
		
		if(localStorage.loginMethod != 'yahoo'){
			$('yahoo_form').addClass('disabled');
		}else{
			$('yahoo_form').removeClass('disabled');
		}
		
		if(oauthHelper.isLoggedIn()){
			$('yahoo_form').addClass('logged_in');
		}else{
			$('yahoo_form').removeClass('logged_in');
		}
	}

	function update(){
		chrome.extension.sendRequest({'type': 'updateoptions'});
	}
});