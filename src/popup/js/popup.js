
(function () {

var feedModule = angular.module('feedModule', ['ngResource']);

feedModule.service('Storage', function () {
  this.get = storage.semiSync.get;
  this.set = storage.semiSync.set;
});

feedModule.controller('FeedCtrl', [
  '$rootScope', 
  '$scope', 
  'Storage', 
  function ($rootScope, $scope, Storage) {
  $scope.feeds = [];
  Storage.get('feeds', function (data) {
    if (typeof(data) !== 'undefined' && typeof(data.length) !== 'undefined') {
      $scope.$apply(function () {
        $scope.feeds = data;
      });
    }
  });

  $scope.playEntry = function (entry, playNow) {
    if (playNow) {
      chrome.tts.stop();
    }
    chrome.runtime.getBackgroundPage(function(window) {
      // console.log(window);
      window.SpeakEntry(entry);
    });
  };

  $rootScope.messages = {
    extActionTitle: chrome.i18n.getMessage('extActionTitle')
  };
}]);

feedModule.controller('ToolCtrl', [
  '$scope', 
  function ($scope) {
  $scope.controlPlayer = function (action) {
    chrome.tts.isSpeaking(function (speaking) {
      // console.log('speaking: ' + speaking);
      if (action === 'stop') {
        chrome.tts.stop();
      }
      else if (action === 'play') {
        if (speaking) {
          chrome.tts.resume();
        }
        else {
          chrome.runtime.getBackgroundPage(function(window) {
            // console.log(window);
            // console.log($scope.feeds);
            for (var i = 0; i < $scope.feeds.length; i++) {
              (function (feed) {
                setTimeout(function () {
                  window.SpeakFeed(feed);
                }, i * 1000);
              }($scope.feeds[i]));
            }
          });
        }
      }
      else if (action === 'pause') {
        chrome.tts.pause();
      }
    });
  };

  $scope.gotoOptionPage = function () {
    window.open(chrome.extension.getURL('src/option/option.html'), '_blank');
  };
}]);

}());


