var app = angular.module('app', ['spotifyModule', 'helperModule']);

app.controller('appCtrl', ['Spotify', 'Helper', '$q', '$scope', '$rootScope', function(Spotify, Helper, $q, $scope, $rootScope){
		
		$rootScope.spotify = {};
		$rootScope.spotify.user = false;
		$rootScope.spotify.noLogin = false;

		// Controlla se esiste un utente e che l'accessToken è ancora valida. Se non è impostato un utente restituisce Falso.
		Spotify.getAccessToken();

		// Login
		$scope.spotify.login = function() {
			Spotify.login();
		};

		// get user details
		Spotify.getUser().then(function(user) {
			$scope.spotify.me = user;
		});	

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
				console.info('playlist created');
				var uris = res[0];
				var playlist = res[1];
				return Spotify.addTracksToPlaylist(playlist, uris);
			}).then(function(res) {
				console.info('songs added');
			});
		};

}]);