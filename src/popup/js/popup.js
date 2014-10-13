var feeds = [];

var feedModule = angular.module('feedModule', ['ngResource']);

feedModule.factory('FeedLoader', function ($resource) {
  return $resource('https://ajax.googleapis.com/ajax/services/feed/load', {}, {
    fetch: {
      method: 'JSONP',
      params: {
        v: '1.0',
        callback: 'JSON_CALLBACK'
      }
    }
  });
});

feedModule.service('Storage', function () {
  this.get = storage.semiSync.get;
  this.set = storage.semiSync.set;
});

feedModule.service('FeedList', function ($rootScope, FeedLoader, Storage) {
  this.get = function () {
    Storage.get('feedList', function (data) {
      var feedSources = [];
      if (typeof(data) === "object" && typeof(data.length) !== "undefined") {
        feedSources = data;
      }
      if (feeds.length === 0) {
        for (var i = 0; i < feedSources.length; i++) {
          FeedLoader.fetch({q: feedSources[i].url, num: 10}, {}, function (data) {
            var feed = data.responseData.feed;
            for (var j = 0; j < feed.entries.length; j++) {
              var publishedDate = new Date(feed.entries[j].publishedDate);
              feed.entries[j].publishedDate = publishedDate.getTime();
            }
            feeds.push(feed);
          });
        }
      }
    });
    return feeds;
  };
});

feedModule.controller('FeedCtrl', function ($rootScope, $scope, FeedList) {
  $scope.feeds = FeedList.get();
  $scope.$on('FeedList', function (event, data) {
    $scope.feeds = data;
  });

  $rootScope.messages = {
    extActionTitle: chrome.i18n.getMessage('extActionTitle')
  };
});

feedModule.controller('ToolCtrl', function ($scope) {
  $scope.gotoOptionPage = function () {
    window.open(chrome.extension.getURL('src/option/option.html'), '_blank');
  };
});

