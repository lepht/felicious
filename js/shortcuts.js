window.addEventListener('keydown', function(event){
	var keyCombination = {
		altKey: event.altKey,
		ctrlKey: event.ctrlKey,
		metaKey: event.metaKey,
		shiftKey: event.shiftKey,
		keyCode: event.keyCode
	};
	
	for(var i in keyCombination){
		if(!keyCombination[i]){
			delete keyCombination[i];
		}
	}
	
	chrome.extension.sendRequest({
		'type': 'shortcut', 
		'keyCombination': keyCombination, 
		'page': {
			'title': window.location.name,
			'url': window.location.href
		}
	});
});