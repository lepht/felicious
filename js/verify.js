window.addEventListener('load', function(event){
	var element = document.getElementById('shortCode');
	if(element){
		var code = element.textContent;
		console.log(code);
		chrome.extension.sendRequest({type: 'verify', data: code});
		window.open('', '_self', ''); //bug fix
		window.close();
	}
});