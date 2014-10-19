
(function () {

var maxLen = 70;

localStorage['announcerSetting'] = JSON.stringify({
  voice: {
    lang: 'zh-CN'
  },
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0
});

// chrome.commands.onCommand.addListener(function(command)
// {
//   // console.debug('command is : ' + command);

//   // Develop use : reload extension.
//   if (command == 'reload_extension')
//     chrome.runtime.reload();
// });

function InitFeedList() {
  var feedList = [
    {
      title: "JZLIN'S BLOG",
      url: "http://jzlin-blog.logdown.com/posts.atom"
    }
  ];
  storage.semiSync.get('feedList', function (data) {
    if (typeof(data) === 'undefined' || data.length === 0) {
      storage.semiSync.set('feedList', feedList);
    }
  });
}

chrome.runtime.onInstalled.addListener(function (details) {
  InitFeedList();
  UpdateAnnouncerSetting();
  // RemoveSomeFeedToTest();
});

function RemoveSomeFeedToTest() {
  storageInBG.get('feeds', function(data) {
    // console.log(data);
    // for (var i = 0; i < data.length; i++) {
    for (var i = 0; i < 2; i++) {
      data[i].entries.splice(0, 2);
    }
    storageInBG.set('feeds', data);
  });
}

function UpdateFeedsByFeedList () {
  storageInBG.get('feedList', function (data) {
    var feedList = data;
    storageInBG.get('feeds', function (data) {
      var feeds = data;
      for (var i = feeds.length - 1; i >= 0; i--) {
        var isRemove = true;
        for (var j = 0; j < feedList.length; j++) {
          if (feedList[j].url === feeds[i].feedUrl) {
            isRemove = false;
            break;
          }
        }
        if (isRemove) {
          feeds.splice(i, 1);
        }
      }
      storageInBG.set('feeds', feeds);
    });
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
    else if (key === 'feedList') {
      UpdateFeedsByFeedList();
      GetFeed();
    }
    else if (key === 'announcerSetting') {
      localStorage['announcerSetting'] = JSON.stringify(storageChange.newValue);
    }
  }
});

chrome.notifications.onClosed.addListener(function (notificationId, byUser) {
  // console.log('notificationId: ' + notificationId);
  // console.log('byUser: ' + byUser);
});

chrome.notifications.onClicked.addListener(function (notificationId) {
  // console.log('notificationId: ' + notificationId);
});

chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
  // console.log('notificationId: ' + notificationId);
  // console.log('buttonIndex: ' + buttonIndex);

  if (notificationId.indexOf('newFeedsNotification_') !== -1) {
    var feedUrl = notificationId.substr(('newFeedsNotification_').length);
    // console.log(feedUrl);
    if (buttonIndex === 1) {
      chrome.tts.stop();
    }
    GetNewFeedByUrl(feedUrl, function (feed) {
      // console.log(feed);
      SpeakFeed(feed);
    });
  }
});

function UpdateAnnouncerSetting() {
  storageInBG.get('announcerSetting', function(data) {
    if (typeof(data) !== 'undefined') {
      localStorage['announcerSetting'] = JSON.stringify(data);
    }
  });
}

function GetSentences(content) {
  if (typeof(content) === 'undefined' || typeof(content.substr) !== 'function') {
    return [];
  }
  var spliters = content.match(/[\⋯\·\．\，\。\！\？\：\；\,\;\n\.\!\?\:]/g);
  var sentences = [];
  while (content.length > 0) {
    var sentence = undefined;
    var spliter = (spliters != null && spliters.length > 0) ? 
      spliters[0] : undefined;
    var doAppend = true;
    if (typeof(spliter) !== 'undefined') {
      var idx = content.indexOf(spliter);
      // 若 spliter 為起始位置，則去掉起始位置的 spliter 再重來。
      if (idx === 0) {
        content = content.substr(spliter.length);
        spliters.splice(0, 1);
        continue;
      }
      else if ((idx + spliter.length) <= content.length) {
        sentence = content.slice(0, idx + spliter.length);
        content = content.substr(idx + spliter.length);
        spliters.splice(0, 1);
      }
      else {
        content = '';
      }
      doAppend = doAppend && 
        (['，', '。', '！', '？', '：', '!', '?', ':'].indexOf(spliter) === -1);
    }
    else {
      sentence = content;
      content = '';
    }
    if (typeof(sentence) !== 'undefined') {
      if (sentence.length <= maxLen) {
        doAppend = doAppend && 
          sentences.length > 0 &&
          (sentences[sentences.length - 1].length + sentence.length) <= maxLen;
        if (doAppend) {
          sentences[sentences.length - 1] += sentence;
        }
        else {
          sentences.push(sentence);
        }
      }
      else {
        while (sentence.length > 0) {
          var subSentence = undefined;
          if (sentence.length > maxLen) {
            subSentence = sentence.slice(0, maxLen);
            sentence = sentence.substr(maxLen);
          }
          else {
            subSentence = sentence;
            sentence = '';
          }
          if (typeof(subSentence) !== 'undefined') {
            sentences.push(subSentence);
          }
        }
      }
    }
  }
  return sentences;
}

window.SpeakFeed = SpeakFeed;
function SpeakFeed(feed) {
  // console.log('enter SpeakFeed');
  // console.log(feed);
  // chrome.tts.stop();
  for (var i = 0; i < feed.entries.length; i++) {
    var entry = feed.entries[i];
    SpeakEntry(entry);
  }
}

window.SpeakEntry = SpeakEntry;
function SpeakEntry(entry) {
  var divElement = document.createElement("DIV");
  divElement.style.cssText = "display: none;";
  divElement.innerHTML = entry.content;
  var content = divElement.innerText.trim() || entry.contentSnippet;
  var sentences = GetSentences(content);
  var haveContent = typeof(content) !== 'undefined' && content.trim().length > 0;
  
  var introduction = entry.author.length > 0 ? 
    chrome.i18n.getMessage('ttsIntroductionWithAuthor', [entry.author, entry.title]) : 
    chrome.i18n.getMessage('ttsIntroduction', entry.title);
  
  var noContentMessage = entry.author.length > 0 ? 
    chrome.i18n.getMessage('ttsReadFailWithAuthor', [entry.author, entry.title]) : 
    chrome.i18n.getMessage('ttsReadFail', entry.title);

  if (haveContent) {
    SpeakSentences(GetSentences(introduction), true);
  }
  else {
    SpeakSentences(GetSentences(noContentMessage), true);
  }
  // console.log(content);
  // console.log(sentences);
  SpeakSentences(sentences);
  // 文章結束後的休息時間
  if (haveContent) {
    for (var j = 0; j < 5; j++) {
      SpeakText('');
    }
  }
}

function SpeakSentences(sentences, toLog) {
  if (typeof(sentences) !== 'undefined' || sentences.length > 0) {
    for (var i = 0; i < sentences.length; i++) {
      var sentence = sentences[i].trim();
      if (sentence !== '') {
        SpeakText(sentence, toLog);
      }
    }
  }
}

function SpeakText(text, toLog) {
  if (typeof(text) === 'undefined') {
    return;
  }
  if (text.length > maxLen) {
    SpeakText(text.slice(0, maxLen));
    SpeakText(text.substr(maxLen));
    return;
  }

  var announcerSetting = JSON.parse(localStorage['announcerSetting']);
  if (toLog) {
    console.log('will speak: ' + text)
  }
  // console.log(announcerSetting);
  chrome.tts.speak(text, {
    extensionId: announcerSetting.voice.extensionId || undefined,
    voiceName: announcerSetting.voice.voiceName || undefined,
    gender: announcerSetting.voice.gender || undefined,
    lang: announcerSetting.voice.lang || 'zh-CN', 
    rate: announcerSetting.rate || 1.0, 
    pitch: announcerSetting.pitch || 1.0,
    volume: announcerSetting.volume || 1.0,
    enqueue: true,
    onEvent: function (event) {
      // console.log("在位置 " + event.charIndex + " 處產生事件 " + event.type);
      if (event.type === 'error') {
        console.log('錯誤：' + event.errorMessage);
      }
    }
  }, function() {
    if (chrome.runtime.lastError) {
      console.log('Error：' + chrome.runtime.lastError.message);
    }
  });
}

function CheckFeedsDifferent(oldValue, newValue) {
  var newFeeds = [];
  for (var i = 0; i < newValue.length; i++) {
    var newFeed = newValue[i];
    var oldFeed = undefined;
    var isFeedExist = false;
    if (typeof(oldValue) !== 'undefined') {
      for (var j = 0; j < oldValue.length; j++) {
        if (newFeed.feedUrl === oldValue[j].feedUrl) {
          oldFeed = oldValue[j];
          isFeedExist = true;
          break;
        }
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
    localStorage['newFeeds'] = JSON.stringify(newFeeds);
    NewRSSNotifications(newFeeds);
  }
}

function NewRSSNotifications(newFeeds) {
  // console.log("have new feeds");
  // console.log(newFeeds);
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
          title: chrome.i18n.getMessage('newFeedsNotificationPlayNextBtnTitle'),
          iconUrl: chrome.runtime.getURL('src/popup/images/add.svg')
        },
        {
          title: chrome.i18n.getMessage('newFeedsNotificationPlayNowBtnTitle'),
          iconUrl: chrome.runtime.getURL('src/popup/images/play.svg')
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
          // console.log(notificationId);
        });
      });
    }(notificationId, options));
  }
}

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === 'GetFeed') {
    // console.log('hello: ' + new Date());
    // RemoveSomeFeedToTest();
    GetFeed();
  }
});

chrome.alarms.create('GetFeed', {
  when: new Date('2014-10-01').getTime(),
  periodInMinutes: 15
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

function GetNewFeedByUrl(feedUrl, callback) {
  var newFeeds = JSON.parse(localStorage['newFeeds']);
  if (typeof(newFeeds) !== 'undefined') {
    for (var i = 0; i < newFeeds.length; i++) {
      if (newFeeds[i].feedUrl === feedUrl) {
        if (typeof(callback) === 'function') {
          callback(newFeeds[i]);
        }
        break;
      }
    }
  }
}

}());
