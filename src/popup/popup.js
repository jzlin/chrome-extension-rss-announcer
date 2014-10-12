var myApp = angular.module("myApp", []);

myApp.controller("articleCtrl", function ($scope) {

  $scope.articles = [];

  $scope.getRSS = function(FEED_URL) {
    $.ajax({
      url      : 'https://ajax.googleapis.com/ajax/services/feed/load?v=1.0&num=10&output=json&callback=?&q=' + encodeURIComponent(FEED_URL),
      dataType : 'json',
      success  : function (data) {
        if (data.responseData.feed && data.responseData.feed.entries) {
          $scope.$apply(function () {
            $scope.articles = data.responseData.feed.entries;
            console.log($scope.articles);
          });
        }
      }
    });
  };

  $scope.init = function () {
    $scope.getRSS("http://ithelp.ithome.com.tw/rss/question?tag=extension");
  };

  $scope.init();

});


// function getRSS(FEED_URL) {
//   $.ajax({
//     url      : 'https://ajax.googleapis.com/ajax/services/feed/load?v=1.0&num=10&output=json&callback=?&q=' + encodeURIComponent(FEED_URL),
//     dataType : 'json',
//     success  : function (data) {
//       if (data.responseData.feed && data.responseData.feed.entries) {
//         $.each(data.responseData.feed.entries, function (i, e) {
//           console.log("------------------------");
//           console.log("title      : " + e.title);
//           console.log("author     : " + e.author);
//           console.log("description: " + e.description);
//           console.log("link       : " + e.link);
//           console.log(e);
//         });
//       }
//     }
//   });
// }