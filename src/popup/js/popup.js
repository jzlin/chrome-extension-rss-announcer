
(function () {

var feedModule = angular.module('feedModule', ['ngResource']);

feedModule.service('Storage', function () {
  this.get = storage.semiSync.get;
  this.set = storage.semiSync.set;
});

feedModule.controller('FeedCtrl', function ($rootScope, $scope, Storage) {
  $scope.feeds = [];
  Storage.get('feeds', function (data) {
    if (typeof(data) !== 'undefined' && typeof(data.length) !== 'undefined') {
      $scope.$apply(function () {
        $scope.feeds = data;
      });
    }
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

}());


