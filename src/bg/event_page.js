
(function () {

chrome.commands.onCommand.addListener(function(command)
{
  console.debug('command is : ' + command);

  // Develop use : reload extension.
  if (command == 'reload_extension')
    chrome.runtime.reload();
});

chrome.runtime.onInstalled.addListener(function (details) {
  // RemoveSomeFeedToTest();
});

function RemoveSomeFeedToTest() {
  storage.local.get('feeds', function(data) {
    console.log(data);
    data[0].entries.splice(0, 3);
    data[1].entries.splice(0, 1);
    storage.local.set('feeds', data);
  });
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (key in changes) {
    var storageChange = changes[key];
    // console.log('Storage key "%s" in namespace "%s" changed. ' +
    //             'Old value was "%s", new value is "%s".',
    //             key,
    //             namespace,
    //             storageChange.oldValue,
    //             storageChange.newValue);

    if (key === 'feeds') {
      // console.log(storageChange.oldValue);
      // console.log(storageChange.newValue);

      CheckFeedsDifferent(storageChange.oldValue, storageChange.newValue);
    }
  }
});

chrome.notifications.onClosed.addListener(function (notificationId, byUser) {
  console.log('notificationId: ' + notificationId);
  console.log('byUser: ' + byUser);
});

chrome.notifications.onClicked.addListener(function (notificationId) {
  console.log('notificationId: ' + notificationId);
});

chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
  console.log('notificationId: ' + notificationId);
  console.log('buttonIndex: ' + buttonIndex);
});

function CheckFeedsDifferent(oldValue, newValue) {
  var newFeeds = [];
  for (var i = 0; i < newValue.length; i++) {
    var newFeed = newValue[i];
    var oldFeed = undefined;
    var isFeedExist = false;
    for (var j = 0; j < oldValue.length; j++) {
      if (newFeed.feedUrl === oldValue[j].feedUrl) {
        oldFeed = oldValue[j];
        isFeedExist = true;
        break;
      }
    }
    if (isFeedExist && typeof(oldFeed) !== 'undefined') {
      // check different
      var newEntries = [];
      for (var j = 0; j < newFeed.entries.length; j++) {
        var isEntriesExist = false;
        for (var k = 0; k < oldFeed.entries.length; k++) {
          if (newFeed.entries[j].link === oldFeed.entries[k].link) {
            isEntriesExist = true;
            break;
          }
        }
        if (!isEntriesExist) {
          newEntries.push(newFeed.entries[j]);
        }
      }
      if (newEntries.length > 0) {
        newFeeds.push({
          author: newFeed.author,
          description: newFeed.description,
          entries: newEntries,
          feedUrl: newFeed.feedUrl,
          link: newFeed.link,
          title: newFeed.title,
          type: newFeed.type
        });
      }
    }
    else {
      newFeeds.push(newFeed);
    }
  }
  if (newFeeds.length > 0) {
    NewRSSNotifications(newFeeds);
  }
}

function NewRSSNotifications(newFeeds) {
  console.log("have new feeds");
  console.log(newFeeds);
  for (var i = 0; i < newFeeds.length; i++) {
    var newFeed = newFeeds[i];
    var notificationId = 'newFeedsNotification_' + newFeed.feedUrl;
    var options = {
      type: 'list', //"basic", "image", "list", or "progress"
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: chrome.i18n.getMessage('newFeedsNotificationTitle', newFeed.title),
      message: '',
      contextMessage: chrome.i18n.getMessage('newFeedsNotificationMsg', newFeed.entries.length.toString()),
      priority: 0,
      // eventTime: Date.now(),
      buttons: [
        {
          title: chrome.i18n.getMessage('newFeedsNotificationPlayBtnTitle'),
          iconUrl: ''
        },
        {
          title: chrome.i18n.getMessage('newFeedsNotificationCloseBtnTitle'),
          iconUrl: ''
        }
      ],
      items: [],
      isClickable: true
    };

    for (var j = 0; j < newFeed.entries.length; j++) {
      var entry = newFeed.entries[j];
      options.items.push({
        title: entry.author,
        message: entry.title
      });
    }

    (function (notificationId, options) {
      chrome.notifications.clear(notificationId, function (wasCleared) {
        // console.log('wasCleared:' + wasCleared);
        chrome.notifications.create(notificationId, options, function (notificationId) {
          console.log(notificationId);
        });
      });
    }(notificationId, options));
  }
}

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === 'GetFeed') {
    console.log('hello: ' + new Date());
    // RemoveSomeFeedToTest();
    GetFeed();
  }
});

chrome.alarms.create('GetFeed', {
  when: new Date('2014-10-01').getTime(),
  periodInMinutes: 1
});

google.load("feeds", "1");

var storageInBG = storage.local;

var feeds = [];

function AddFeed(feed) {
  for (var i = 0; i < feeds.length; i++) {
    if (feed.feedUrl === feeds[i].feedUrl) {
      feeds[i] = feed;
      return;
    }
  }
  feeds.push(feed);
}

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
    // console.log(data);
    if (typeof(callback) === 'function') {
      callback(data);
    }
  });
}

function GetFeed() {
  storageInBG.get('feedList', function (data) {
    var feedSources = [];
    if (typeof(data) === "object" && typeof(data.length) !== "undefined") {
      feedSources = data;
    }
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
          AddFeed(feed);
          if (feeds.length === feedSources.length) {
            storageInBG.set('feeds', feeds);
          }
        }
      });
    }
  });
}

}());
