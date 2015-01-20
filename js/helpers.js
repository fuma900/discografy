var helperModule = angular.module('helperModule', []);

helperModule.service('Helper', ['$q', '$log', function($q, $log) {

	this.language = navigator.language || navigator.userLanguage;

	// Parse the response from url after spotify login (which return an hashbang response)
	this.parseHashbangResponse = function(path) {
		var path = path || '';
		if (path.split('/').length !== 2){ return false; }
		if (path.split('/')[1] === '') {return false; }
		var frag = path.split('/')[1].split('&');
		return {
			'accessToken': 	frag[0].split('=')[1],
			'token_type': 	frag[1].split('=')[1],
			'expires_in': 	frag[2].split('=')[1],
		}
	};

	// Generate a url from a baseUrl and some GET parameters
	this.urlWithParams = function(url, params) {
		var i = 0;
		var s = '';
		angular.forEach(params, function(v,k) {
			if (i===0){s+='?';} else if (i>0){s+='&'}
			s += k + '=' + v;
			i += 1;
		});
		return url + s;
	};

	this.mergeArrays = function(arrays) {
		var result = []
		angular.forEach(arrays, function(array) {
			angular.forEach(array, function(value) {
				result.push(value);
			});
		});
		return result;
	};

	// Utility to simulate a delay
	this.sleep = function (milliseconds) {
	  var start = new Date().getTime();
	  for (var i = 0; i < 1e7; i++) {
	    if ((new Date().getTime() - start) > milliseconds){
	      break;
	    }
	  }
	};
}]);