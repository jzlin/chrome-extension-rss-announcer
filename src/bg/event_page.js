
(function () {

chrome.commands.onCommand.addListener(function(command)
{
  console.debug('command is : ' + command);

  // Develop use : reload extension.
  if (command == 'reload_extension')
    chrome.runtime.reload();
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === 'getFeed') {
    console.log('hello: ' + new Date());
    getFeed();
  }
});

chrome.alarms.create('getFeed', {
  when: new Date('2014-10-01').getTime(),
  periodInMinutes: 1
});

google.load("feeds", "1");

var storageInBG = storage.local;

var feeds = [];

function FeedLoader(params, callback) {
  if (typeof(params) !== 'object' || 
    typeof(params.q) === 'undefined') {
    callback({
      error: {
        message: "params is undefined"
      }
    });
  }

  var feed = new google.feeds.Feed(params.q);
  feed.setNumEntries(params.num || 10);
  feed.load(function (data) {
    // Parse data depending on the specified response format, default is JSON.
    console.log(data);
    if (typeof(callback) === 'function') {
      callback(data);
    }
  });
}

function getFeed() {
  storageInBG.get('feedList', function (data) {
    var feedSources = [];
    if (typeof(data) === "object" && typeof(data.length) !== "undefined") {
      feedSources = data;
    }
    if (feeds.length === 0) {
      for (var i = 0; i < feedSources.length; i++) {
        FeedLoader({q: feedSources[i].url, num: 10}, function (data) {
          if (typeof(data) !== 'object' ||
            typeof(data.error) === 'object') {
            console.error(data.error.message);
          }
          else {
            var feed = data.feed;
            for (var j = 0; j < feed.entries.length; j++) {
              var publishedDate = new Date(feed.entries[j].publishedDate);
              feed.entries[j].publishedDate = publishedDate.getTime();
            }
            feeds.push(feed);
            if (feeds.length !== 0) {
              storageInBG.set('feeds', feeds);
            }
          }
        });
      }
    }
  });
}

}());
