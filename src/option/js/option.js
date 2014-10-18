
(function () {

var optionModule = angular.module('optionModule', []);

optionModule.service('Storage', function () {
	// todo: 搬到事件頁面去
  // this.get = storage.semiSync.get;
  // this.set = storage.semiSync.set;
  this.get = function (key, callback) {
  	chrome.runtime.getBackgroundPage(function (window) {
  		window.storage.semiSync.get(key, callback);
  	});
  };
  this.set = function (key, value, callback) {
  	chrome.runtime.getBackgroundPage(function (window) {
  		window.storage.semiSync.set(key, value, callback);
  	});
  };
});

optionModule.controller('MainCtrl', function ($rootScope, $scope) {


	$rootScope.messages = {
		extActionTitle: chrome.i18n.getMessage('extActionTitle'),
		optionTitle: chrome.i18n.getMessage('optionTitle'),
		optionFeedManagementTitle: chrome.i18n.getMessage('optionFeedManagementTitle'),
		operationRemoveStr: chrome.i18n.getMessage('operationRemoveStr'),
		operationAddStr: chrome.i18n.getMessage('operationAddStr'),
		optionAnnouncerSettingTitle: chrome.i18n.getMessage('optionAnnouncerSettingTitle'),
		optionAnnouncerVoiceTitle: chrome.i18n.getMessage('optionAnnouncerVoiceTitle'),
		optionAnnouncerRateTitle: chrome.i18n.getMessage('optionAnnouncerRateTitle'),
		optionAnnouncerPitchTitle: chrome.i18n.getMessage('optionAnnouncerPitchTitle'),
		optionAnnouncerVolumeTitle: chrome.i18n.getMessage('optionAnnouncerVolumeTitle'),
		optionAnnouncerTestSpeechTitle: chrome.i18n.getMessage('optionAnnouncerTestSpeechTitle'),
		optionAnnouncerDefaultsTitle: chrome.i18n.getMessage('optionAnnouncerDefaultsTitle')
	};
});

function FeedInfo(title, url) {
	return {
		title: title,
		url: url
	}
}

optionModule.controller('FeedManagementCtrl', function ($scope, Storage) {
	$scope.feedList = [];

	// $scope.feedList.push(new FeedInfo("INSIDE", "http://www.inside.com.tw/feed"));
	// $scope.feedList.push(new FeedInfo("iThome", "http://www.ithome.com.tw/rss"));
	// $scope.feedList.push(new FeedInfo("TechOrange", "http://buzzorange.com/techorange/feed/"));

	Storage.get('feedList', function (data) {
		if (typeof(data) === "object" && typeof(data.length) !== "undefined") {
			$scope.$apply(function () {
				$scope.feedList = data;
			});
		}
	});

	$scope.feedTemp = new FeedInfo();

	$scope.removeFeed = function (item) {
		var idx = $scope.feedList.indexOf(item);
		if (idx >= 0 && idx < $scope.feedList.length) {
			$scope.feedList.splice(idx, 1);
			$scope.updateFeed();
		}
	};

	$scope.addFeed = function (item) {
		if (!item.title || !item.url) {
			return;
		}
		for (var i = 0; i < $scope.feedList.length; i++) {
			if (item.url === $scope.feedList[i].url) {
				exist = true;
				return;
			}
		}
		$scope.feedList.push(item);
		$scope.feedTemp = new FeedInfo();
		$scope.updateFeed();
	};

	$scope.updateFeed = function (item) {
		// console.log("enter updateFeed");
		if (typeof(item) !== "undefined" && (!item.title || !item.url)) {
			return;
		}
		Storage.set('feedList', angular.copy($scope.feedList));
	}
});

optionModule.controller('AnnouncerSettingCtrl', function ($scope, Storage) {
	$scope.voices = [];
	$scope.myVoice;
	$scope.myRate = 1.0;
	$scope.myPitch = 1.0;
	$scope.myVolume = 1.0;

	chrome.tts.getVoices(function (voices) {
		$scope.$apply(function () {
			$scope.voices = voices;
			$scope.myVoice = $scope.voices[0];
		});
	});

	$scope.testSpeech = function () {
		var text = "Hello, I am RSS Announcer";
		var options = {
			enqueue: false,
			voiceName: $scope.myVoice.voiceName,
			extensionId: $scope.myVoice.extensionId,
			lang: $scope.myVoice.lang,
			gender: $scope.myVoice.gender,
			rate: parseFloat($scope.myRate, 10),
			pitch: parseFloat($scope.myPitch, 10),
			volume: parseFloat($scope.myVolume, 10)
		};
		chrome.tts.speak(text, options);
	};

	$scope.setDefaults = function () {
		$scope.myVoice = $scope.voices.length > 0 ? $scope.voices[0] : undefined;
		$scope.myRate = 1.0;
		$scope.myPitch = 1.0;
		$scope.myVolume = 1.0;
		$scope.updateAnnouncerSetting();
	};

	$scope.updateAnnouncerSetting = function () {
		// console.log("enter updateAnnouncerSetting");
		if (typeof($scope.myVoice) === 'undefined' ||
			$scope.myRate < 0.1 || $scope.myRate > 10.0 ||
			$scope.myPitch < 0.1 || $scope.myPitch > 10.0 ||
			$scope.myVolume < 0.1 || $scope.myVolume > 10.0) {
			return;
		}
		var announcerSetting = {
			voice: $scope.myVoice,
			rate: parseFloat($scope.myRate, 10),
			pitch: parseFloat($scope.myPitch, 10),
			volume: parseFloat($scope.myVolume, 10)
		};
		// console.log(announcerSetting);
		Storage.set('announcerSetting', announcerSetting);
	};

	Storage.get('announcerSetting', function (data) {
		if (typeof(data) === "object") {
			$scope.$apply(function () {
				if (typeof(data.voice) !== 'undefined') {
					for (var i = 0; i < $scope.voices.length; i++) {
						if (data.voice.voiceName === $scope.voices[i].voiceName) {
							$scope.myVoice = $scope.voices[i];
							break;
						}
					}
				}
				if (typeof(data.rate) !== 'undefined') {
					$scope.myRate = data.rate;
				}
				if (typeof(data.pitch) !== 'undefined') {
					$scope.myPitch = data.pitch;
				}
				if (typeof(data.volume) !== 'undefined') {
					$scope.myVolume = data.volume;
				}
			});
		}
	});

});

}());
