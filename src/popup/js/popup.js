
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
      trackEvent('popup', 'playNow');
    }
    chrome.runtime.getBackgroundPage(function(window) {
      // console.log(window);
      window.SpeakEntry(entry);
    });
    trackEvent('popup', 'playEntry');
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
    trackEvent('popup', 'controlPlayer_' + action);
  };

  $scope.gotoOptionPage = function () {
    window.open(chrome.extension.getURL('src/option/option.html'), '_blank');
    trackEvent('popup', 'gotoOptionPage');
  };
}]);

}());

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-44540819-2']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

function trackEvent(targetName, eventName) {
  _gaq.push(['_trackEvent', targetName, eventName]);
};


