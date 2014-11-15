
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

  chrome.tts.isSpeaking(function(speaking) {
    var haveQueue = JSON.parse(localStorage.sentenceQueueName).length > 0 || 
                    JSON.parse(localStorage.articleQueueName).length > 0
    $rootScope.control = {
      canStop: speaking || haveQueue,
      canPause: speaking,
      canPlay: !speaking && haveQueue
    };
  });

  $scope.feeds = [];
  Storage.get('feeds', function (data) {
    if (typeof(data) !== 'undefined' && typeof(data.length) !== 'undefined') {
      $scope.$apply(function () {
        $scope.feeds = data;
      });
    }
  });

  $scope.playEntry = function (entry, playNow) {
    $rootScope.control.canStop = true;
    $rootScope.control.canPause = true;
    $rootScope.control.canPlay = false;
    if (playNow) {
      trackEvent('popup', 'playNow', JSON.stringify(entry), 1);
    }
    else {
      trackEvent('popup', 'playEntry', JSON.stringify(entry), 1);
    }
    chrome.runtime.getBackgroundPage(function(window) {
      // console.log(window);
      window.SpeakEntry(entry, playNow);
    });
  };

  $scope.openLink = function (entry) {
    trackEvent('popup', 'openLink', JSON.stringify(entry), 1);
  };

  $rootScope.messages = {
    extActionTitle: chrome.i18n.getMessage('extActionTitle'),
    emptyFeedListMsg: chrome.i18n.getMessage('emptyFeedListMsg')
  };
}]);

feedModule.controller('ToolCtrl', [
  '$rootScope', 
  '$scope', 
  function ($rootScope, $scope) {

  $scope.controlPlayer = function (action) {
    $rootScope.control.canStop = action !== 'stop';
    $rootScope.control.canPause = action === 'play';
    $rootScope.control.canPlay = action === 'pause';

    chrome.runtime.getBackgroundPage(function(window) {
      // console.log(window);
      if (action === 'stop') {
        window.announcer.StopAllArticle();
      }
      else if (action === 'play') {
        window.announcer.Resume();
      }
      else if (action === 'pause') {
        window.announcer.Pause();
      }
    });
    trackEvent('popup', 'controlPlayer_' + action, new Date().toString(), 3);
  };

  $scope.gotoOptionPage = function () {
    window.open(chrome.extension.getURL('src/option/option.html'), '_blank');
    trackEvent('popup', 'gotoOptionPage', new Date().toString(), 1);
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

function trackEvent(category, action, opt_label, opt_value, opt_noninteraction) {
  _gaq.push(['_trackEvent', category, action, opt_label, opt_value, opt_noninteraction]);
}


