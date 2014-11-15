(function () {

  function Announcer(config) {

    var _this = this;
    _this.MAX_LEN = 70;
    _this._sentenceQueueName = 'sentenceQueueName';
    _this._articleQueueName = 'articleQueueName';
    _this._currentSpeakArticleName = 'currentSpeakArticle';
    _this._config = {
      rate: 1,
      pitch: 1,
      volume: 1,
      voice: {
        voiceName: 'Mei-Jia',
        gender: 'female',
        lang: 'zh-TW',
        remote: false,
        eventTypes: [
          'start',
          'end',
          'word',
          'interrupted',
          'cancelled',
          'error',
          'pause',
          'resume'
        ]
      }
    };

    _this.GetField = function (name) {
      var value = localStorage[name];
      if (typeof(value) !== 'undefined') {
        value = JSON.parse(value);
      }
      return value;
    };

    _this.SetField = function (name, value) {
      localStorage[name] = JSON.stringify(value);
    };

    // initial field
    (function () {
      var sentenceQueue = _this.GetField(_this._sentenceQueueName) || [];
      var articleQueue = _this.GetField(_this._articleQueueName) || [];
      var currentSpeakArticle = _this.GetField(_this._currentSpeakArticleName) || {};

      _this.SetField(_this._sentenceQueueName, sentenceQueue);
      _this.SetField(_this._articleQueueName, articleQueue);
      _this.SetField(_this._currentSpeakArticleName, currentSpeakArticle);
    }());

    _this.GetSentences = function (content) {
      if (typeof(content) === 'undefined' || typeof(content.substr) !== 'function') {
        return [];
      }
      var spliters = content.match(/[ \⋯\·\．\，\。\！\？\：\；\,\;\n\.\!\?\:]/g);
      var sentences = [];
      while (content.length > 0) {
        var sentence;
        var spliter = (spliters != null && spliters.length > 0) ? spliters[0] : undefined;
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
          if (sentence.length <= _this.MAX_LEN) {
            doAppend = doAppend && 
              sentences.length > 0 &&
              (sentences[sentences.length - 1].length + sentence.length) <= _this.MAX_LEN;
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
              if (sentence.length > _this.MAX_LEN) {
                subSentence = sentence.slice(0, _this.MAX_LEN);
                sentence = sentence.substr(_this.MAX_LEN);
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
    };

    _this.SpeakSentences = function (sentences, toLog, customOptions) {
      if (typeof(sentences) === 'undefined' || 
        sentences.length === 0) {
        return;
      }
      for (var i = 0; i < sentences.length; i++) {
        var sentence = sentences[i].trim();
        if (sentence !== '') {
          _this.SpeakText(sentence, toLog, customOptions);
        }
      }
    };

    _this.SpeakText = function (text, toLog, customOptions) {
      if (typeof(text) === 'undefined' ||
        text.trim().length === 0) {
        return;
      }
      if (text.length > _this.MAX_LEN) {
        _this.SpeakText(text.slice(0, _this.MAX_LEN), toLog);
        _this.SpeakText(text.substr(_this.MAX_LEN), toLog);
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
        options = _this.GetSpeakOptions();
      }
      chrome.tts.speak(text, options, function() {
        if (chrome.runtime.lastError) {
          console.log('Error：' + chrome.runtime.lastError.message);
        }
      });
    };

    _this.GetSpeakOptions = function () {
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
          if (event.type === 'start') {
            // 朗讀剛開始
          }
          else if (event.type === 'word') {
            // 遇到詞語邊界
          }
          else if (event.type === 'sentence') {
            // 遇到句子邊界
          }
          else if (event.type === 'marker') {
            // 遇到 SSML 標記元素
          }
          else if (event.type === 'end') {
            // 朗讀完成
            _this.ContinueSpeak();
          }
          else if (event.type === 'interrupted') {
            // 朗讀停止或在達到結尾前中斷
          }
          else if (event.type === 'cancelled') {
            // 朗讀在合成前就從隊列中移除
          }
          else if (event.type === 'error') {
            // 發生錯誤
            console.log('錯誤：' + event.errorMessage);
          }
        }
      };

      return options;
    };

    _this.SpeakIntroduction = function (article) {
  
      var introduction = (typeof(article.author) !== 'undefined' && 
        article.author.length > 0) ? 
        chrome.i18n.getMessage('ttsIntroductionWithAuthor', [article.author, article.title]) : 
        chrome.i18n.getMessage('ttsIntroduction', article.title);
      
      var noContentMessage = (typeof(article.author) !== 'undefined' && 
        article.author.length > 0) ? 
        chrome.i18n.getMessage('ttsReadFailWithAuthor', [article.author, article.title]) : 
        chrome.i18n.getMessage('ttsReadFail', article.title);

      var localOptions = {
        lang: chrome.i18n.getUILanguage(), 
        enqueue: true,
        onEvent: function (event) {
          if (event.type === 'end') {
            // 朗讀完成
            _this.ContinueSpeak();
          }
        }
      };
      var haveContent = typeof(article.content) !== 'undefined' && 
                       article.content.trim().length > 0;
      if (haveContent) {
        // 文章結束後的休息時間
        for (var j = 0; j < 5; j++) {
          _this.SpeakText('');
        }
        _this.SpeakText(introduction, true, localOptions);
      }
      else {
        _this.SpeakText(noContentMessage, true, localOptions);
      }
    };

    _this.ContinueSpeak = function () {
      chrome.tts.isSpeaking(function (speaking) {
        var sentenceQueue = _this.GetField(_this._sentenceQueueName);
        var articleQueue = _this.GetField(_this._articleQueueName);
        var currentSpeakArticle = _this.GetField(_this._currentSpeakArticleName);
        if (!speaking) {
          if (sentenceQueue.length > 0) {
            var sentence = sentenceQueue.shift();
            _this.SpeakText(sentence, false, currentSpeakArticle.customOptions);
          }
          else if (articleQueue.length > 0) {
            currentSpeakArticle = articleQueue.shift();
            sentenceQueue = _this.GetSentences(currentSpeakArticle.content);
            _this.SpeakIntroduction(currentSpeakArticle);
            // _this.ContinueSpeak();
          }
          _this.SetField(_this._sentenceQueueName, sentenceQueue);
          _this.SetField(_this._articleQueueName, articleQueue);
          _this.SetField(_this._currentSpeakArticleName, currentSpeakArticle);
        }
      });
    };

    _this.StopAllArticle = function () {
      _this.SetField(_this._articleQueueName, []);
      _this.SetField(_this._sentenceQueueName, []);
      chrome.tts.stop();
    };

    _this.StopCurrentArticle = function () {
      _this.SetField(_this._sentenceQueueName, []);
      chrome.tts.stop();
      _this.ContinueSpeak();
    };

    _this.Pause = function () {
      chrome.tts.pause();
      chrome.tts.isSpeaking(function (speaking) {
        if (speaking) {
          chrome.tts.stop();
        }
      });
    };

    _this.Resume = function () {
      chrome.tts.resume();
      _this.ContinueSpeak();
    };

    _this.SpeakArticle = function (article, playNow) {
      if (typeof(article) !== 'object' || 
        typeof(article.title) === 'undefined' || 
        article.title.length === 0) {
        return;
      }

      article.id = Date.now();

      var articleQueue = _this.GetField(_this._articleQueueName);
      if (typeof(playNow) === 'boolean' && playNow === true) {
        articleQueue.unshift(article);
        _this.StopCurrentArticle();
      }
      else {
        articleQueue.push(article);
      }
      _this.SetField(_this._articleQueueName, articleQueue);

      _this.ContinueSpeak();

      return article.id;
    };

    return {
      SpeakArticle: _this.SpeakArticle,
      StopCurrentArticle: _this.StopCurrentArticle,
      StopAllArticle: _this.StopAllArticle,
      Pause: _this.Pause,
      Resume: _this.Resume
    };

  }

  window.announcer = new Announcer();

}());