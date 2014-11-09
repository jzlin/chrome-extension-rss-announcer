
(function () {

/**** DEV USE*****/

chrome.commands.onCommand.addListener(function(command)
{
  // console.debug('command is : ' + command);

  // Develop use : reload extension.
  if (command == 'reload_extension')
    chrome.runtime.reload();
});

function RemoveSomeFeedToTest() {
  storageInBG.get('feeds', function(data) {
    // console.log(data);
    if (typeof(data) != 'undefined') {
      // for (var i = 0; i < data.length; i++) {
      for (var i = 0; i < data.length && i < 2; i++) {
        data[i].entries.splice(0, 2);
      }
      storageInBG.set('feeds', data);
    }
  });
}

/**** END DEV USE*****/

var UPDATE_INTERVAL = 60;
var MAX_LEN = 70;
var NEW_FEED_ID_PREFIX = 'newFeedsNotification_';

chrome.runtime.onInstalled.addListener(function (details) {
  InitFeedList();
  UpdateAnnouncerSetting();
  // RemoveSomeFeedToTest(); // Test use
  trackEvent('event_page', 'installed', new Date().toString(), 10);
});

function InitFeedList() {
  var defaultFeedList = [
    {
      title: "JZLIN'S BLOG",
      url: "http://jzlin-blog.logdown.com/posts.atom"
    }
  ];
  storage.semiSync.get('feedList', function (data) {
    if (typeof(data) === 'undefined' || data.length === 0) {
      storage.semiSync.set('feedList', defaultFeedList);
    }
  });
}

function UpdateAnnouncerSetting() {
  storageInBG.get('announcerSetting', function(data) {
    if (typeof(data) !== 'undefined') {
      localStorage.announcerSetting = JSON.stringify(data);
    }
    else {
      InitAnnouncerSetting();
    }
  });
}

function InitAnnouncerSetting() {
  var defaultsAnnouncerSetting = {
    voice: undefined,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  };
  chrome.tts.getVoices(function (voices) {
    if (typeof(voices) !== 'undefined') {
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang === chrome.i18n.getUILanguage()) {
          defaultsAnnouncerSetting.voice = voices[i];
          break;
        }
      }
      if (typeof(defaultsAnnouncerSetting.voice) === 'undefined' && 
        voices.length > 0) {
        defaultsAnnouncerSetting.voice = voices[0];
      }
    }
    localStorage.announcerSetting = JSON.stringify(defaultsAnnouncerSetting);
    storage.semiSync.set('announcerSetting', defaultsAnnouncerSetting);
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

    if (key === 'announcerSetting' && 
      typeof(storageChange.newValue) !== 'undefined') {
      localStorage.announcerSetting = JSON.stringify(storageChange.newValue);
    }
    else if (key === 'notificationSetting' && 
      typeof(storageChange.newValue) !== 'undefined') {
      UpdateGetFeedAlarm(storageChange.newValue);
    }
    else if (key === 'feedList') {
      UpdateFeedsByFeedList();
      GetFeed();
    }
    else if (key === 'feeds') {
      CheckFeedsDifferent(storageChange.oldValue, storageChange.newValue);
    }
  }
});

function UpdateFeedsByFeedList () {
  storageInBG.get('feedList', function (data) {
    var feedList = data;
    if (typeof(feedList) != 'undefined') {
      storageInBG.get('feeds', function (data) {
        var feeds = data;
        if (typeof(feeds) !== 'undefined') {
          var newFeeds = [];
          for (var i = 0; i < feeds.length; i++) {
            for (var j = 0; j < feedList.length; j++) {
              if (feedList[j].url === feeds[i].feedUrl) {
                feeds[i].customTitle = feedList[j].title;
                newFeeds.push(feeds[i]);
              }
            }
          }
          storageInBG.set('feeds', newFeeds);
        }
      });
    }
    else {
      storageInBG.set('feeds', []);
    }
  });
}

function CheckFeedsDifferent(oldValue, newValue) {
  var newFeeds = [];
  if (typeof(newValue) === 'undefined') {
    return;
  }
  for (var i = 0; i < newValue.length; i++) {
    var newFeed = newValue[i];
    var oldFeed;
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
          customTitle: newFeed.customTitle,
          type: newFeed.type
        });
      }
    }
    else {
      newFeeds.push(newFeed);
    }
  }
  if (newFeeds.length > 0) {
    localStorage.newFeeds = JSON.stringify(newFeeds);
    storage.semiSync.get('notificationSetting', function (data) {
      if (typeof(data) !== 'undefined' && 
        data.enableNotification === true) {
        NewRSSNotifications(newFeeds);
      }
    });
  }
  else {
    localStorage.removeItem('newFeeds');
  }
}

function NewRSSNotifications(newFeeds) {
  if (typeof(newFeeds) === 'undefined') {
    return;
  }
  var notificationIconUrl = chrome.runtime.getURL('icons/icon128.png');
  var addButtonTitle = chrome.i18n.getMessage('newFeedsNotificationPlayNextBtnTitle');
  var addButtonIconUrl = chrome.runtime.getURL('src/popup/images/add.svg');
  var playButtonTitle = chrome.i18n.getMessage('newFeedsNotificationPlayNowBtnTitle');
  var playButtonIconUrl = chrome.runtime.getURL('src/popup/images/play.svg');
  for (var i = 0; i < newFeeds.length; i++) {
    var newFeed = newFeeds[i];
    var notificationId = NEW_FEED_ID_PREFIX + newFeed.feedUrl;
    var options = {
      type: 'list', //"basic", "image", "list", or "progress"
      iconUrl: notificationIconUrl,
      title: chrome.i18n.getMessage('newFeedsNotificationTitle', newFeed.customTitle),
      message: '',
      contextMessage: chrome.i18n.getMessage('newFeedsNotificationMsg', newFeed.entries.length.toString()),
      priority: 0,
      // eventTime: Date.now(),
      buttons: [
        {
          title: addButtonTitle,
          iconUrl: addButtonIconUrl
        },
        {
          title: playButtonTitle,
          iconUrl: playButtonIconUrl
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

chrome.notifications.onClosed.addListener(function (notificationId, byUser) {
  // console.log('notificationId: ' + notificationId);
  // console.log('byUser: ' + byUser);
  trackEvent('event_page', 'notificationClose', new Date().toString(), 0);
});

chrome.notifications.onClicked.addListener(function (notificationId) {
  // console.log('notificationId: ' + notificationId);
  trackEvent('event_page', 'notificationClicked', new Date().toString(), 0);
});

chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
  // console.log('notificationId: ' + notificationId);
  // console.log('buttonIndex: ' + buttonIndex);
  trackEvent('event_page', 'notificationButtonClicked', new Date().toString(), 2);

  if (notificationId.indexOf(NEW_FEED_ID_PREFIX) !== -1) {
    var feedUrl = notificationId.substr((NEW_FEED_ID_PREFIX).length);
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

function GetNewFeedByUrl(feedUrl, callback) {
  var newFeeds = [];
  if (typeof(localStorage.newFeeds) !== 'undefined') {
    newFeeds = JSON.parse(localStorage.newFeeds);
  }
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

window.SpeakFeed = SpeakFeed;
function SpeakFeed(feed) {
  if (typeof(feed) === 'undefined' || 
    typeof(feed.entries) === 'undefined') {
    return;
  }
  for (var i = 0; i < feed.entries.length; i++) {
    var entry = feed.entries[i];
    SpeakEntry(entry);
  }
}

window.SpeakEntry = SpeakEntry;
function SpeakEntry(entry) {
  if (typeof(entry) === 'undefined') {
    return;
  }
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

  var localOptions = {
    lang: chrome.i18n.getUILanguage(), 
    enqueue: true,
  };

  if (haveContent) {
    SpeakSentences(GetSentences(introduction), true, localOptions);
  }
  else {
    SpeakSentences(GetSentences(noContentMessage), true, localOptions);
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

function GetSentences(content) {
  if (typeof(content) === 'undefined' || typeof(content.substr) !== 'function') {
    return [];
  }
  var spliters = content.match(/[\⋯\·\．\，\。\！\？\：\；\,\;\n\.\!\?\:]/g);
  var sentences = [];
  while (content.length > 0) {
    var sentence;
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
      if (sentence.length <= MAX_LEN) {
        doAppend = doAppend && 
          sentences.length > 0 &&
          (sentences[sentences.length - 1].length + sentence.length) <= MAX_LEN;
        if (doAppend) {
          sentences[sentences.length - 1] += sentence;
        }
        else {
          sentences.push(sentence);
        }
      }
      else {
        while (sentence.length > 0) {
          var subSentence;
          if (sentence.length > MAX_LEN) {
            subSentence = sentence.slice(0, MAX_LEN);
            sentence = sentence.substr(MAX_LEN);
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

function SpeakSentences(sentences, toLog, customOptions) {
  if (typeof(sentences) === 'undefined' || 
    sentences.length === 0) {
    return;
  }
  for (var i = 0; i < sentences.length; i++) {
    var sentence = sentences[i].trim();
    if (sentence !== '') {
      SpeakText(sentence, toLog, customOptions);
    }
  }
}

function SpeakText(text, toLog, customOptions) {
  if (typeof(text) === 'undefined' ||
    text.trim().length === 0) {
    return;
  }
  if (text.length > MAX_LEN) {
    SpeakText(text.slice(0, MAX_LEN), toLog);
    SpeakText(text.substr(MAX_LEN), toLog);
    return;
  }

  if (toLog) {
    console.log('will speak: ' + text);
  }
  var options = {};
  if (typeof(customOptions) !== 'undefined') {
    options = customOptions;
  }
  else {
    options = GetSpeakOptions();
  }
  chrome.tts.speak(text, options, function() {
    if (chrome.runtime.lastError) {
      console.log('Error：' + chrome.runtime.lastError.message);
    }
  });
}

function GetSpeakOptions() {
  var announcerSetting;
  if (typeof(localStorage.announcerSetting) !== 'undefined') {
    announcerSetting = JSON.parse(localStorage.announcerSetting);
  }
  if (typeof(announcerSetting) === 'undefined' || 
    typeof(announcerSetting.voice) === 'undefined') {
    announcerSetting = {
      voice: {
        extensionId: undefined,
        voiceName: undefined,
        gender: undefined,
        lang: undefined
      },
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    };
  }
  // console.log(announcerSetting);
  var options = {
    extensionId: announcerSetting.voice.extensionId || undefined,
    voiceName: announcerSetting.voice.voiceName || undefined,
    gender: announcerSetting.voice.gender || undefined,
    lang: announcerSetting.voice.lang || chrome.i18n.getUILanguage(), 
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
  };

  return options;
}

google.load("feeds", "1");

var storageInBG = storage.local;

var feeds = [];

storageInBG.get('notificationSetting', function (data) {
  UpdateGetFeedAlarm(data);
});

function UpdateGetFeedAlarm (data) {
  var interval = UPDATE_INTERVAL;
  if (typeof(data) !== 'undefined' && 
    typeof(data.noticeInterval) !== 'undefined') {
    interval = typeof(data.noticeInterval) === 'number' ? 
      data.noticeInterval : data.noticeInterval.current * data.noticeInterval.magnification;
  }
  chrome.alarms.clear('GetFeed', function (wasCleared) {
    chrome.alarms.create('GetFeed', {
      when: new Date('2014-10-01').getTime(),
      periodInMinutes: interval
    });
  });
}

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === 'GetFeed') {
    // console.log('hello: ' + new Date());
    // RemoveSomeFeedToTest();
    GetFeed();
  }
});

function GetFeed() {
  storageInBG.get('feedList', function (data) {
    var feedSources = [];
    if (typeof(data) === "object" && typeof(data.length) !== "undefined") {
      feedSources = data;
    }
    for (var i = 0; i < feedSources.length; i++) {
      (function (feedInfo) {
        FeedLoader({q: feedInfo.url, num: 10}, function (data) {
          if (typeof(data) !== 'object' ||
            typeof(data.error) === 'object') {
            console.error(data.error.message);
          }
          else {
            var feed = data.feed;
            for (var j = 0; j < feed.entries.length; j++) {
              var publishedDate = new Date(feed.entries[j].publishedDate);
              feed.entries[j].publishedDateStr = publishedDate.getTime();
            }
            feed.customTitle = feedInfo.title;
            AddFeed(feed);
            if (feeds.length === feedSources.length) {
              storageInBG.set('feeds', feeds);
            }
          }
        });
      }(feedSources[i]));
    }
  });
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
  feed.setResultFormat(google.feeds.Feed.JSON_FORMAT);
  feed.load(function (data) {
    // Parse data depending on the specified response format, default is JSON.
    // console.log(data);
    if (typeof(callback) === 'function') {
      callback(data);
    }
  });
}

function AddFeed(feed) {
  for (var i = 0; i < feeds.length; i++) {
    if (feed.feedUrl === feeds[i].feedUrl) {
      feeds[i] = feed;
      return;
    }
  }
  feeds.push(feed);
}

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


