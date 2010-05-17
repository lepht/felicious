//MooTools More, <http://mootools.net/more>. Copyright (c) 2006-2009 Aaron Newton <http://clientcide.com/>, Valerio Proietti <http://mad4milk.net> & the MooTools team <http://mootools.net/developers>, MIT Style License.

/*
---

script: More.js

description: MooTools More

license: MIT-style license

authors:
- Guillermo Rauch
- Thomas Aylott
- Scott Kyle

requires:
- core:1.2.4/MooTools

provides: [MooTools.More]

...
*/

MooTools.More = {
	'version': '1.2.4.4',
	'build': '6f6057dc645fdb7547689183b2311063bd653ddf'
};

/*
---

script: String.QueryString.js

description: Methods for dealing with URI query strings.

license: MIT-style license

authors:
- Sebastian Markbåge, Aaron Newton, Lennart Pilon, Valerio Proietti

requires:
- core:1.2.4/Array
- core:1.2.4/String
- /MooTools.More

provides: [String.QueryString]

...
*/

String.implement({

	parseQueryString: function(){
		var vars = this.split(/[&;]/), res = {};
		if (vars.length) vars.each(function(val){
			var index = val.indexOf('='),
				keys = index < 0 ? [''] : val.substr(0, index).match(/[^\]\[]+/g),
				value = decodeURIComponent(val.substr(index + 1)),
				obj = res;
			keys.each(function(key, i){
				var current = obj[key];
				if(i < keys.length - 1)
					obj = obj[key] = current || {};
				else if($type(current) == 'array')
					current.push(value);
				else
					obj[key] = $defined(current) ? [current, value] : value;
			});
		});
		return res;
	},

	cleanQueryString: function(method){
		return this.split('&').filter(function(val){
			var index = val.indexOf('='),
			key = index < 0 ? '' : val.substr(0, index),
			value = val.substr(index + 1);
			return method ? method.run([key, value]) : $chk(value);
		}).join('&');
	}

});