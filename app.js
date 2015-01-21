var spotifyModule = angular.module('spotifyModule', ['helperModule']);

spotifyModule.service('Spotify', ['$rootScope', '$log', '$q', '$http', 'Helper', '$location', function($rootScope, $log, $q, $http, Helper, $location) {

	this.getAccessToken = function() {
		var hashbangResponseParsed = Helper.parseHashbangResponse($location.url());
		if (hashbangResponseParsed === false) { return false; } // nessuna accessToken

		$rootScope.spotify.user = hashbangResponseParsed;	// Estraggo dalla risposta di spotify i dati di accesso. 
		return true;	// restituisco true per dire che nella barra degli indirizzi c'è un'accessToken
	};

	this.login = function() {
		var url = 'https://accounts.spotify.com/authorize';
		var scopes = 'playlist-read-private user-library-read playlist-modify-public';

		if ($location.absUrl().split(':')[1] === '//macbook-di-marco.local') {
			var redirect_uri = 'http://macbook-di-marco.local:5757';
		} else if ($location.absUrl().split(':')[1] === '//192.168.2.66') {
			var redirect_uri = 'http://192.168.2.66:5757';
		} else if ($location.absUrl().split('/')[3] === 'discografy') {
			var redirect_uri = 'http://fuma900.github.io/discografy'
		}

		var params = {
			'client_id': '60cd0e4b101b40ab9ef2d407c4962149',
			'response_type': 'token',
			'scope': encodeURIComponent(scopes),
			'redirect_uri': encodeURIComponent(redirect_uri),
		}

		window.location = Helper.urlWithParams(url, params);
	};

	this.get = function(url, params) {
		params = params || {};
		return $http.get(url, { headers: { 'Authorization': 'Bearer ' + $rootScope.spotify.user.accessToken }, params: params })
			.then(function(res) {
				return res.data;
			});
	};

	this.post = function(url, data) {
		data = data || {};
		return $http.post(url, data, { headers: { 'Authorization': 'Bearer ' + $rootScope.spotify.user.accessToken , 'Content-Type': 'application/json'} })
			.then(function(res) {
				return res.data;
			});
	};

	this.search = function(query, type) {
		var url = 'https://api.spotify.com/v1/search';
		type = type || 'artist';
		var params = {
			q: query,
			type: type,
			market: Helper.language,
		};
		return this.get(url, params).then(function(res) {
			if (type === 'artist'){
				return res.artists.items;
			} else if (type === 'album') {
				return res.albums.items;
			} else if (type === 'playlist') {
				return res.playlists.items;
			} else if (type === 'track') {
				return res.tracks.items;
			}
		});
	};

	this.getUser = function() {
		var url = 'https://api.spotify.com/v1/me';
		return this.get(url);
	};

	// artist = artist object
	// options = object with fields
	// 		albums = bool
	// 		singles = bool
	// 		compilations = bool
	// 		appearson = bool
	this.getArtistAlbums = function(artist, options) {
		var album_type = '';
		album_type += (options.albums) ? 'album,':''
		album_type += (options.singles) ? 'single,':''
		album_type += (options.compilations) ? 'compilation,':''
		album_type += (options.appearson) ? 'appears_on,':''
		var url = artist.href + '/albums';
		var params = {
			album_type: album_type,
			limit: 50,
			market: Helper.language,
		}
		return this.get(url, params).then(function(res) {
			console.info('n° albums', res.items.length);
			return res.items;
		});
	};

	// album = album object
	this.getAlbumTracks = function(album) {
		var url = album.href + '/tracks';
		var params = {
			limit: 50
		}
		return this.get(url, params).then(function(res) {
			return res.items;
		});
	};

	// user = spotify user object
	// name = name string
	this.createPlaylist = function(user, name) {
		var url = user.href + '/playlists';
		var data = {
			name: name
		}
		return this.post(url, data);
	};

	// playlist = playlist object
	// tracks = array of spotify uris
	this.addTracksToPlaylist_LessThan100 = function(playlist, tracks) {
		var url = playlist.href + '/tracks';
		var data = {
			uris: tracks
		}
		return this.post(url, data);
	};

	this.addTracksToPlaylist = function(playlist, tracks) {
		var chunks = [];
		var promises = [];
		while (tracks.length > 0) {
		  chunks.push(tracks.splice(0,99));
		}
		angular.forEach(chunks, function(tracks) {
			promises.push(this.addTracksToPlaylist_LessThan100(playlist, tracks));
		}, this);
		return $q.all(promises);
	};

}]);

var helperModule = angular.module('helperModule', []);

helperModule.service('Helper', ['$q', '$log', '$rootScope', function($q, $log, $rootScope) {

	this.language = navigator.language || navigator.userLanguage;

	this.ALERTS = {
		GENERIC_ERROR: 0,
		ACCESS_TOKEN_NOT_VALID: 1,
		PLAYLIST_SAVED : 2,
	};

	this.setAlert = function(type) {
		var code = this.ALERTS[type];
		var alert = {};
		switch(code){
			case 0:
				alert = {
					'type': 'error',
					'message': 'An error occurred. Check your connection and try again.'
				};
				break;
			case 1:
				alert = {
					'type': 'error',
					'message': 'Not a valid session. Redirecting to login...'
				};
				break;
			case 2:
				alert = {
					'type': 'success',
					'message': 'Playlist saved correctly!'
				};
				break;
		}
		$rootScope.alert = alert;
		$rootScope.alert.visible = true;
		console.info(alert.message);
		setTimeout(function() {
			$rootScope.$apply(function() {
				$rootScope.alert.visible = false;
			});
		},3000)
	};

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

var app = angular.module('app', ['spotifyModule', 'helperModule', 'ngRoute', 'ngAnimate']);

app.factory('myHttpInterceptor', ['$q', 'Helper', function($q, Helper, $rootScope) {
  return {
    // optional method
    'request': function(config) {
    	// do something on success
    	return config;
    },

    // optional method
   'requestError': function(rejection) {
   		console.log('requestError');
		return $q.reject(rejection);
    },

    // optional method
    'response': function(response) {
	    // do something on success
	    return response;
    },

    // optional method
   'responseError': function(rejection) {
      // do something on error
      console.log('responseError');
      if(rejection.status === 401) {
      		// $rootScope.alert = {
      		// 	type: 'error',
      		// 	message: 'Not a valid session. Redirecting to login...'
      		// }
      		Helper.setAlert('ACCESS_TOKEN_NOT_VALID');
			console.log('Authentication no more valid. Redirecting...');
			setTimeout(function() {
				window.location = './';
			}, 2000);
			return $q.reject(rejection);
		} else {
			return $q.reject(rejection);
		}
      return $q.reject(rejection);
    }
  };
}]);

app.config(['$httpProvider', function($httpProvider) {
	$httpProvider.interceptors.push('myHttpInterceptor');
}]);

app.controller('appCtrl', ['Spotify', 'Helper', '$q', '$scope', '$rootScope', function(Spotify, Helper, $q, $scope, $rootScope){
		
		$rootScope.spotify = {};
		$rootScope.spotify.user = false;
		$rootScope.spotify.noLogin = false;

		// Ottiene l'access token dall'hashbang
		Spotify.getAccessToken();

		// Login
		$scope.spotify.login = function() {
			Spotify.login();
		};

		if ($scope.spotify.user){
			// get user details
			Spotify.getUser().then(function(user) {
				$scope.spotify.me = user;
			});
		}

		$scope.spotify.search = function() {
			// search spotify
			Spotify.search($scope.spotify.query, 'artist').then(function(artists) {
				$scope.spotify.artists = artists;
			});
		};

		$scope.spotify.savePlaylist = function(index) {
			var artist = $scope.spotify.artists[index];

			if (artist.options.albums && !artist.options.singles && !artist.options.compilations){
				var name = artist.name + ' Albums';
			} else if (!artist.options.albums && artist.options.singles && !artist.options.compilations){
				var name = artist.name + ' Singles';
			} else if (!artist.options.albums && !artist.options.singles && artist.options.compilations){
				var name = artist.name + ' Compilations';
			} else {
				var name = artist.name + ' Discography';
			}

			var getArtistSongs = Spotify.getArtistAlbums(artist, artist.options).then(function(albums) {
				var promises = [];
				angular.forEach(albums, function(album) {
					promises.push(Spotify.getAlbumTracks(album));
				});
				return $q.all(promises).then(function(albumTracks) {
					var tracks = Helper.mergeArrays(albumTracks);
					var uris = [];
					angular.forEach(tracks, function(track) {
						uris.push(track.uri);
					});
					return uris;
				});
			});
			
			var createPlaylist = Spotify.createPlaylist($scope.spotify.me, name);

			$q.all([getArtistSongs, createPlaylist]).then(function(res) {
				var uris = res[0];
				var playlist = res[1];
				return Spotify.addTracksToPlaylist(playlist, uris);
			}).then(function(res) {
				Helper.setAlert('PLAYLIST_SAVED');
			});
		};

}]);

