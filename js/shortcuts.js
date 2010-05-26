var lastKeyCombination = {};

function compare(obj1, obj2){
	var keys = {};
	var i;
	
	for(i in obj1)
		keys[i] = undefined;
	for(i in obj2)
		keys[i] = undefined;
	
	for(i in keys){
		if(obj1[i] != obj2[i])
			return false;
	}
	return true;
}

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
	
	if(compare(keyCombination, lastKeyCombination)){
		return;
	}
	lastKeyCombination = keyCombination;
	
	chrome.extension.sendRequest({
		'type': 'shortcut', 
		'keyCombination': keyCombination, 
		'page': {
			'title': window.location.name,
			'url': window.location.href
		},
		'window': {
			'x': window.screenX,
			'y': window.screenY,
			'width': window.outerWidth,
			'height': window.outerHeight
		}
	});
});