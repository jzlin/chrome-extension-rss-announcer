/**************************************************
* Class : StorageSync
**************************************************/
function StorageSync() {
	function clear(key) {
		if (key) {
			chrome.storage.sync.remove(key);
		}
		else {
			chrome.storage.sync.clear();
		}
	}
	function get(key, callback) {
		chrome.storage.sync.get(function(obj) {
			var val = typeof(obj) === 'object' ? obj[key] : undefined;
			if (typeof(callback) === 'function') {
				callback(val);
			}
		});
	}
	function set(key, value, callback) {
		chrome.storage.sync.get(function(obj) {
			if (typeof(obj) === 'undefined') {
				obj = {};
			}
			obj[key] = value;
			chrome.storage.sync.set(obj, function(newObj) {
				if (typeof(callback) === 'function') {
					callback(obj[key]);
				}
			});
		});
	}

	return {
		clear: clear,
		get: get,
		set: set
	};
}

/**************************************************
* Class : StorageLocal
**************************************************/
function StorageLocal() {
	function clear(key) {
		if (key) {
			chrome.storage.local.remove(key);
		}
		else {
			chrome.storage.local.clear();
		}
	}
	function get(key, callback) {
		chrome.storage.local.get(function(obj) {
			var val = typeof(obj) === 'object' ? obj[key] : undefined;
			if (typeof(callback) === 'function') {
				callback(val);
			}
		});
	}
	function set(key, value, callback) {
		chrome.storage.local.get(function(obj) {
			if (!obj) {
				obj = {};
			}
			obj[key] = value;
			chrome.storage.local.set(obj, function(newObj) {
				if (typeof(callback) === 'function') {
					callback(obj[key]);
				}
			});
		});
	}

	return {
		clear: clear,
		get: get,
		set: set
	};
}

/**************************************************
* Class : StorageSemiSync (半同步 : sync 與 local 結合)
* 
* 因 sync 次數有限制，故結合 local，
* 當設定觸發時，先儲存至 local，
* 一段時間 (60s) 後再儲存至 sync，
* 在這段時間內又觸發設定，
* 前一個設定的值就會被取代為新的，
* 以此達到降低 sync 設定次數。
**************************************************/
function StorageSemiSync() {
	/** --------------- Constants -------------- */
	var DEFAULT_DELAY_TIME = 1;//10 * 1000;
	var CLEAR_PREFIX = 'clear_';
	var GET_PREFIX = 'get_';
	var SET_PREFIX = 'set_';

	/** ---------------- Fields ---------------- */
	var _sync = new StorageSync();
	var _local = new StorageLocal();
	var delayFunction = {};
	var delayCallback = {};

	/** ---------------- Events ---------------- */
	chrome.alarms.onAlarm.addListener(function (alarm) {
	  if (alarm.name.indexOf(CLEAR_PREFIX) !== -1) {
	  	var key = alarm.name.substr(CLEAR_PREFIX.length);
			// console.log('%c' + key + ' had clear in sync!', 'color:red; font-weight: bold');
			_sync.clear(key);
			delayFunction[alarm.name] = undefined;
	  }
	  else if (alarm.name.indexOf(GET_PREFIX) !== -1) {
	  	var key = alarm.name.substr(GET_PREFIX.length);
			delayFunctionTemp(key, delayCallback[alarm.name]);
	  }
	  else if (alarm.name.indexOf(SET_PREFIX) !== -1) {
	  	var key = alarm.name.substr(SET_PREFIX.length);
	  	var value = JSON.parse(localStorage[alarm.name]);
			// console.log('%c' + key + ' has saving in sync!', 'color:red');
			_sync.set(key, value, function() {
				// console.log('%c' + key + ' had saved in sync!', 'color:red; font-weight: bold');
				localStorage.removeItem(alarm.name);
			});
			delayFunction[alarm.name] = undefined;
	  }
	});

	/** ---------------- Methods --------------- */
	function clear(key) {
		// STEP 1 : 儲存至 local
		// console.log('%c' + key + ' had clear in local!', 'color:red');
		_local.clear(key);
		
		// STEP 2 : 儲存至 sync
		var delayFunctionKeyClear = CLEAR_PREFIX + key;
		
		if (delayFunction[delayFunctionKeyClear])
		{
			chrome.alarms.clear(delayFunctionKeyClear);
		}

		chrome.alarms.create(delayFunctionKeyClear, {
		  delayInMinutes: DEFAULT_DELAY_TIME
		});

		delayFunction[delayFunctionKeyClear] = true;
	}
	function get(key, callback) {
		_local.get(key, function(obj)
		{
			var delegateCallback = undefined;
			// 如果 local 有資料，就先回傳。
			if (typeof(obj) === 'object')
			{
				if (typeof(callback) === 'function') {
					callback(obj);
				}
			}
			else {
				delegateCallback = callback;
			}

			// 抓取 sync 設定，更新 local 資料。
			var delayFunctionKeyGet = GET_PREFIX + key;

			delayCallback[delayFunctionKeyGet] = delegateCallback;

			if (delayFunction[delayFunctionKeyGet])
			{
				chrome.alarms.clear(delayFunctionKeyGet);
			}

			chrome.alarms.create(delayFunctionKeyGet, {
			  delayInMinutes: DEFAULT_DELAY_TIME
			});

			delayFunction[delayFunctionKeyGet] = true;
		});
	}
	function delayFunctionTemp(key, callback)
	{
		var delayFunctionKeyGet = GET_PREFIX + key;
		var delayFunctionKeySet = SET_PREFIX + key;
		// 檢查是否正在執行寫入動作，如果是，延後執行。
		if (delayFunction[delayFunctionKeySet])
		{
			if (delayFunction[delayFunctionKeyGet]) {
				chrome.alarms.clear(delayFunctionKeyGet);
			}

			chrome.alarms.create(delayFunctionKeyGet, {
			  delayInMinutes: DEFAULT_DELAY_TIME
			});

			delayFunction[delayFunctionKeyGet] = true;

			return ;
		}

		_sync.get(key, function(obj)
		{
			if (typeof(obj) === 'object')
			{
				// console.log('%c' + key + ' has updating to local from sync!', 'color:red');
				// console.log(obj);
				// 更新 local
				_local.set(key, obj, function() {
					// console.log('%c' + key + ' had updated to local from sync!', 'color:red; font-weight: bold');
				});
			}
			if (typeof(callback) === 'function') {
				callback(obj);
			}
		});
	}
	function set(key, value, callback) {
		// STEP 1 : 儲存至 local
		// console.log('%c' + key + ' had saved in local!', 'color:red');
		_local.set(key, value, callback);
		
		// STEP 2 : 儲存至 sync
		var delayFunctionKeySet = SET_PREFIX + key;

		localStorage[delayFunctionKeySet] = JSON.stringify(value);

		if (delayFunction[delayFunctionKeySet])
		{
			chrome.alarms.clear(delayFunctionKeySet);
		}

		chrome.alarms.create(delayFunctionKeySet, {
		  delayInMinutes: DEFAULT_DELAY_TIME
		});

		delayFunction[delayFunctionKeySet] = true;
	}

	return {
		clear: clear,
		get: get,
		set: set
	};
}

/**************************************************
* Init
**************************************************/
var storage = {};
storage.sync = new StorageSync();
storage.local = new StorageLocal();
storage.semiSync = new StorageSemiSync();







