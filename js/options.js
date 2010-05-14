document.addEvent('domready', function(){
	$('username').value = localStorage.username || '';
	$('password').value = localStorage.password || '';
	$('autosynch').checked = Boolean(parseInt(localStorage.autosynch) || 0);

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
		chrome.extension.sendRequest('reload');
		$('synchnow').addClass('working');
		$('synchnow').removeClass('error');
	});
	
	chrome.extension.onRequest.addListener(function(request){
		if(request == 'error'){
			if($('synchnow').hasClass('working')){
				$('synchnow').removeClass('working');
				$('synchnow').addClass('error');
			}
		}else if(request == 'updated'){
			$('synchnow').removeClass('working');
		}
	});
	
	function update(){
		chrome.extension.sendRequest('updateoptions');
	}
});