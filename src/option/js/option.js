
(function () {

var optionModule = angular.module('optionModule', []);

optionModule.service('Storage', function () {
  this.get = storage.semiSync.get;
  this.set = storage.semiSync.set;
});

optionModule.controller('MainCtrl', function ($rootScope, $scope) {


	$rootScope.messages = {
		extActionTitle: chrome.i18n.getMessage('extActionTitle'),
		optionTitle: chrome.i18n.getMessage('optionTitle'),
		optionFeedManagementTitle: chrome.i18n.getMessage('optionFeedManagementTitle'),
		operationRemoveStr: chrome.i18n.getMessage('operationRemoveStr'),
		operationAddStr: chrome.i18n.getMessage('operationAddStr')
	};
});

function FeedInfo(title, url) {
	return {
		title: title,
		url: url
	}
}

optionModule.controller('FeedManagementCtrl', function ($scope, $scope, Storage) {
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
		console.log("enter updateFeed");
		if (typeof(item) !== "undefined" && (!item.title || !item.url)) {
			return;
		}
		Storage.set('feedList', angular.copy($scope.feedList));
	}
});

}());
