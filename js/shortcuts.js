var lastKeyCombination = {};

window.addEventListener('keydown', function(event){
	var keyCombination = getKeyCombination(event);
	
	if(compare(keyCombination, lastKeyCombination))
		return;
	
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