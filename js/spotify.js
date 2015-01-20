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