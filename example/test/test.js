(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.slice");

require("core-js/modules/es.object.to-string");

require("core-js/modules/es.regexp.to-string");

/**
 * テストやデバッグで便利なようにDateの表記を見やすいように変更しています
 * lib内では使用していません
 *
 * console.logやassertのエラー出力の場合に以下の表記がされるようになります
 *
 * 基本形 Y-M-D H:II:SS.sss
 * 時以下が0時0分0.0秒の場合は Y-M-D
 * 秒が0.0秒の場合は Y-M-D H:II
 * ミリ秒が0の場合は Y-M-D H:II:SS
 */
Date.prototype.toString = function () {
  var v = this;
  var date = v.getFullYear() + '-' + (v.getMonth() + 1) + '-' + v.getDate();
  var h = v.getHours();
  var i = v.getMinutes();
  var s = v.getSeconds();
  var ms = v.getMilliseconds();
  ms = ms ? '.' + ('00' + ms).slice(-3) : '';
  s = s || ms ? ':' + ('0' + s).slice(-2) : '';
  var time = h || i || s || ms ? ' ' + h + ':' + ('0' + i).slice(-2) + s + ms : '';
  return date + time;
};
/**
 * 月の数字をインデックスではなくそのまま月にしたnew Dateの代替え
 * @param  {Number} y
 * @param  {Number} m
 * @param  {Number} d
 * @param  {Number} h
 * @param  {Number} i
 * @param  {Number} s
 * @param  {Number} ms
 * @return {Date}
 */


module.exports = function make(y, m, d, h, i, s, ms) {
  return new Date(y, m ? m - 1 : 0, d || 1, h || 0, i || 0, s || 0, ms || 0);
};

},{"core-js/modules/es.array.slice":131,"core-js/modules/es.object.to-string":136,"core-js/modules/es.regexp.to-string":138}],2:[function(require,module,exports){
"use strict";

require("core-js/modules/es.object.keys");

require("core-js/modules/es.string.match");

require("core-js/modules/web.dom-collections.for-each");

/**
 * *********************************************************
 *                       営業日計算
 * *********************************************************
 */
module.exports = {
  addBiz: addBiz,
  biz: biz,
  passBiz: passBiz,
  remainBiz: remainBiz,
  resetBizCache: resetBizCache
};
/**
 * dependencies
 */

var TERM = require('./config').TERM;

var countBiz = require('./utils/countBiz');

var suji = require('./utils/suji');

var YYYYMM = /^(\d{1,4})[-\/\.年]?(?:(\d{1,2})月?)?$/;
/**
 * alias
 */

var A_DAY = 86400000;
var MAX = 365; //調査最大日数

var countFromTo = countBiz.countFromTo;
var countTerm = countBiz.countTerm;
/**
 * 営業日の算出
 *
 * 適用事例:納品日を表示したい等
 *
 * 営業日を計算します
 * 時間部分の値は変化しません
 * 一年先(前)に見つからなかった場合はnullを返します
 *
 * 営業日のルールは以下のとおり
 *
 * 加算する日数に1以上の場合は、翌営業日からカウントして算出します
 * 加算する日数が0の場合は、dataが営業日であればdateを、そうでない場合は翌営業日を返します
 * 加算する日数が-1以下の場合は、さかのぼって算出します
 *
 * その際includeがtrueの場合、dateもカウントの対象に含みます
 * 加算する日数が0の場合はincludeは無視されます
 *
 * @method addBiz
 * @param  {DATE}     date
 * @param  {Number}   days     加算する日数
 * @param  {Boolean}  include  初日を含む
 */

function addBiz(date, days, include) {
  date = this.toDate(date);

  if (!date) {
    return null;
  }

  var time = days < 0 ? -A_DAY : A_DAY;
  var countDown = days < 0 ? -1 : 1; // 0の場合の補正  +1営業日で前日からにすると同じ

  if (days === 0) {
    days = 1;
    date.setTime(date - A_DAY);
  }

  if (include && this.isOpen(date)) {
    days -= countDown;
  } // 最大調査日数


  var max = MAX; // 以下営業日の計算

  while (days) {
    date.setTime(+date + time);

    if (this.isOpen(date)) {
      days -= countDown;
    }

    if (--max < 0) {
      return null;
    }
  }

  return date;
}
/**
 * 営業日数を返します
 *
 * 第二引数に指定した値で３つの動作を切り替えます
 *
 * 指定しなかった場合
 *     第一引数に、2015年や2015-3などの年度もしくは年度+月を指定して
 *     その期間の営業日数を返します
 *
 * 日時を指定した場合
 *     二つの日付の間の営業日数を返します
 *
 * 期間('year', 'month'等)を指定した場合
 *     第一引数が含まれる期間の開始日から終了日の営業日数を返す
 *
 * @method biz
 * @param  {DATE/DATE}   from/date/yyyymm
 * @param  {DATE/String} to  /term/-
 * @return {Number}      days
 */


function biz(val1, val2) {
  if (val2) {
    var term = TERM[val2];
    return term ? countTerm(this, val1, term) : countFromTo(this, val1, val2);
  } else if (typeof val1 === 'number') {
    return countTerm(this, new Date(val1, this.startMonth - 1, 1), 'y');
  } else if (typeof val1 === 'string') {
    val1 = suji(val1);
    var matches = val1.match(YYYYMM);

    if (!matches) {
      return null;
    } else if (matches[2]) {
      return countTerm(this, new Date(+matches[1], +matches[2] - 1, 1), 'm');
    } else {
      return countTerm(this, new Date(+matches[1], this.startMonth - 1, 1), 'y');
    }
  } else {
    return null;
  }
}
/**
 * 指定した日が含まれる期間の開始から経過した営業日数
 * @method passBiz
 * @param  {DATE}   date
 * @param  {String} term
 * @return {Number} days
 */


function passBiz(date, term) {
  date = this.toDate(date);

  if (!date) {
    return null;
  }

  var from = this.toDate(this.from(date, term));
  return from ? countFromTo(this, from, date) : null;
}
/**
 * 指定した日が含まれる期間の残りの営業日数
 * @method remainBiz
 * @param  {DATE}   date
 * @return {Number} date
 */


function remainBiz(date, term) {
  date = this.toDate(date);

  if (!date) {
    return null;
  }

  var to = this.toDate(this.to(date, term));
  return to ? countFromTo(this, date, to) : null;
}
/**
 * キャッシュを削除
 * (ドキュメントには記載されていません)
 * @method resetBizCache
 * @param  {DATE/String} date/'year'
 * @return {Boolean}     success
 */


function resetBizCache(date) {
  // 全キャッシュ削除
  if (!date) {
    this.bizCache = {};
    return true;
  }

  var cache = this.bizCache; // 年度キャッシュを全削除

  if (date === 'year') {
    Object.keys(cache).forEach(function (x) {
      if (x.indexOf('-') === -1) {
        delete cache[x];
      }
    });
    return true;
  }

  date = this.toDate(date);

  if (!date) {
    return false;
  } // 個別の日が含まれるキャッシュを削除


  var year = date.getFullYear();
  var month = date.getMonth() + 1; // 月キャッシュの削除

  delete cache[year + '-' + month]; // 年度キャッシュの削除

  if (month < this.startMonth) {
    delete cache[year - 1];
  } else {
    delete cache[year];
  }

  return true;
}

},{"./config":5,"./utils/countBiz":16,"./utils/suji":28,"core-js/modules/es.object.keys":135,"core-js/modules/es.string.match":140,"core-js/modules/web.dom-collections.for-each":147}],3:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.slice");

require("core-js/modules/es.string.match");

require("core-js/modules/es.string.replace");

/**
 * *********************************************************
 *                       日時の計算
 * *********************************************************
 */
module.exports = {
  add: add,
  isLeap: isLeap,
  getRange: getRange,
  from: from,
  to: to,
  diff: diff,
  days: days,
  passDays: passDays,
  remainDays: remainDays,
  separate: separate,
  getAge: getAge,
  kind: kind
};
/**
 * dependencies
 */

var CONFIG = require('./config');

var separateFn = require('./utils/separate');

var addTerm = require('./utils/addTerm');

var suji = require('./utils/suji');
/*eslint no-irregular-whitespace:0*/

/**
 * alias
 */


var A_WEEK = 604800000;
var A_DAY = 86400000;
var A_HOUR = 3600000;
var A_MINUTE = 60000;
var A_SECOND = 1000;
var REG_ADD = /[ 　,、]/g;
var REG_ADD2 = /([-+]?\d+)([^-+0-9]+)?/ig;
var YYYYMM = /^(\d{1,4})[-\/\.年](?:(\d{1,2})月?)?$/;
var TERM = CONFIG.TERM;
var MARGIN = CONFIG.KIND_MARGIN;
var POINTS = [[60, '分'], [3600, '時間'], [86400, '日'], [2629800, 'ヶ月'], // 86400 * 365.25 / 12
[31557600, '年'] // 86400 * 365.25
];
POINTS.forEach(function (p) {
  return p.push(p[0] - p[0] * MARGIN);
});
/**
 * 日時の計算
 *
 *  加算(減算)することができる単位は、年、ケ月、週、日、時間、分、秒です
 *  各単位で使用できる記述は定数TANIで確認してください
 *
 * 年・月のみ指定して、日以下を指定しない場合、次のルールを適用します
 *
 * 民法第143条 暦による期間の計算
 * 週、月又は年の初めから期間を起算しないときは、その期間は、最後の週、月又は年において
 * その起算日に応当する日の前日に満了する。ただし、月又は年によって期間を定めた場合にお
 * いて、最後の月に応当する日がないときは、その月の末日に満了する。
 *
 * @method add
 * @param  {DATE}   date
 * @param  {String} value
 * @return {Date}   date
 */

function add(date, value) {
  date = this.toDatetime(date);

  if (!date) {
    return null;
  }

  value = suji(value);
  var chr = value.slice(-1);
  var sign = 1;

  if (chr === '前') {
    sign = -1;
    value = value.slice(0, value.length - 1);
  } else if (chr === '後') {
    value = value.slice(0, value.length - 1);
  }

  var val = {};
  var replaced = value.replace(REG_ADD, '').replace(REG_ADD2, function (m, v, t) {
    var term = TERM[t.toLowerCase()];

    if (term === 'w') {
      val.d = v * sign * 7 + (val.d || 0);
      return '';
    } else if (term) {
      val[term] = v * sign + (val[term] || 0);
      return '';
    } else {
      return m;
    }
  }); // 処理できない単位あり

  if (replaced.length) {
    return null;
  }

  return addTerm(date, val);
}
/**
 * うるう年判定
 * 数字を指定した場合は年をそれ以外は年度内の日付を指定したとします
 * @method isLeap
 * @param  {Number/DATE}  year/date
 * @return {Boolean}      isLeap
 */


function isLeap(date) {
  var year;

  if (typeof date === 'number') {
    year = date;
  } else {
    date = this.toDate(date);
    year = date.getFullYear();
  }

  return new Date(year, 1, 29).getDate() === 29;
}
/**
 * 指定した単位の範囲で最初と最後の日時を返します
 * yyyymmは2015、2015-1、2015年、2015年10月の形式で指定します
 * 年のみを指定した場合はtermはy、月まで指定した場合はtermはmが既定値になります
 *
 * @method getRange
 * @param  {String|DATE} yyyymm|date   既定値:現在の日時
 * @param  {String}      term          既定値:yyyymm時はyまたはm, それ以外はd
 * @return {Object}      fromTo
 */


function getRange(date, term) {
  var matches;

  if (!term && typeof date === 'number') {
    term = ('' + date).length < 5 ? 'y' : 'm';
    date = this.toDate(date);
  } else if (!term && typeof date === 'string' && (matches = date.match(YYYYMM))) {
    if (matches[2]) {
      term = 'm';
      date = new Date(+matches[1], matches[2] - 1, 1);
    } else {
      term = 'y';
      date = new Date(+matches[1], this.startMonth - 1, 1);
    }
  } else {
    date = date ? this.toDatetime(date) : new Date();

    if (!date) {
      return null;
    }
  }

  term = (term || 'd').toLowerCase();
  var from, to;
  var sm = this.startMonth;
  var sw = this._startWeek;
  var y = date.getFullYear();
  var m = date.getMonth();
  var d = date.getDate();
  var h = date.getHours();
  var i = date.getMinutes();
  var s = date.getSeconds();
  var w = date.getDay();

  switch (TERM[term]) {
    case 'y':
      var mx = (m - (sm - 1) + 12) % 12; // 年始めの月との差

      from = new Date(y, m - mx, 1, 0, 0, 0, 0);
      to = new Date(y + 1, m - mx, 0, 23, 59, 59, 999);
      break;

    case 'm':
      from = new Date(y, m, 1, 0, 0, 0, 0);
      to = new Date(y, m + 1, 0, 23, 59, 59, 999);
      break;

    case 'w':
      var dx = (w - sw + 7) % 7; // 週初めとの日差

      from = new Date(y, m, d - dx, 0, 0, 0, 0);
      to = new Date(y, m, d - dx + 6, 23, 59, 59, 999);
      break;

    case 'd':
      from = new Date(y, m, d, 0, 0, 0, 0);
      to = new Date(y, m, d, 23, 59, 59, 999);
      break;

    case 'h':
      from = new Date(y, m, d, h, 0, 0, 0);
      to = new Date(y, m, d, h, 59, 59, 999);
      break;

    case 'i':
      from = new Date(y, m, d, h, i, 0, 0);
      to = new Date(y, m, d, h, i, 59, 999);
      break;

    case 's':
      from = new Date(y, m, d, h, i, s, 0);
      to = new Date(y, m, d, h, i, s, 999);
      break;

    case 'ms':
      from = new Date(date.getTime());
      to = new Date(date.getTime());
      break;

    default:
      return null;
  }

  return {
    from: from,
    to: to
  };
}
/**
 * 指定した単位の範囲で最初の日時を返します
 * @method from
 * @param  {DATE}   date
 * @param  {String} term
 * @return {Date}   date
 */


function from(date, term) {
  if (!term) {
    return null;
  }

  var se = this.getRange(date, term);
  return se ? se.from : null;
}
/**
 * 指定した単位の範囲で最後の日時を返します
 * @method to
 * @param  {DATE} date
 * @param  {String}      term
 * @return {Date}        date
 */


function to(date, term) {
  if (!term) {
    return null;
  }

  var se = this.getRange(date, term);
  return se ? se.to : null;
}
/**
 * 二つの日時の指定した単位での差を返す
 * 年・月・週・日は時以降を切り捨てて計算します
 *
 * ひと年は、同じ日にちを超えるごとに一ヶ年とします
 * そのため、単純に365日経過したら一ヶ年ではありません
 *
 * ひと月は、日の部分が超えるごとに一ヶ月とします
 * そのため、単純に30や31日経過したら一ヶ月ではありません
 *
 * @param  {DATE}   from
 * @param  {DATE}   to
 * @param  {String} term 既定値:day
 * @return {Number}
 */


function diff(from, to, term) {
  term = (term || 'day').toLowerCase();
  var t, f;

  switch (TERM[term]) {
    case 'y':
      return this.getAge(from, to);

    case 'm':
      f = this.toDate(from);
      t = this.toDate(to);

      if (!(f && t)) {
        return null;
      }

      return (t.getFullYear() - f.getFullYear()) * 12 + t.getMonth() - f.getMonth() - (t.getDate() < f.getDate() ? 0 : 1);

    case 'w':
      f = this.toDate(from);
      t = this.toDate(to);
      return f && t ? parseInt((t - f) / A_WEEK, 10) : null;

    case 'd':
      f = this.toDate(from);
      t = this.toDate(to);
      return f && t ? (t - f) / A_DAY : null;

    case 'h':
      f = this.toDatetime(from);
      t = this.toDatetime(to);
      return f && t ? parseInt((t - f) / A_HOUR, 10) : null;

    case 'i':
      f = this.toDatetime(from);
      t = this.toDatetime(to);
      return f && t ? parseInt((t - f) / A_MINUTE, 10) : null;

    case 's':
      f = this.toDatetime(from);
      t = this.toDatetime(to);
      return f && t ? parseInt((t - f) / A_SECOND, 10) : null;

    case 'ms':
      f = this.toDatetime(from);
      t = this.toDatetime(to);
      return f && t ? t - f : null;

    default:
      return null;
  }
}
/**
 * 指定した期間の日数を返します
 *
 * 第二引数に指定した値で３つの動作を切り替えます
 *
 * 指定しなかった場合
 *     第一引数に、2015年や2015-3などの年度もしくは年度+月を指定して
 *     その期間の日数を返します
 *     年だけを指定すると年度の期間を計算します
 *     年を指定する場合は二つの引数をきちんと指定してください
 *
 * 日時を指定した場合
 *     二つの日付の間の日数を返します
 *
 * 期間('year', 'month'等)を指定した場合
 *     第一引数が含まれる期間の開始日から終了日の日数を返す
 *
 * @method days
 * @param  {DATE/DATE/String|Number} from/date/yyyymm
 * @param  {DATE/String/-|-}         to  /term/-
 * @return {Number}      days
 */


function days(val1, val2) {
  if (val2) {
    var term = TERM[val2.toLowerCase()];

    if (term) {
      var range = this.getRange(val1, term);
      return range ? this.diff(range.from, range.to, 'd') + 1 : null;
    } else {
      var days = this.diff(val1, val2, 'd');
      return typeof days === 'number' && 0 <= days ? days + 1 : null;
    }
  } else if (typeof val1 === 'number') {
    return this.days(val1, ('' + val1).length < 5 ? 'y' : 'm');
  } else if (typeof val1 === 'string') {
    var matches = val1.match(YYYYMM);

    if (matches) {
      if (matches[2]) {
        return this.days(matches[1] + '-' + matches[2], 'm');
      } else {
        return this.days(matches[1], 'y');
      }
    }
  }

  return null;
}
/**
 * 指定した期間の経過日数を返します
 * @method passDays
 * @param  {DATE}   date
 * @param  {String} term
 * @return {Number} days
 */


function passDays(date, term) {
  var from = this.from(date, term);
  return from ? this.diff(from, date, 'd') + 1 : null;
}
/**
 * 指定した期間の残日数
 * @method remainDays
 * @param  {DATE}   date
 * @param  {String} term  既定値: day
 * @return {Number} days
 */


function remainDays(date, term) {
  var to = this.to(date, term);
  return to ? this.diff(date, to, 'd') + 1 : null;
}
/**
 * 期間をブロックごとに分割(年度、月、日)します
 *
 * @method separate
 * @param  {DATE}   from
 * @param  {DATE}   to
 * @return {Object} {
 *                    days   : [days1..., days2...],
 *                    months : [months1..., months2...],
 *                    years  : [years...]
 *                  }
 */


function separate(from, to) {
  from = this.toDate(from);
  to = this.toDate(to);

  if (!from || !to) {
    return null;
  }

  return separateFn(from, to, this.startMonth);
}
/**
 * 年齢を返します
 * @method getAge
 * @param  {DATE} birthday
 * @param  {DATE} when
 * @return {Number}      age
 */


function getAge(birthday, when) {
  birthday = this.toDate(birthday);
  when = this.toDate(when || new Date());
  var b = new Date(birthday).setFullYear(2000);
  var w = new Date(when).setFullYear(2000);
  return when.getFullYear() - birthday.getFullYear() - (w >= b ? 0 : 1);
}
/**
 * 人間が理解しやすい口語表記にする
 * @method kind
 * @param  {DATE}   date
 * @param  {DATE}   compareTo
 * @return {String}
 */


function kind(date, compareTo) {
  date = this.toDatetime(date);
  compareTo = compareTo ? this.toDatetime(compareTo) : new Date();

  if (!date || !compareTo) {
    return '';
  }

  var diff = (compareTo - date) / 1000;
  var surfix = 0 < diff ? '前' : '後';
  diff = Math.abs(diff);
  var i = POINTS.length - 1;
  var point;

  for (point = null; point = POINTS[i]; i--) {
    if (point[2] <= diff) {
      var x = parseInt(diff / point[0], 10) + (point[2] <= diff % point[0] ? 1 : 0);
      return x + point[1] + surfix;
    }
  }

  return 'たった今';
}

},{"./config":5,"./utils/addTerm":12,"./utils/separate":27,"./utils/suji":28,"core-js/modules/es.array.slice":131,"core-js/modules/es.string.match":140,"core-js/modules/es.string.replace":141}],4:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.map");

require("core-js/modules/es.array.slice");

require("core-js/modules/es.array.splice");

require("core-js/modules/es.string.match");

require("core-js/modules/es.string.split");

/**
 * dependencies
 */
var getWeekIndex = require('./utils/getWeekIndex');

var getDayInfo = require('./utils/getDayInfo');

var formatArray = require('./utils/formatArray');
/**
 * alias
 */


var A_DAY = 86400000;
var REG_RANGE = /^(\d{1,4})\D+(\d{1,2})(?:\D+(\d{1,4})\D+(\d{1,2}))?$/;
var DATE_INFO = 'Y,M,D,w,e,F'.split(',').map(function (x) {
  return {
    p: x
  };
});
/**
 * *********************************************************
 *              イベント・カレンダーデータ
 * *********************************************************
 *
 * カレンダーを簡単に作成するためのデータを取得できます
 * UI部分は持ちませんので別途作成してください
 * また、日毎にイベントデータを追加することもできます
 */

module.exports = {
  getEvents: getEvents,
  addEvent: addEvent,
  removeEvent: removeEvent,
  getCalendarData: getCalendarData
};
/**
 * イベントを取得
 * @method getEvents
 * @param  {DATE}  date
 * @return {Array} events
 */

function getEvents(date) {
  date = this.toDate(date);

  if (!date) {
    return null;
  }

  var info = getDayInfo(this.dayInfo, date);
  return info ? info.events : [];
}
/**
 * イベントを設定
 * @method addEvent
 * @param  {DATE} date
 * @param  {Array}       value
 * @return {Number}      index
 */


function addEvent(date, value) {
  date = this.toDate(date);

  if (!date) {
    return null;
  }

  var info = getDayInfo(this.dayInfo, date, true);

  if (!info) {
    return null;
  }

  var events = info.events;
  events.push(value);
  return events.length - 1;
}
/**
 * イベントを削除
 * @method removeEvent
 * @param  {DATE} date
 * @param  {Number}      index    省略時にすべてのイベント削除
 * @return {Boolean}     removed
 */


function removeEvent(date, index) {
  date = this.toDate(date);

  if (!date) {
    return false;
  }

  var info = getDayInfo(this.dayInfo, date);

  if (!info) {
    return false;
  }

  var events = info.events;

  if (arguments.length === 1) {
    events.splice(0, events.length);
    return true;
  }

  if (events.length <= index) {
    return false;
  }

  events.splice(index, 1);
  return true;
}
/**
* カレンダーデータ
*
* カレンダーを作成しやすい元データを提供します
* ゴースト日が自動的に追加されます
*
* ゴースト日とは、
*   1日以前を日を週のはじめまで埋めるための日データと
*   末日以後の日を週の終わりまで埋めるための日データを表します
*   カレンダーでは通常、薄いグレーなど影を薄くするため造語として
*   ゴースト日と命名しました
*
* dataの各要素のプロパティ
*   som       : 月のはじめ (start of month)
*   eom       : 月の終わり (end of month)
*   year      : 年
*   month     : 月
*   day       : 日
*   week      : 曜日 0:日->6:土
*   open      : 営業日ならtrue
*   close     : 休業理由(祝日、休業日、定休日) 休業でないなら空文字
*   holiday   : 祝日名、祝日ではない場合は空文字
*   events    : イベント
*   sow       : 週のはじめ (start of week)
*   eow       : 週の終わり (end of week)
*   ghost     : ゴースト日はtrue
*   block     : 月ブロックのキー '2015/01'
*   weekNumber: 週番号
*
* @method getCalendarData
* @param  { Date    range     期間
*          |Number               new Date(), 2015, '2015/4', '2015/4-2016/3'
*          |String}              Dateオブジェクトの場合は含まれる月
*                                数字の場合は指定年
*                                文字列の場合は'Y/M'の場合は1か月分
*                                'Y/M-Y/M'の場合は範囲
*                                既定値 プロパティの`startMonth`に設定された
*                                       月から、本日が含まれる年度の期間
* @return {Array}   data
*/


function getCalendarData(range) {
  range = getRange(this, range);
  var days = this.dayInfo;
  var year = range.year;
  var month = range.month;
  var endYear = range.endYear;
  var endMonth = range.endMonth; // 週のはじめと終わりのインデックス

  var sw = getWeekIndex(this.startWeek);
  var ew = sw === 0 ? 6 : sw - 1; // 戻り値

  var data = [];
  var weekNumber = 1;
  var weekNumberPlus; // 月データ処理のループ

  while (year * 100 + month <= endYear * 100 + endMonth) {
    // 月データの範囲   day: 開始日, endDay: 終了日
    var beginDay = new Date(year, month - 1, 1);
    var week = beginDay.getDay();
    var day = new Date(year, month - 1, sw - week - (sw <= week ? -1 : 6));
    var endDay = new Date(year, month, 0);
    endDay = new Date(day.getTime() + A_DAY * 41);
    var som = true;
    weekNumberPlus = 0; // 日データ処理のループ

    while (true) {
      var r = formatArray(this, day, DATE_INFO); // Y,M,D,w,e,F

      var item = {
        som: som,
        // whileに入った直後だけtrue
        eom: false,
        // whileを抜ける直前だけtrue
        year: r[0],
        month: r[1],
        day: r[2],
        week: r[3],
        open: !r[4],
        close: r[4],
        holiday: r[5]
      };
      item.sow = sw === item.week;
      item.eow = ew === item.week;
      som = false;
      var info = getDayInfo(days, day);
      item.events = info ? info.events : [];
      item.ghost = item.month !== month;
      item.block = year + '/' + ('0' + month).slice(-2);

      if (item.sow) {
        if (!item.ghost) {
          weekNumber++;
        } else if (!item.som) {
          weekNumberPlus++;
        }
      }

      item.weekNumber = weekNumber + weekNumberPlus;
      data.push(item);

      if (day.getTime() === endDay.getTime()) {
        item.eom = true;
        break;
      }

      day.setTime(day.getTime() + A_DAY);
    }

    month = 12 <= month ? 1 : month + 1;
    year = month === 1 ? year + 1 : year;
  }

  return data;
}
/**
 * rangeに次のものを指定した場合に範囲は次の通り
 *
 *  未指定
 *    本日の会計年度の開始から終了
 *
 *  Dateオブジェクト
 *    その日を含む月
 *
 *  1から4桁の数字(文字列でも可)
 *    年を指定したとして年度の開始から終了まで
 *
 *  文字列
 *    Y/M-Y/Mの形式で範囲を指定します
 *
 *
 *
 *
 * @param  {Object}             koyomi
 * @param  {Date|Number|String} range
 * @return {Object}             range
 */


function getRange(koyomi, range) {
  if (!range) {
    return dateToFyRange(koyomi);
  } // その日を含む月


  if (range instanceof Date) {
    return {
      year: range.getFullYear(),
      month: range.getMonth() + 1,
      endYear: range.getFullYear(),
      endMonth: range.getMonth() + 1
    };
  } // 年度指定


  if (typeof range === 'number' || /^\d{1,4}$/.test(range)) {
    return dateToFyRange(koyomi, range + '-' + koyomi.startMonth + '-1');
  } // Y/M-Y/Mの形式


  if (typeof range === 'string') {
    var m = range.match(REG_RANGE);

    if (m) {
      return {
        year: +m[1],
        month: +m[2],
        endYear: +m[3] || +m[1],
        endMonth: +m[4] || +m[2]
      };
    }
  } // 既定値


  return dateToFyRange(koyomi);
}
/**
 *
 * @param  {Object} koyomi
 * @param  {String} date
 * @return {Object} range
 */


function dateToFyRange(koyomi, date) {
  // 既定値 年度を取得
  var fy = koyomi.getRange(date || new Date(), 'y');
  var year = fy.from.getFullYear();
  var month = fy.from.getMonth() + 1;
  var endYear = fy.to.getFullYear();
  var endMonth = fy.to.getMonth() + 1;
  return {
    year: year,
    month: month,
    endYear: endYear,
    endMonth: endMonth
  };
}

},{"./utils/formatArray":17,"./utils/getDayInfo":19,"./utils/getWeekIndex":22,"core-js/modules/es.array.map":130,"core-js/modules/es.array.slice":131,"core-js/modules/es.array.splice":132,"core-js/modules/es.string.match":140,"core-js/modules/es.string.split":142}],5:[function(require,module,exports){
"use strict";

require("core-js/modules/es.string.split");

require("core-js/modules/es.string.trim");

require("core-js/modules/web.dom-collections.for-each");

/**
 * *********************************************************
 *                       既定値設定
 * *********************************************************
 */

/**
 * 既定フォーマット
 * @property {String}
 */
var FORMAT = 'YYYY-MM-DD HH:II:SS';
/**
 * 定休日
 *   複数設定する場合はカンマ区切り
 * @property {String|Function}
 */

var REGULAR_HOLIDAY = '土,日';
/**
 * 年末年始・お盆等の休業日
 *   複数設定する場合はカンマ区切り
 * @property {String|Function}
 */

var SEASON_HOLIDAY = '年末年始のお休み 12/29-1/3';
/**
 * 祝日営業を行う場合はtrue
 * @property {Boolean}
 */

var OPEN_ON_HOLIDAY = false;
/**
 * 年度の始まり
 * @property {Number}
 */

var START_MONTH = 1;
/**
 * 週の始まり
 * @property {Number}
 */

var START_WEEK = '日';
/**
 * 口語表現のマージン
 *   (kindメソッドとパラメータKで使用する)
 *   余り時間を按分させる割合
 *   0.1(10%)であれば54秒経過は1分後と、53秒後はたった今と表示する
 * @property {Number}
 */

var KIND_MARGIN = 0.1;
/**
 * 年号
 *  N: 年号の正式表記
 *  n: 年号の略式表記
 *  y: その年号の最初の年 (元年)
 *  d: その年号の最初の日
 */

var ERAS = [{
  N: '令和',
  n: 'R',
  y: 2019,
  d: new Date('2019-05-01T00:00:00.000Z')
}, {
  N: '平成',
  n: 'H',
  y: 1989,
  d: new Date('1989-01-08T00:00:00.000Z')
}, {
  N: '昭和',
  n: 'S',
  y: 1926,
  d: new Date('1926-12-25T00:00:00.000Z')
}, {
  N: '大正',
  n: 'T',
  y: 1912,
  d: new Date('1912-07-30T00:00:00.000Z')
}, {
  N: '明治',
  n: 'M',
  y: 1868,
  d: new Date('1868-01-25T00:00:00.000Z')
}, {
  N: '西暦',
  n: '',
  y: 1,
  d: new Date(-62135629200000) // '0001-1-1 00:00:00.000'

}];
/**
 * 祝日法施行以降(1948/7/20-)の祝日を定義する
 * 改正があった場合は、スペース区切りで複数設定することができます
 * 春分の日、秋分の日、振替休日、国民の休日は個別に計算するため、日付は不要です
 */

var HOLIDAYS = [// 祝日
'元日         1949-/1/1', '成人の日     1949-1999/1/15  2000-/1/2mon', '建国記念の日 1967-/2/11', '春分の日', '天皇誕生日   1949-1988/4/29', 'みどりの日   1989-2006/4/29', '昭和の日     2007-/4/29', '憲法記念日   1949-/5/3', 'みどりの日   2007-/5/4', 'こどもの日   1949-/5/5', '海の日       1996-2002/7/20  2003-/7/3mon', '山の日       2016-/8/11', '敬老の日     1966-2002/9/15  2003-/9/3mon', '秋分の日', '体育の日     1966-1999/10/10 2000-/10/2mon', '文化の日     1948-/11/3', '勤労感謝の日 1948-/11/23', '天皇誕生日   1989-/12/23', // 特別な休日
'振替休日', '国民の休日', // 皇室慶弔行事
'皇太子・明仁親王の結婚の儀  1959/4/10', '昭和天皇の大喪の礼          1989/2/24', '即位の礼正殿の儀            1990/11/12', '皇太子・徳仁親王の結婚の儀  1993/6/9']; // 月名一覧

var MONTH = ('January,February,March,April,May,June,' + 'July,August,September,October,November,December').split(','); // 曜日

var WEEK = 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'.split(',');
var JWEEK = '日月火水木金土'.split(''); // 期間を表す単位

var TERM_LIST = ['y , year       , years       ,         年,年度,カ年,ヶ年,ケ年,か年', 'm , month      , months      , mo,mon, 月,カ月,ヶ月,ケ月,か月', 'w , week       , weeks       ,         週,週間', 'd , day        , days        ,         日', 'h , hour       , hours       ,         時,時間', 'i , minute     , minutes     , min   , 分', 's , second     , seconds     , sec   , 秒', 'ms, millisecond, milliseconds, milli , ミリ秒'];
var TERM = TERM_LIST.reduce(function (x, t) {
  var ks = t.split(',');
  var v = ks[0].trim();
  ks.forEach(function (k) {
    return x[k.trim()] = v;
  });
  return x;
}, {});
module.exports = {
  FORMAT: FORMAT,
  REGULAR_HOLIDAY: REGULAR_HOLIDAY,
  SEASON_HOLIDAY: SEASON_HOLIDAY,
  OPEN_ON_HOLIDAY: OPEN_ON_HOLIDAY,
  START_MONTH: START_MONTH,
  START_WEEK: START_WEEK,
  KIND_MARGIN: KIND_MARGIN,
  ERAS: ERAS,
  HOLIDAYS: HOLIDAYS,
  MONTH: MONTH,
  WEEK: WEEK,
  JWEEK: JWEEK,
  TERM: TERM
};

},{"core-js/modules/es.string.split":142,"core-js/modules/es.string.trim":143,"core-js/modules/web.dom-collections.for-each":147}],6:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.join");

require("core-js/modules/es.array.slice");

require("core-js/modules/es.object.keys");

require("core-js/modules/es.string.split");

/**
 * *********************************************************
 *                    フォーマット
 * *********************************************************
 */

/**
 * dependencies
 */
var compile = require('./utils/compileFormat');

var formatArray = require('./utils/formatArray');

var formatOptions = require('./utils/formatOptions');

var PARAMS = require('./parameters');
/**
 * alias
 */


var DEFAULT_FY_FORMAT = 'Y/M - Y/M';
var DEFAULT_DELIMITER = '-';
module.exports = {
  format: formatDate,
  formatYear: formatYear,
  compileFormat: compile,
  parameters: Object.keys(PARAMS)
};
/**
 * フォーマット
 * 日時をパラメータ文字列にそって整形します
 *
 *  YYYY-MM-DD -> 2015-05-18
 *
 * @method format
 * @param  {DATE}   date       日時
 * @param  {String} format     フォーマット 省略時 koyomi.defaultFormat
 * @return {String} formatted
 */

function formatDate(date, format) {
  date = this.toDatetime(date);

  if (!date) {
    return '';
  }

  var compiled = format ? compile(format) : this._defaultFormat;
  var value = formatArray(this, date, compiled.v).join(''); // 全体オプションを適用して返す

  return compiled.o ? formatOptions(value, compiled.o) : value;
}
/**
 * 年度を表す表記を返します
 * @method formatYear
 * @param  {DATE}      date       含まれる日時           既定値 new Date()
 * @param  {String}    format     フォーマット           既定値 'Y/M - Y/M'
 * @param  {String}    delimiter  開始と終了を分ける文字 既定値 '-'
 * @param  {Boolean}   reverse    結合順を逆にする       既定値 false
 * @return {String}    formatted
 */


function formatYear(date, format, delimiter, reverse) {
  var range = this.getRange(date || new Date(), 'year');
  format = format || DEFAULT_FY_FORMAT;
  delimiter = delimiter || DEFAULT_DELIMITER;
  var opIdx = format.indexOf('>>');
  var options;

  if (0 < opIdx) {
    options = format.slice(opIdx);
    format = format.slice(0, opIdx);
  } else {
    options = '';
  }

  var splited = delimiter ? format.split(delimiter) : [format];

  if (splited.length === 1) {
    return this.format(reverse ? range.to : range.from, format + options);
  } else if (reverse) {
    return this.format(range.to, splited[0] + options) + delimiter + this.format(range.from, splited[1] + options);
  } else {
    return this.format(range.from, splited[0] + options) + delimiter + this.format(range.to, splited[1] + options);
  }
}

},{"./parameters":10,"./utils/compileFormat":13,"./utils/formatArray":17,"./utils/formatOptions":18,"core-js/modules/es.array.join":129,"core-js/modules/es.array.slice":131,"core-js/modules/es.object.keys":135,"core-js/modules/es.string.split":142}],7:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.slice");

require("core-js/modules/es.object.keys");

require("core-js/modules/es.string.match");

require("core-js/modules/web.dom-collections.for-each");

/**
 * dependencies
 */
var HOLIDAYS = require('./config').HOLIDAYS;

var getXDay = require('./utils/getXDay');

var getWeekIndex = require('./utils/getWeekIndex');
/**
 * alias
 */


var A_DAY = 86400000;
var holidayCache = {};
/**
 * *********************************************************
 *                       祝日の計算
 * *********************************************************
 */

module.exports = {
  getHolidayName: getHolidayName,
  getHolidays: getHolidays
};
/**
 * 祝日名を取得
 * @method getHolidayName
 * @param  {DATE}   date
 * @return {String} name
 */

function getHolidayName(date) {
  date = this.toDate(date);

  if (!date) {
    return null;
  }

  var key = (date.getMonth() + 1) * 100 + date.getDate();
  var holidays = getHolidays(date.getFullYear());
  return holidays[key] || null;
}
/**
 * 祝日一覧を取得する
 * キーに日にち、値に祝日名が設定されたオブジェクトを返す
 *
 *  {'101': '元日', '111': '成人の日', '211': '建国記念日', （省略...）
 *
 * 一度計算された祝日一覧はholidayCacheにキャッシュされ次回以降は再利用されます
 *
 * @method getHolidays
 * @param  {Number}   year
 * @return {Object}   holidays
 */


function getHolidays(year) {
  var holidays = holidayCache[year];

  if (holidays) {
    return holidays;
  } // 祝日を計算し追加


  holidays = {};
  var furikae = false;
  var kokumin = false;
  HOLIDAYS.forEach(function (item) {
    var h;

    switch (item) {
      case '春分の日':
        h = getShunbun(year);
        break;

      case '秋分の日':
        h = getShubun(year);
        break;

      case '振替休日':
        furikae = true;
        break;

      case '国民の休日':
        kokumin = true;
        break;

      default:
        h = parseHoliday(year, item);
        break;
    }

    if (h) {
      var key = h[0] * 100 + h[1];
      holidays[key] = h[2];
    }
  }); // 振替休日を設定

  if (furikae) {
    setFurikaeKyujitu(year, holidays);
  } // 国民の休日を設定


  if (kokumin) {
    setKokuminNoKyujitu(year, holidays);
  } // キャッシュに保存


  holidayCache[year] = holidays;
  return holidays;
} // 祝日定義の日にち部分の正規表現


var REG_HOLIDAY = /^(?:(\d+)(-)?(\d+)?\/)?(\d+)\/(\d+)(\D*)?$/;
/**
 * 祝日の定義から、その年に祝日があれば日にちを返す。ないならnullを返す
 *   例
 *     year    = 2016
 *     item    = '海の日 1996-2002/7/20  2003-/7/3Mon'
 *     holiday = [7, 18, '海の日']
 *
 * @method parseHoliday
 * @param  {Number}     year
 * @param  {String}     item
 * @return {Array}      holiday
 */

function parseHoliday(year, item) {
  var data = item.match(/(\S+)/g);
  var name = data[0];

  for (var i = 1; i < data.length; i++) {
    var m = data[i].match(REG_HOLIDAY);

    if (m) {
      var from = +m[1];
      var to = +(m[3] || (m[2] ? year : from));

      if (from <= year && year <= to) {
        var month = m[4] * 1;

        if (m[6]) {
          var w = getWeekIndex(m[6]);
          var date = getXDay(year, month, +m[5], w);

          if (date) {
            return [month, date.getDate(), name];
          }
        } else {
          return [month, +m[5], name];
        }
      }
    }
  }

  return null;
}
/**
 * 春分の日 (wikiの簡易計算より)
 * @method getShunbun
 * @param  {Number}   year
 * @return {Array}    shunbun
 */


function getShunbun(year) {
  if (year < 1949 || 2099 < year) {
    return null;
  }

  var day;

  switch (year % 4) {
    case 0:
      day = year <= 1956 ? 21 : year <= 2088 ? 20 : 19;
      break;

    case 1:
      day = year <= 1989 ? 21 : 20;
      break;

    case 2:
      day = year <= 2022 ? 21 : 20;
      break;

    case 3:
      day = year <= 1923 ? 22 : year <= 2055 ? 21 : 20;
  }

  return [3, day, '春分の日'];
}
/**
 * 秋分の日 (wikiの簡易計算より)
 * @method getShubun
 * @param  {Number}  year
 * @return {Array}   shubun
 */


function getShubun(year) {
  if (year < 1948 || 2099 < year) {
    return null;
  }

  var day;

  switch (year % 4) {
    case 0:
      day = year <= 2008 ? 23 : 22;
      break;

    case 1:
      day = year <= 1917 ? 24 : year <= 2041 ? 23 : 22;
      break;

    case 2:
      day = year <= 1946 ? 24 : year <= 2074 ? 23 : 22;
      break;

    case 3:
      day = year <= 1979 ? 24 : 23;
  }

  return [9, day, '秋分の日'];
}
/**
 * 振替休日を設定する
 * 施行: 1973/4/30-
 * @method setFurikaeKyujitu
 * @param  {Number}   year
 * @param  {Object}   holidays
 */


function setFurikaeKyujitu(year, holidays) {
  if (year < 1973) {
    return;
  }

  var last = null;
  var furikae = [];
  var activeTime = new Date(1973, 4 - 1, 29).getTime(); // 施行前日の祝日から適用

  var flg = false;
  var keys = Object.keys(holidays);
  keys.push('1231');
  keys.forEach(function (md) {
    var date = new Date(year, md.slice(0, -2) * 1 - 1, md.slice(-2) * 1);

    if (flg) {
      last.setTime(last.getTime() + A_DAY);

      if (last.getTime() !== date.getTime()) {
        furikae.push((last.getMonth() + 1) * 100 + last.getDate());
        flg = false;
      }
    } else {
      flg = date.getDay() === 0 && activeTime <= date.getTime();
    }

    last = date;
  });
  furikae.forEach(function (x) {
    return holidays[x] = '振替休日';
  });
}
/**
 * 国民の休日を設定する
 * 施行: 1988-
 * @method setKokuminNoKyujitu
 * @param  {Number}   year
 * @param  {Object}   holidays
 */


function setKokuminNoKyujitu(year, holidays) {
  if (year < 1988) {
    return;
  }

  var kokumin = [];
  var last = null;
  Object.keys(holidays).forEach(function (md) {
    var date = new Date(year, md.slice(0, -2) * 1 - 1, md.slice(-2) * 1);

    if (last) {
      last.setTime(last.getTime() + A_DAY);

      if (last.getTime() + A_DAY === date.getTime()) {
        kokumin.push((last.getMonth() + 1) * 100 + last.getDate());
      }
    }

    last = date;
  }); // 他の祝日や振替休日が優先される

  kokumin.forEach(function (x) {
    return holidays[x] = holidays[x] || '国民の休日';
  });
}

},{"./config":5,"./utils/getWeekIndex":22,"./utils/getXDay":24,"core-js/modules/es.array.slice":131,"core-js/modules/es.object.keys":135,"core-js/modules/es.string.match":140,"core-js/modules/web.dom-collections.for-each":147}],8:[function(require,module,exports){
"use strict";

require("core-js/modules/es.symbol");

require("core-js/modules/es.symbol.description");

require("core-js/modules/es.symbol.iterator");

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.object.keys");

require("core-js/modules/es.object.to-string");

require("core-js/modules/es.string.iterator");

require("core-js/modules/web.dom-collections.for-each");

require("core-js/modules/web.dom-collections.iterator");

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * @license
 * Koyomi v0.5.2
 * Copyright(c) 2015 Yuki Kurata <yuki.kurata@gmail.com>
 * MIT Licensed
 */

/**
 * dependencies
 */
var CONFIG = require('./config');

var compileFormat = require('./utils/compileFormat');

var toStringFormat = require('./utils/toStringFormat');

var compileRegularHoliday = require('./utils/compileRegularHoliday');

var toStringRegularHoliday = require('./utils/toStringRegularHoliday');

var compileSeasonHoliday = require('./utils/compileSeasonHoliday');

var toStringSeasonHoliday = require('./utils/toStringSeasonHoliday');

var getWeekIndex = require('./utils/getWeekIndex');
/**
 * *********************************************************
 *                    暦オブジェクト
 * *********************************************************
 *
 * 日本の年号、祝日、営業日に対応した日時計算を行うオブジェクトです
 *
 *                     *****注意*****
 * 引数の型がDATEである場合は、引数はkoyomi.toDatetime/toDateで変換されることを表します
 * そのため同関数でDateオブジェクトに変換できる全ての型をサポートします
 *
 */


var koyomi = {
  /**
   * 年度の開始月
   */
  get startMonth() {
    return this._startMonth;
  },

  set startMonth(v) {
    if (v === (v | 0) && this._startMonth !== v && 1 <= v && v <= 12) {
      this.resetBizCache('year');
      this._startMonth = v;
    }
  },

  /**
   * 週の開始曜日
   */
  get startWeek() {
    return CONFIG.JWEEK[this._startWeek];
  },

  set startWeek(v) {
    var w = getWeekIndex(v);

    if (typeof w === 'number') {
      this._startWeek = w;
    }
  },

  /**
   * defaultFormat
   * format関数で第二引数を省略した場合に設定される既定のフォーマット
   */
  get defaultFormat() {
    return toStringFormat(this._defaultFormat);
  },

  set defaultFormat(v) {
    if (typeof v === 'string') {
      this._defaultFormat = compileFormat(v);
    }
  },

  /**
   * regularHoliday
   * 定休日の定義
   * '土,日'、'10,20'、'2火,3火'、 '土,日,2火,30'、
   * 曜日、日、第nw曜日を指定することができます。混合も可能
   * 固定値の代わりにDateを受け取りBoolean(休みかどうか)を
   * 返す関数を定義することもできます
   */
  get regularHoliday() {
    return toStringRegularHoliday(this._regularHoliday);
  },

  set regularHoliday(v) {
    this.resetBizCache();
    this._regularHoliday = compileRegularHoliday(v);
  },

  /**
   * 年末年始・お盆休みの定義
   * '12/28-1/4, 8/13-8/15'のように指定します
   * 固定値の代わりにDateを受け取りBoolean(休みかどうか)を
   * 返す関数を定義することもできます
   */
  get seasonHoliday() {
    return toStringSeasonHoliday(this._seasonHoliday);
  },

  set seasonHoliday(v) {
    this.resetBizCache();
    this._seasonHoliday = compileSeasonHoliday(v);
  },

  /**
   * 祝日に営業するか
   * true/falseを設定
   */
  get openOnHoliday() {
    return this._openOnHoliday;
  },

  set openOnHoliday(v) {
    this.resetBizCache();
    this._openOnHoliday = v;
  },

  /**
   * 日の個別データ
   * 次のプロパティを持ちます
   *
   *  open: 営業日に設定されている場合にtrue
   *  close: 休業日に設定されている場合にtrue
   *  events: イベント(配列)
   */
  days: {},

  /**
   * 営業日計算結果をキャッシュ
   * 次のプロパティが更新された場合はすべてのキャッシュが破棄されます
   * regularHoliday, seasonHoliday, holidayOpened,
   * 次のプロパティが更新された場合は年度のキャッシュがすべて破棄されます
   * startMonth
   * 次のメソッドが実行された場合は、指定した日が含まれる月と年度のキャッシュが破棄されます
   * open, close, reset
   */
  bizCache: {}
}; // ミックスイン

var mixin = function mixin(source) {
  return Object.keys(source).forEach(function (k) {
    return koyomi[k] = source[k];
  });
};
/**
 * {Date}    add ({DATE} date, {String} value)
 * {Boolean} isLeap ({DATE} date)
 * {Object}  getRange({DATE} date, {String} term)
 * {Date}    from ({DATE} date, {String} term)
 * {Date}    to ({DATE} date, {String} term)
 * {Number}  diff({DATE} from, {DATE} to, {String} term)
 * {Number}  days({String} yyyymm)
 * {Number}  days({DATE} date, {String} term)
 * {Number}  days({DATE} from, {DATE} to)
 * {Number}  passDays({DATE} date, {String} term)
 * {Number}  remainDays({DATE} date, {String} term)
 * {Object}  separate({DATE} from, {DATE} to)
 * {Number}  getAge({DATE} birthday, {DATE} when)
 * {String}  kind ({DATE} date, {DATE} compareTo)
 */


mixin(require('./calcDate'));
/**
 * {DATE}    addBiz ({DATE} date, {Number} days, {Boolean} include)
 * {Number}  biz ({String}) yyyymm)
 * {Number}  biz ({DATE}) from, {DATE}) to)
 * {Number}  biz ({DATE}) date, {String}) term)
 * {Number}  passBiz ({DATE} date, {String}) term)
 * {Number}  remainBiz ({DATE} date, {String}) term)
 * {Boolean} resetBizCache ({DATE} date)
 */

mixin(require('./calcBiz'));
/**
 * {Array}  getEvents ({DATE} date)
 * {Number} addEvent ({DATE} date, {String} value)
 * {Array}  removeEvent ({DATE} date, {Number} index)
 * {Array}  getCalendarData ({Number|String} range)
 */

mixin(require('./calendar'));
/**
 *  {String} format ({DATE} date, {String} format)
 *  {String} formatYear ({DATE} date, {String} format, {String} delimiter, {Boolean} reverse)
 *  {Object} compileFormat({String} format)
 */

mixin(require('./format'));
/**
 * {String} getHolidayName ({DATE} date)
 * {Object} getHolidays ({Number} year)
 */

mixin(require('./holiday'));
/**
 * {Boolean} open ({DATE} date)
 * {Boolean} close ({DATE} date)
 * {Boolean} reset ({DATE} date)
 * {Boolean} isOpen ({DATE} date)
 * {Boolean} isClose ({DATE} date)
 * {Boolean} isSetOpen ({DATE} date)
 * {Boolean} isSetClose ({DATE} date)
 * {Boolean} isRegularHoliday ({DATE} date)
 * {Boolean} isSeasonHoliday ({DATE} date)
 * {Boolean} isHolidayClose ({DATE} date)
 * {String}  closeCause({Date} date)
 */

mixin(require('./openClose'));
/**
 * {Date}   parse({String} value)
 * {Date}   toDatetime({Date|String|Array|Number|Object} date)
 * {Date}   toDate({Date|String|Array|Number|Object} date)
 * {Object} getEra ({DATE} date, {Boolean} daily)
 * {Number} getWeekNumber ({DATE} date)
 * {Number} getISOWeekNumber ({DATE} date)
 * {Date}   getXDay ({Number} x, {String} week, {DATE} date)
 */

mixin(require('./util'));
/**
 * 初期設定の暦オブジェクトを作成します
 * @return {Object} koyomi
 */

koyomi.create = function create() {
  return createKoyomi();
};
/**
 * 現在の設定を引き継いだ暦オブジェクトを新たに作成します
 * @return {Object} koyomi
 */


koyomi.clone = function clone() {
  return createKoyomi(this);
}; // ********* createObject **********


function createKoyomi(obj) {
  return Object.create(koyomi, {
    _startMonth: {
      value: obj ? obj._startMonth : CONFIG.START_MONTH,
      writable: true,
      enumerable: false,
      configurable: false
    },
    _startWeek: {
      value: obj ? obj._startWeek : getWeekIndex(CONFIG.START_WEEK),
      writable: true,
      enumerable: false,
      configurable: false
    },
    _defaultFormat: {
      value: obj ? obj._defaultFormat : compileFormat(CONFIG.FORMAT),
      writable: true,
      enumerable: false,
      configurable: false
    },
    _regularHoliday: {
      value: obj ? obj._regularHoliday : compileRegularHoliday(CONFIG.REGULAR_HOLIDAY),
      writable: true,
      enumerable: false,
      configurable: false
    },
    _seasonHoliday: {
      value: obj ? obj._seasonHoliday : compileSeasonHoliday(CONFIG.SEASON_HOLIDAY),
      writable: true,
      enumerable: false,
      configurable: false
    },
    _openOnHoliday: {
      value: obj ? obj._openOnHoliday : CONFIG.OPEN_ON_HOLIDAY,
      writable: true,
      enumerable: false,
      configurable: false
    },
    dayInfo: {
      value: obj ? JSON.parse(JSON.stringify(obj.dayInfo)) : {},
      writable: true,
      enumerable: false,
      configurable: false
    },
    bizCache: {
      value: obj ? JSON.parse(JSON.stringify(obj.bizCache)) : {},
      writable: true,
      enumerable: false,
      configurable: false
    }
  });
} // *********  exports **********


module.exports = createKoyomi(); // クライアント用

if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === 'object') {
  window.koyomi = module.exports;
}

},{"./calcBiz":2,"./calcDate":3,"./calendar":4,"./config":5,"./format":6,"./holiday":7,"./openClose":9,"./util":11,"./utils/compileFormat":13,"./utils/compileRegularHoliday":14,"./utils/compileSeasonHoliday":15,"./utils/getWeekIndex":22,"./utils/toStringFormat":31,"./utils/toStringRegularHoliday":32,"./utils/toStringSeasonHoliday":33,"core-js/modules/es.array.iterator":128,"core-js/modules/es.object.keys":135,"core-js/modules/es.object.to-string":136,"core-js/modules/es.string.iterator":139,"core-js/modules/es.symbol":146,"core-js/modules/es.symbol.description":144,"core-js/modules/es.symbol.iterator":145,"core-js/modules/web.dom-collections.for-each":147,"core-js/modules/web.dom-collections.iterator":148}],9:[function(require,module,exports){
"use strict";

require("core-js/modules/es.symbol");

require("core-js/modules/es.symbol.description");

require("core-js/modules/es.symbol.iterator");

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.object.to-string");

require("core-js/modules/es.string.iterator");

require("core-js/modules/web.dom-collections.iterator");

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
 * dependencies
 */
var A_WEEK = 86400000 * 7;

var getDayInfo = require('./utils/getDayInfo');
/**
 * *********************************************************
 *                    営業・休業
 * *********************************************************
 */


module.exports = {
  open: open,
  close: close,
  reset: reset,
  isOpen: isOpen,
  isClose: isClose,
  isSetOpen: isSetOpen,
  isSetClose: isSetClose,
  isRegularHoliday: isRegularHoliday,
  isSeasonHoliday: isSeasonHoliday,
  isHolidayClose: isHolidayClose,
  closeCause: closeCause
};
/**
 * 指定日を営業日に設定します（休日設定を無視します）
 * @method open
 * @param  {DATE}    date
 * @return {Boolean} success
 */

function open(date) {
  date = this.toDate(date);

  if (!date) {
    return false;
  }

  var info = getDayInfo(this.dayInfo, date, true);

  if (!info.open) {
    info.open = true;
    delete info.close;
    this.resetBizCache(date);
  }

  return true;
}
/**
 * 指定日を休業日に設定します（休日設定を無視します）
 * @method close
 * @param  {DATE}    date
 * @return {Boolean} success
 */


function close(date) {
  date = this.toDate(date);

  if (!date) {
    return false;
  }

  var info = getDayInfo(this.dayInfo, date, true);

  if (!info.close) {
    delete info.open;
    info.close = true;
    this.resetBizCache(date);
  }

  return true;
}
/**
 * 臨時営業・臨時休業の設定を取り消します
 * @method reset
 * @param  {DATE}    date
 * @return {Boolean} success
 */


function reset(date) {
  date = this.toDate(date);

  if (!date) {
    return false;
  }

  var info = getDayInfo(this.dayInfo, date);

  if (info && (info.open || info.close)) {
    delete info.open;
    delete info.close;
    this.resetBizCache(date);
    return true;
  } else {
    return false;
  }
}
/**
 * 営業日判定
 *
 *  営業日のチェックは次の４つを確認します
 *
 *    1, 臨時営業・臨時休業
 *    2, 年末年始・お盆の休み
 *    3, 定休日
 *    4, 祝日での休業
 *
 * @method isOpen
 * @param  {Date}    date
 * @return {Boolean} isOpen
 */


function isOpen(date) {
  date = this.toDate(date);

  if (!date) {
    return null;
  } // 臨時営業・臨時休業


  var info = getDayInfo(this.dayInfo, date);

  if (info) {
    if (info.open) {
      return true;
    } else if (info.close) {
      return false;
    }
  } // 定休日判定


  if (this.isRegularHoliday(date)) {
    return false;
  } // 年末年始・お盆等の休みの判定


  if (this.isSeasonHoliday(date)) {
    return false;
  } // 祝日判定


  if (this.isHolidayClose(date)) {
    return false;
  }

  return true;
}
/**
 * 休業日判定
 * 判定方法は、isOpenを参照
 * @method isClose
 * @param  {DATE}    date
 * @return {Boolean} isClose
 */


function isClose(date) {
  date = this.toDate(date);

  if (!date) {
    return null;
  }

  return !this.isOpen(date);
}
/**
 * 臨時営業に設定されているか
 * @method isSetOpen
 * @param  {DATE}    date
 * @return {Boolean} isOpen
 */


function isSetOpen(date) {
  date = this.toDate(date);

  if (!date) {
    return null;
  }

  var info = getDayInfo(this.dayInfo, date);
  return info && info.open || false;
}
/**
 * 臨時休業に設定されているか
 * @method isSetClose
 * @param  {DATE}    date
 * @return {Boolean} isClose
 */


function isSetClose(date) {
  date = this.toDate(date);

  if (!date) {
    return null;
  }

  var info = getDayInfo(this.dayInfo, date);
  return info && info.close || false;
}
/**
 * 定休日判定
 * @method isRegularHoliday
 * @param  {DATE}    date
 * @return {Boolean} isClose
 */


function isRegularHoliday(date) {
  date = this.toDate(date);

  if (!date) {
    return null;
  }

  var regular = this._regularHoliday;

  if (_typeof(regular) === 'object') {
    var w = date.getDay(); // 週

    if (regular.week[w]) {
      return true;
    } // 日


    if (regular.day[date.getDate()]) {
      return true;
    } // 第ny曜日


    var n = parseInt((date.getDate() + 6) / 7, 10);

    if (regular.xweek[n + '-' + w]) {
      return true;
    } else if (regular.xweek['5-' + w]) {
      var nextW = new Date(date.getTime() + A_WEEK);

      if (nextW.getMonth() !== date.getMonth()) {
        return true;
      }
    }

    return false;
  }

  if (typeof regular === 'function') {
    return regular(date);
  }

  return false;
}
/**
 * 年末年始・お盆の休日判定
 * @method isSeasonHoliday
 * @param  {DATE}    date
 * @return {Boolean} isClose
 *
 */


function isSeasonHoliday(date) {
  date = this.toDate(date);

  if (!date) {
    return false;
  }

  var season = this._seasonHoliday;

  if (!season) {
    return false;
  } else if (typeof season === 'function') {
    return season(date);
  } else {
    var key = (date.getMonth() + 1) * 100 + date.getDate() * 1;
    return season[key] || false;
  }
}
/**
 * 祝日休み判定
 * @method isHolidayClose
 * @param  {DATE}    date
 * @return {Boolean} isClose
 */


function isHolidayClose(date) {
  if (this.openOnHoliday) {
    return false;
  }

  return this.getHolidayName(date) !== null;
}
/**
 * 休業の事由
 *
 * 次の優先順位で判別し、以下の文字列を返します
 *
 *  1. closeで設定
 *      addEventで追加された最初の文字列
 *      存在しない場合は'臨時休業'
 *
 *  2. 年末年始・お盆休み
 *      設定時の事由もしくは'休業期間'と返す
 *
 *  3. 定休日
 *      '定休日'と返す
 *
 *  4. 祝日休み判定
 *      祝日名を返す
 *
 * @param  {DATE}   date
 * @return {String} cause
 */


function closeCause(date) {
  date = this.toDate(date);

  if (!date) {
    return null;
  }

  var info = getDayInfo(this.dayInfo, date);

  if (info && info.open) {
    return '';
  }

  if (info && info.close) {
    return info.events[0] || '臨時休業';
  }

  var cause = this.isSeasonHoliday(date);

  if (cause) {
    return cause;
  }

  if (this.isRegularHoliday(date)) {
    return '定休日';
  }

  if (this.isHolidayClose(date)) {
    return this.getHolidayName(date);
  }

  return '';
}

},{"./utils/getDayInfo":19,"core-js/modules/es.array.iterator":128,"core-js/modules/es.object.to-string":136,"core-js/modules/es.string.iterator":139,"core-js/modules/es.symbol":146,"core-js/modules/es.symbol.description":144,"core-js/modules/es.symbol.iterator":145,"core-js/modules/web.dom-collections.iterator":148}],10:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.slice");

/**
 * dependencies
 */
var CONFIG = require('./config');
/**
 * *********************************************************
 *               パラメータ文字列の変換定義
 * *********************************************************
 *
 *  ２つの引数をとる関数を設定します
 *    t: Dateのインスタンス
 *    k: koyomiオブジェクト
 *  戻り値が、数値や文字列の場合はその値がパラメーター文字列と置換されます
 *
 *  新たなパラメータ文字列の組み合わせを指定してパラメータ文字列を作成することも
 *  できます。その場合は関数ではなく文字列を指定してください
 *  参考: WAREKI, wareki
 *
 *  また引数の日時をなんらかの計算した後に、変換を行う場合は
 *  配列を戻り値にする関数を設定します
 *  配列では、最初の要素にDateのインスタンスを、
 *  ２番目の要素に新しいパラメータ文字列の組み合わせを指定します
 *  参考: BIZ3
 *
 */


var PARAMS;
module.exports = PARAMS = {
  //  -----  カスタマイズ  -----
  // 和暦-年区切り   平成元年一月七日
  WAREKI: 'GGN年M月D日>>漢数字',
  // 和暦-日付区切り 昭和六十四年一月七日
  wareki: 'ggn年M月D日>>漢数字',
  // ISO 8601 拡張形式
  ISO: '{YYYY}-{MM}-{DD}T{HH}:{II}:{SS}{Z}',
  // 3営業日後の日付を返す
  BIZ3: function BIZ3(t, k) {
    return [k.addBiz(t, 3), 'YYYY-MM-DD'];
  },
  //  -----  西暦  -----
  // 西暦-4桁    2014
  YYYY: function YYYY(t) {
    return ('0000' + t.getFullYear()).slice(-4);
  },
  // 西暦 2014
  Y: function Y(t) {
    return t.getFullYear();
  },
  // 西暦-下2桁  14
  y: function y(t) {
    return ('' + t.getFullYear()).slice(-2);
  },
  // -----  皇紀 -----
  // 皇紀 2675
  GGG: function GGG(t) {
    return t.getFullYear() + 660;
  },
  // -----  和暦 (年区切り)-----
  // 和暦-年号   平成
  GG: function GG(t, k) {
    return k.getEra(t).N;
  },
  // 和暦-年号   H
  G: function G(t, k) {
    return k.getEra(t).n;
  },
  // 和暦-年     1,  27
  N: function N(t, k) {
    return t.getFullYear() - k.getEra(t).y + 1;
  },
  // -----  和暦 (日付区切り) -----
  // 和暦-年号  平成
  gg: function gg(t, k) {
    return k.getEra(t, true).N;
  },
  // 和暦-年号  H
  g: function g(t, k) {
    return k.getEra(t, true).n;
  },
  // 和暦-年    1,  24
  n: function n(t, k) {
    return t.getFullYear() - k.getEra(t, true).y + 1;
  },
  // ----- 上半期・下半期 -----
  // 上半期, 下半期
  V: function V(t, k) {
    return (t.getMonth() - k.startMonth + 13) % 12 < 6 ? '上半期' : '下半期';
  },
  // ----- 四半期 -----
  // 1, 2, 3, 4      開始月に依存する四半期
  Q: function Q(t, k) {
    // startMonthを仮想1月とした時何月か
    var index = (t.getMonth() - k.startMonth + 14) % 12 || 12;
    return parseInt((index - 1) / 3, 10) + 1;
  },
  // -----   月   -----
  // 英語    August
  MMM: function MMM(t) {
    return CONFIG.MONTH[t.getMonth()];
  },
  // 0埋め    08,  12
  MM: function MM(t) {
    return ('0' + (t.getMonth() + 1)).slice(-2);
  },
  // 8,  12
  M: function M(t) {
    return t.getMonth() + 1;
  },
  // -----  週番号  -----
  // 週番号
  R: function R(t, k) {
    return k.getWeekNumber(t);
  },
  // ISO週番号
  r: function r(t, k) {
    return k.getISOWeekNumber(t);
  },
  // -----  日  -----
  // 05,  25
  DD: function DD(t) {
    return ('0' + t.getDate()).slice(-2);
  },
  //  5,  25
  D: function D(t) {
    return t.getDate();
  },
  //  -----  総日数・経過日数・残日数(年)  -----
  // 総日数(年)
  CCC: function CCC(t, k) {
    return k.days(t, 'year');
  },
  // 経過日数(年)
  CC: function CC(t, k) {
    return k.passDays(t, 'year');
  },
  // 残日数(年)
  C: function C(t, k) {
    return k.remainDays(t, 'year');
  },
  //  -----  総日数・経過日数・残日数(月)  -----
  // 総日数(月)
  ccc: function ccc(t, k) {
    return k.days(t, 'month');
  },
  // 経過日数(月)
  cc: function cc(t, k) {
    return k.passDays(t, 'month');
  },
  // 残日数(月)
  c: function c(t, k) {
    return k.remainDays(t, 'month');
  },
  //  -----  営業日数・営業残日数(年)  -----
  // 総営業日数(年)
  BBB: function BBB(t, k) {
    return k.biz(t, 'year');
  },
  // 経過営業日数(年)
  BB: function BB(t, k) {
    return k.passBiz(t, 'year');
  },
  // 残営業日数(年)
  B: function B(t, k) {
    return k.remainBiz(t, 'year');
  },
  //  -----  営業日数・営業残日数(月)  -----
  // 総営業日数(月)
  bbb: function bbb(t, k) {
    return k.biz(t, 'month');
  },
  // 経過営業日数(月)
  bb: function bb(t, k) {
    return k.passBiz(t, 'month');
  },
  // 残営業日数(月)
  b: function b(t, k) {
    return k.remainBiz(t, 'month');
  },
  // -----  曜日  -----
  // Monday
  WW: function WW(t) {
    return CONFIG.WEEK[t.getDay()];
  },
  // 日本語 日曜日, 月曜日,
  W: function W(t) {
    return CONFIG.JWEEK[t.getDay()] + '曜日';
  },
  // 日:0 -> 土:6
  w: function w(t) {
    return t.getDay();
  },
  //  -----  祝日  -----
  // 祝日名または曜日  元日, 成人の日, 日曜日...土曜日
  FF: function FF(t, k) {
    return k.getHolidayName(t) || PARAMS.W(t, k);
  },
  // 祝日名            元日, 成人の日,
  F: function F(t, k) {
    return k.getHolidayName(t) || '';
  },
  // 祝日または曜日    祝日, 日曜日...土曜日
  ff: function ff(t, k) {
    return PARAMS.f(t, k) || PARAMS.W(t, k);
  },
  // 祝日
  f: function f(t, k) {
    return k.getHolidayName(t) ? '祝日' : '';
  },
  //  -----  営業日・休業日  -----
  // 曜日または休業日
  EE: function EE(t, k) {
    return k.isOpen(t) ? PARAMS.W(t) : '休業日';
  },
  // 営業日または休業日
  E: function E(t, k) {
    return k.isOpen(t) ? '営業日' : '休業日';
  },
  // 休業日理由 特別休業, 祝日名, 休業日, 定休日
  e: function e(t, k) {
    return k.closeCause(t);
  },
  //  -----  時  -----
  // 24時間 0埋め    15
  HH: function HH(t) {
    return ('0' + t.getHours()).slice(-2);
  },
  // 24時間          3, 15
  H: function H(t) {
    return t.getHours();
  },
  // 12時間 0埋め    03, 15
  hh: function hh(t) {
    return ('0' + t.getHours() % 12).slice(-2);
  },
  // 12時間          3
  h: function h(t) {
    return t.getHours() % 12;
  },
  //  -----  分  -----
  // 0埋め  05,  38
  II: function II(t) {
    return ('0' + t.getMinutes()).slice(-2);
  },
  // 0なし   5,  38
  I: function I(t) {
    return t.getMinutes();
  },
  //  -----  秒  -----
  // 0埋め  07,  29
  SS: function SS(t) {
    return ('0' + t.getSeconds()).slice(-2);
  },
  // 0なし   7,  29
  S: function S(t) {
    return t.getSeconds();
  },
  // -----  ミリ秒  -----
  // 0埋め 001, 042, 567, 999
  sss: function sss(t) {
    return ('00' + t.getMilliseconds()).slice(-3);
  },
  // 0なし   1,  42, 567, 999
  s: function s(t) {
    return t.getMilliseconds();
  },
  //  -----  午前午後  -----
  // AM/PM
  AA: function AA(t) {
    return t.getHours() < 12 ? 'AM' : 'PM';
  },
  // am/pm
  aa: function aa(t) {
    return t.getHours() < 12 ? 'am' : 'pm';
  },
  // 午前/午後
  A: function A(t) {
    return t.getHours() < 12 ? '午前' : '午後';
  },
  //  ----- タイムゾーン -----
  // Z
  Z: function Z(t) {
    var tos = t.getTimezoneOffset() * -1;
    var mm = tos % 60;
    var h = (tos - mm) / 60;
    return (h < 0 ? '-' : '+') + h + ':' + ('0' + mm).slice(-2);
  },
  //  ----- 年齢 -----
  O: function O(t, k) {
    return k.getAge(t);
  },
  //  ----- 口語 -----
  K: function K(t, k) {
    return k.kind(t);
  }
};

},{"./config":5,"core-js/modules/es.array.slice":131}],11:[function(require,module,exports){
"use strict";

require("core-js/modules/es.string.match");

module.exports = {
  parse: parse,
  toDatetime: toDatetime,
  toDate: toDate,
  getEra: getEra,
  getWeekNumber: getWeekNumber,
  getISOWeekNumber: getISOWeekNumber,
  getXDay: getXDay
};
/**
 * dependencies
 */

var suji = require('./utils/suji');

var parseFn = require('./utils/parse');

var toDateFn = require('./utils/toDate');

var toDatetimeFn = require('./utils/toDatetime');

var getEraFn = require('./utils/getEra');

var getWeekIndex = require('./utils/getWeekIndex');

var getWeekNumberFn = require('./utils/getWeekNumber');

var getISOWeekNumberFn = require('./utils/getISOWeekNumber');

var getXDayFn = require('./utils/getXDay');
/**
 * alias
 */


var BIZ = /^(\d+)営業日(前|後)?$/;
/**
 * 口語から日時を返します
 * 判別できない場合はtoDatetimeへ処理を委譲し結果を返します
 * @param  {String} value
 * @param  {Date}   now     既定値: 現在の日時
 * @return {Date}   date
 */

function parse(value, now) {
  now = now ? this.toDate(now) : new Date();

  if (!now) {
    return null;
  } // 営業日計算


  if (value.indexOf('営業日') !== -1) {
    value = suji(value);
    var matches = value.match(BIZ);

    if (matches) {
      return this.addBiz(now, matches[1] * (matches[2] === '前' ? -1 : 1));
    } else {
      return null;
    } // そのほか

  } else {
    return parseFn(value, this.startMonth, this._startWeek, now) || toDatetimeFn(value, this.startMonth);
  }
}
/**
 * 日時の形式のものをできる限り日時を判別しDateオブジェクトを作成する関数
 * @param  {Date|String|Array|Number|Object} date
 * @return {Date}                            date
 */


function toDatetime(date) {
  return toDatetimeFn(date, this.startMonth);
}
/**
 * 日時の形式のものをできる限り日にちを判別しDateオブジェクトを作成する関数
 * @param  {Date|String|Array|Number|Object} date
 * @return {Date}                            date
 */


function toDate(date) {
  return toDateFn(date, this.startMonth);
}
/**
 * 元号オブジェクトを返します
 * @param  {DATE}    date
 * @param  {Boolean} daily
 * @return {Object}  era
 */


function getEra(date, daily) {
  date = this.toDate(date);
  return date ? getEraFn(date, daily) : null;
}
/**
 * 週番号を返します
 * @param  {DATE}   date
 * @return {Number} weekNumber
 */


function getWeekNumber(date) {
  date = this.toDate(date);
  var week = this._startWeek;
  return date ? getWeekNumberFn(date, week, this.startMonth) : null;
}
/**
 * ISO週番号を返します
 * @param  {DATE}   date
 * @return {Number} weekNumber
 */


function getISOWeekNumber(date) {
  date = this.toDate(date);
  return date ? getISOWeekNumberFn(date) : null;
}
/**
 * 第x week曜日の日にちをします
 * dateを省略したら今月を対象にします
 * @param  {Number} x
 * @param  {String} week
 * @param  {DATE}   date
 * @return {Date}   date
 */


function getXDay(x, week, date) {
  week = getWeekIndex(week);
  date = date ? this.toDate(date) : new Date();

  if (date && typeof week === 'number') {
    return getXDayFn(date.getFullYear(), date.getMonth() + 1, x, week);
  } else {
    return null;
  }
}

},{"./utils/getEra":20,"./utils/getISOWeekNumber":21,"./utils/getWeekIndex":22,"./utils/getWeekNumber":23,"./utils/getXDay":24,"./utils/parse":25,"./utils/suji":28,"./utils/toDate":29,"./utils/toDatetime":30,"core-js/modules/es.string.match":140}],12:[function(require,module,exports){
"use strict";

/**
 * *********************************************************
 *            (ユーティリティ関数) 日時の加減
 * *********************************************************
 */
module.exports = addTerm;
/**
 * 指定した位を加減します
 *
 * 年・月のみ指定して、日以下を指定しない場合、次のルールを適用します
 *
 * 民法第143条 暦による期間の計算
 * 週、月又は年の初めから期間を起算しないときは、その期間は、最後の週、月又は年において
 * その起算日に応当する日の前日に満了する。ただし、月又は年によって期間を定めた場合にお
 * いて、最後の月に応当する日がないときは、その月の末日に満了する。
 *
 * @param  {Date}   date
 * @param  {Object} value
 * @return {Date}   date
 */

function addTerm(date, value) {
  if ('d' in value || 'h' in value || 'i' in value || 's' in value || 'ms' in value) {
    return new Date(date.getFullYear() + (value.y || 0), date.getMonth() + (value.m || 0), date.getDate() + (value.d || 0), date.getHours() + (value.h || 0), date.getMinutes() + (value.i || 0), date.getSeconds() + (value.s || 0), date.getMilliseconds() + (value.ms || 0));
  } else if ('y' in value || 'm' in value) {
    var y = date.getFullYear() + (value.y || 0);
    var m = date.getMonth() + (value.m || 0);
    var d = Math.min(new Date(y, m + 1, 0).getDate(), date.getDate());
    return new Date(y, m, d, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  } else {
    return date;
  }
}

},{}],13:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.join");

require("core-js/modules/es.array.slice");

require("core-js/modules/es.object.keys");

require("core-js/modules/es.regexp.constructor");

require("core-js/modules/es.regexp.to-string");

/**
 * *********************************************************
 *       (ユーティリティ関数) フォーマットのコンパイル
 * *********************************************************
 */
module.exports = compileFormat; // コンパイル結果をキャッシュ

var compiledCache = {};
compileFormat.cache = compiledCache;
/**
 * dependencies
 */

var parameters = require('../parameters');
/**
 * alias
 */


var keys = Object.keys(parameters).sort(function (x, y) {
  return y.length - x.length;
}).join('|'); // {}付きパラメータ文字列を検出する正規表現

var MUSH = /\{([a-z]+)(?:>(\d))?\}/ig; // パラメーター列挙した正規表現

var PARAM = new RegExp('(' + keys + ')(?:>(\\d))?', 'g');
/**
 * フォーマットからパラメーター文字列を検出して分解し返す
 *
 * YYYY年MM月DD日(W>1)>>漢数字
 *    => {v: [{p:'YYYY'}, '年', {p:'MM'}, '月', {p:'DD'}, '日(', {p:'W', o:1}, ')'], o: {kansuji: true}}
 *
 * @param  {String} value
 * @return {Array}  compiled
 */

function compileFormat(value) {
  var c = compiledCache[value];

  if (c) {
    return c;
  }

  var m;
  var lastIndex = 0;
  var v = [];
  var o = null;
  var REG = value.indexOf('{') === -1 ? PARAM : MUSH;

  while (m = REG.exec(value)) {
    var index = m.index;

    if (lastIndex !== index) {
      v.push(value.slice(lastIndex, index));
    }

    if (parameters.hasOwnProperty(m[1])) {
      if (m[2]) {
        v.push({
          p: m[1],
          o: +m[2]
        });
      } else {
        v.push({
          p: m[1]
        });
      }
    } else {
      v.push(m[0]);
    }

    lastIndex = index + m[0].length;
  }

  if (lastIndex !== value.length) {
    var suf = value.slice(lastIndex);
    var sufIndex = suf.indexOf('>>');

    if (sufIndex === -1) {
      v.push(suf);
    } else {
      if (sufIndex !== 0) {
        v.push(suf.slice(0, sufIndex));
      }

      o = getOptions(suf.slice(sufIndex));
    }
  }

  REG.lastIndex = 0;
  c = o ? {
    v: v,
    o: o
  } : {
    v: v
  };
  compiledCache[value] = c;
  return c;
}
/**
 * オプションの解析
 * @param  {String} value
 * @return {Object} options
 */


function getOptions(value) {
  var options = {};

  if (include(value, '短縮')) {
    options.tanshuku = true;
  }

  if (include(value, '元年')) {
    options.gannen = true;
  }

  if (include(value, '漢数字フル')) {
    options.kansujiFull = true;
  } else if (include(value, '漢数字')) {
    options.kansuji = true;
  } else if (include(value, '漢字')) {
    options.kanji = true;
  } else if (include(value, '全角')) {
    options.zenkaku = true;
  }

  if (include(value, 'エスケープ')) {
    options.escape = true;
  }

  return Object.keys(options).length ? options : null;
}

function include(value, search) {
  return value.indexOf(search) !== -1;
}

},{"../parameters":10,"core-js/modules/es.array.join":129,"core-js/modules/es.array.slice":131,"core-js/modules/es.object.keys":135,"core-js/modules/es.regexp.constructor":137,"core-js/modules/es.regexp.to-string":138}],14:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.filter");

require("core-js/modules/es.array.map");

require("core-js/modules/es.string.match");

require("core-js/modules/es.string.split");

require("core-js/modules/es.string.trim");

/**
 * *********************************************************
 *       (ユーティリティ関数) 定休日のコンパイル
 * *********************************************************
 */
module.exports = compileRegularHoliday;
/**
 * dependencies
 */

var getWeekIndex = require('./getWeekIndex');
/**
 * alias
 */


var REG_NUM = /^\d{1,2}$/;
var REG_NUMYOBI = /^(\d)(.+)$/; // 配列->マップオブジェクト

var makeMap = function makeMap(v) {
  return v.reduce(function (x, y) {
    return x[y] = true, x;
  }, {});
};
/**
 * 定休日をコンパイルします
 * @param  {String} value
 * @return {Object} regular
 */


function compileRegularHoliday(value) {
  if (typeof value === 'function') {
    return value;
  } else if (typeof value === 'string') {
    return stringToRegularHolidays(value);
  } else if (typeof value === 'number' && 1 <= value && value <= 31) {
    var regular = {
      week: {},
      day: {},
      xweek: {}
    };
    regular.day[value] = true;
    return regular;
  } else {
    return {
      week: {},
      day: {},
      xweek: {}
    };
  }
}
/**
 * 定休日オブジェクトの作成
 * '土, 日, 20, 30, 2火, 3火' ->
 *   {
 *     week : {'0': true, '6': true},
 *     day  : {'20': true, '30': true},
 *     xweek: {'2-2': true, '3-2': true}
 *   }
 * @method stringToRegularHolidays
 * @param  {String} value
 * @return {Object} RegularHolidays
 */


function stringToRegularHolidays(value) {
  var regular = {};
  value = value.split(',').map(function (x) {
    return x.trim();
  }); // 曜日

  regular.week = makeMap(getWeekIndex(value) || []); // 日

  var day = value.map(function (x) {
    return REG_NUM.test(x) ? x * 1 : 0;
  }).filter(function (x) {
    return 1 <= x && x <= 31;
  });
  regular.day = makeMap(day); // 第nw曜日

  var xweek = value.map(function (x) {
    var m = x.match(REG_NUMYOBI);

    if (m) {
      var n = +m[1];
      n = 5 < n ? 5 : n;
      var w = getWeekIndex(m[2]);

      if (1 <= n && w !== null) {
        return n + '-' + w;
      }
    }

    return null;
  }).filter(function (x) {
    return x;
  });
  regular.xweek = makeMap(xweek);
  return regular;
}

},{"./getWeekIndex":22,"core-js/modules/es.array.filter":127,"core-js/modules/es.array.map":130,"core-js/modules/es.string.match":140,"core-js/modules/es.string.split":142,"core-js/modules/es.string.trim":143}],15:[function(require,module,exports){
"use strict";

require("core-js/modules/es.object.keys");

require("core-js/modules/es.string.match");

require("core-js/modules/es.string.split");

require("core-js/modules/es.string.trim");

require("core-js/modules/web.dom-collections.for-each");

/**
 * *********************************************************
 *       (ユーティリティ関数) 休業期間のコンパイル
 * *********************************************************
 */
module.exports = compileSeasonHoliday;
/**
 * alias
 */
// 月日の期間の正規表現

var REG_DATE_LIST = /^(\D*)(\d{1,2})\/(\d{1,2})(?:-(\d{1,2})\/(\d{1,2}))?$/; // 配列->マップオブジェクト

var makeMap = function makeMap(v) {
  return v.reduce(function (x, y) {
    return x[y] = true, x;
  }, {});
}; // 存在しない日付


var REMOVE_DATE = makeMap('230,231,431,631,931,1131'.split(','));
/**
 * 年末年始・お盆休みの定義
 *
 * '年末年始のお休み 12/29-1/3, お盆のお休み 8/16-8/18, 創立記念日10/10' ->
 *   {
 *     '1229': '年末年始のお休み',
 *     '1230': '年末年始のお休み',
 *     '1231': '年末年始のお休み',
 *     '101' : '年末年始のお休み',
 *     '102' : '年末年始のお休み',
 *     '103' : '年末年始のお休み',
 *     '816' : 'お盆のお休み',
 *     '817' : 'お盆のお休み',
 *     '818' : 'お盆のお休み',
 *     '1010': '創立記念日'
 *   }
 *
 * @param  {String} value
 * @return {Object} compiled
 */

function compileSeasonHoliday(value) {
  if (typeof value === 'function') {
    return value;
  } else if (typeof value === 'string') {
    value = getDateObject(value);
    return value && Object.keys(value).length ? value : null;
  } else {
    return null;
  }
}
/**
 * 文字列から月日のオブジェクトを作成する
 * @method getDateObject
 * @param  {String}  value
 * @return {Array}   days
 */


function getDateObject(value) {
  var result = {};
  var cause = '休業期間';
  value.split(',').forEach(function (v) {
    var m = v.match(REG_DATE_LIST);

    if (!m) {
      return;
    }

    var key;
    cause = (m[1] ? m[1].trim() : null) || cause; //  m1/d1-m2/d2

    if (m[4]) {
      var m1 = +m[2];
      var d1 = +m[3];
      var m2 = +m[4];
      var d2 = +m[5];

      if (m2 < m1) {
        m2 += 12;
      }

      while (m1 * 100 + d1 <= m2 * 100 + d2) {
        key = (12 < m1 ? m1 - 12 : m1) * 100 + d1;

        if (!REMOVE_DATE[key]) {
          result[key] = cause;
        }

        if (31 <= d1) {
          m1++;
          d1 = 1;
        } else {
          d1++;
        }
      } //   m/d

    } else {
      key = m[2] * 100 + m[3] * 1;
      result[key] = cause;
    }
  });
  return result;
}

},{"core-js/modules/es.object.keys":135,"core-js/modules/es.string.match":140,"core-js/modules/es.string.split":142,"core-js/modules/es.string.trim":143,"core-js/modules/web.dom-collections.for-each":147}],16:[function(require,module,exports){
"use strict";

/**
 * *********************************************************
 *          (ユーティリティ関数) 営業日数の算出
 * *********************************************************
 */
module.exports = {
  countFromTo: countFromTo,
  countTerm: countTerm
};
/**
 * alias
 */

var A_DAY = 86400000;
/**
 * 二つの日付の間の営業日数を返します
 * @param  {Object} koyomi
 * @param  {DATE}   from
 * @param  {DATE}   to
 * @return {Number} days
 */

function countFromTo(koyomi, from, to) {
  var blocks = koyomi.separate(from, to);

  if (!blocks) {
    return null;
  }

  var days = 0;
  days += blocks.days.reduce(function (x, d) {
    return koyomi.isOpen(d) ? x + 1 : x;
  }, 0);
  days += blocks.months.reduce(function (x, d) {
    return x + countMonth(koyomi, d);
  }, 0);
  days += blocks.years.reduce(function (x, d) {
    return x + countYear(koyomi, d);
  }, 0);
  return days;
}
/**
 * 指定日が含まれる期間の開始日から終了日の営業日数を返す
 * @param  {Object} koyomi
 * @param  {DATE}   date
 * @param  {String} term   year/month/weekのいずれか
 * @return {Number} days
 */


function countTerm(koyomi, date, term) {
  date = koyomi.toDate(date);

  if (!date) {
    return null;
  }

  switch (term) {
    case 'y':
      return countYear(koyomi, koyomi.from(date, 'y'));

    case 'm':
      return countMonth(koyomi, koyomi.from(date, 'm'));

    case 'w':
      return countDays(koyomi, koyomi.from(date, 'w'), 7);

    default:
      return koyomi.isOpen(date) ? 1 : 0;
  }
}
/**
 * 指定年度の営業日数を返します
 * キャッシュが存在するなら、キャッシュから返し
 * 存在しない場合は、計算後にキャッシュします
 * @param  {Object} koyomi
 * @param  {Date}   firstDay
 * @return {Number} days
 */


function countYear(koyomi, firstDay) {
  var cache = koyomi.bizCache;
  var key = firstDay.getFullYear();

  if (key in cache) {
    return cache[key];
  }

  var days = 0;
  var length = 12;

  while (length--) {
    var y = firstDay.getFullYear();
    var m = firstDay.getMonth();
    days += countMonth(koyomi, firstDay);
    firstDay = new Date(y, m + 1, 1);
  }

  cache[key] = days;
  return days;
}
/**
 * 月の営業日数を返します
 * キャッシュが存在するなら、キャッシュから返し
 * 存在しない場合は、計算後にキャッシュします
 * @param  {Object} koyomi
 * @param  {Date}   firstDay
 * @return {Number} days
 */


function countMonth(koyomi, firstDay) {
  var cache = koyomi.bizCache;
  var key = firstDay.getFullYear() + '-' + (firstDay.getMonth() + 1);

  if (key in cache) {
    return cache[key];
  }

  var length = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
  var days = countDays(koyomi, firstDay, length);
  cache[key] = days;
  return days;
}
/**
 * 指定した日から数日後までのうちの営業日数を返します
 * @param  {Object} koyomi
 * @param  {Date}   firstDay 初日
 * @param  {Number} length   初日を含む調査日数
 * @return {Number} days
 */


function countDays(koyomi, firstDay, length) {
  var days = 0;
  var d = firstDay;

  while (length--) {
    if (koyomi.isOpen(d)) {
      days++;
    }

    d.setTime(d.getTime() + A_DAY);
  }

  return days;
}

},{}],17:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.join");

require("core-js/modules/es.array.map");

require("core-js/modules/es.array.slice");

/**
 * *********************************************************
 *       (ユーティリティ関数) パラメータ文字列の変換
 * *********************************************************
 */
module.exports = formatArray;
/**
 * dependencies
 */

var PARAMS = require('../parameters');

var suji = require('./suji');

var compile = require('./compileFormat');

var formatOptions = require('./formatOptions');
/**
 * 各パラメータ文字列を値に変換し値を返します
 * @method formatArray
 * @param  {Date}  date
 * @param  {Array} format
 * @return {Array}
 */


function formatArray(koyomi, date, format) {
  return format.map(function (x) {
    // 変換なし
    if (typeof x === 'string') {
      return x; // 変換あり
    } else {
      var v;
      var fn = PARAMS[x.p]; // 変換関数が文字列の場合はカスタマイズ文字列の処理とする

      if (typeof fn === 'string') {
        var c = compile(fn);
        v = formatArray(koyomi, date, c.v).join('');

        if (c.o) {
          v = formatOptions(v, c.o);
        } // 関数の場合はそのまま結果を受け取る

      } else {
        v = fn(date, koyomi); // 結果が配列の場合はさらに変換作業を行う

        if (Array.isArray(v)) {
          var f = compile(v[1]);
          v = formatArray(koyomi, v[0], f.v).join('');

          if (f.o) {
            // 全体オプション (全角、漢数字等)
            v = formatOptions(v, f.o);
          }
        }
      } // 個別オプション


      return x.hasOwnProperty('o') ? convertFormatNumber(v, x.o) : v;
    }
  });
}
/**
 * 0埋め、序数、切り捨てを処理する
 * @method convertFormatNumber
 * @param  {Number|String} value
 * @param  {Number}        num
 * @return {String}        value
 */


function convertFormatNumber(value, num) {
  // 序数
  if (num === 0) {
    return suji(value, '序数');
  } // 0埋め


  if (typeof value === 'number') {
    value = value + '';
    return value.length < num ? ('000000000' + value).slice(-num) : value;
  } // 切り捨て


  return num && num < value.length ? value.substring(0, num) : value;
}

},{"../parameters":10,"./compileFormat":13,"./formatOptions":18,"./suji":28,"core-js/modules/es.array.join":129,"core-js/modules/es.array.map":130,"core-js/modules/es.array.slice":131}],18:[function(require,module,exports){
"use strict";

require("core-js/modules/es.string.replace");

/**
 * *********************************************************
 *       (ユーティリティ関数) 全体オプションの変換
 * *********************************************************
 */
module.exports = formatOption;
/**
 * dependencies
 */

var suji = require('./suji');
/**
 * 全体オプションを処理する
 * @method convertFormatOption
 * @param  {String} value
 * @param  {Object} options オプション
 *             tanshuku    短縮  : 0分・0秒を省略
 *             kansuji     漢数字: 位あり漢字表記。ただし西暦は漢字
 *             kansujiFull 漢数字: 位あり漢字表記
 *             kanji       漢字  : 位なし漢字表記
 *             zenkaku     全角  : 全角数字に変換
 *             escape      エスケープ: & < > " 'を無害処理
 * @return {String} value
 */


function formatOption(value, options) {
  // 8時0分0秒 -> 8時
  if (options.tanshuku) {
    value = value.replace(/(\D)0秒/, function (m, D) {
      return D;
    });

    if (value.indexOf('秒') === -1) {
      value = value.replace(/(\D)0分/, function (m, D) {
        return D;
      });
    }
  } // 平成1年9月9日 -> 平成元年9月9日


  if (options.gannen) {
    value = value.replace(/(\D)1年/, function (m, D) {
      return D + '元年';
    });
  } // 以下は排他
  // 2000年12月23日 -> 二〇〇〇年十二月二十三日


  if (options.kansuji) {
    value = value.replace(/(\D)1年/, function (m, D) {
      return D + '元年';
    });
    value = value.replace(/\d+/g, function (d) {
      return d.length < 3 ? suji(+d, '漢数字') : suji(+d, '漢字');
    }); // 2000年12月23日 -> 二千年十二月二十三日
  } else if (options.kansujiFull) {
    value = value.replace(/(\D)1年/, function (m, D) {
      return D + '元年';
    });
    value = value.replace(/\d+/g, function (d) {
      return suji(+d, '漢数字');
    }); // 2000年12月23日 -> 二〇〇〇年一二月二三日
  } else if (options.kanji) {
    value = value.replace(/(\D)1年/, function (m, D) {
      return D + '元年';
    });
    value = value.replace(/\d+/g, function (d) {
      return suji(+d, '漢字');
    }); // 2000年12月23日 -> ２０００年１２月２３日
  } else if (options.zenkaku) {
    value = value.replace(/\d+/g, function (d) {
      return suji(+d, '全角');
    });
  } // エスケープ


  if (options.escape) {
    value = escapeHtml(value);
  }

  return value;
} // HTMLエスケープ


function escapeHtml(str) {
  str = str.replace(/&/g, '&amp;');
  str = str.replace(/</g, '&lt;');
  str = str.replace(/>/g, '&gt;');
  str = str.replace(/"/g, '&quot;');
  str = str.replace(/'/g, '&#39;');
  return str;
}

},{"./suji":28,"core-js/modules/es.string.replace":141}],19:[function(require,module,exports){
"use strict";

/**
 * *********************************************************
 *            (ユーティリティ関数) 日の情報取得
 * *********************************************************
 */
module.exports = getDayInfo;
/**
 * 日の個別データを返す
 * 営業設定・休業設定・イベントなどが登録されている
 * @method getDayInfo
 * @param  {Object}  days
 * @param  {date}    date
 * @param  {Boolean} create  存在しない場合は空の個別データを作成する
 * @return {Object}  info
 */

function getDayInfo(days, date, create) {
  var key = createKey(date);
  var info = days[key];

  if (!info && create) {
    info = {
      events: []
    };
    days[key] = info;
  }

  return info || null;
}
/**
 * 保存キー
 */


function createKey(date) {
  return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
}

},{}],20:[function(require,module,exports){
"use strict";

/**
 * *********************************************************
 *        (ユーティリティ関数) 年号オブジェクトの取得
 * *********************************************************
 */
module.exports = getEra;

var ERAS = require('../config').ERAS;

var LEN = ERAS.length;
var AD = ERAS[LEN - 1];
/**
 * @method getEra
 * @param  {DATE}    date
 * @param  {Boolean} daily  true時は日付で年号の境を判定。falseでは年単位
 * @return {Object}  era
 */

function getEra(date, daily) {
  var Y = date.getFullYear(); // 日本でのグレゴリオ歴の導入は1873年（明治6年）以降。明治の元年〜5年は西暦を返す

  if (Y < 1873) {
    return AD;
  }

  for (var i = 0; i < LEN; i++) {
    var item = ERAS[i];

    if (daily && item.d <= date || !daily && item.y <= Y) {
      return item;
    }
  }

  return AD;
}

},{"../config":5}],21:[function(require,module,exports){
"use strict";

/**
 * *********************************************************
 *           (ユーティリティ関数) ISO週番号取得
 * *********************************************************
 */
var getWeekNumber = require('./getWeekNumber');

module.exports = getISOWeekNumber;
/**
 * ISO週番号
 *   1月&月曜始まり
 *   1月初、12月末は日数が少ない場合に前年・翌年の週番号になる
 * @method getISOWeekNumber
 * @param  {Date}   date
 * @return {Number} ISOWeekNumber
 */

function getISOWeekNumber(date) {
  var wn = getWeekNumber(date, 1, 1);
  var d1_1 = new Date(date.getFullYear(), 0, 1);
  var w1_1 = d1_1.getDay(); // 初週の日数が少ない場合は週番号がひとつ前にずれる

  if (!w1_1 || 4 < w1_1) {
    wn--;
  }

  if (wn === 0) {
    return 53;
  } else if (wn === 53) {
    // 最終週の場合も多いほうの年の週番号とする
    var d12_31 = new Date(date.getFullYear(), 11, 31);
    var w12_31 = d12_31.getDay();
    return w12_31 && w12_31 < 4 ? 1 : wn;
  } else {
    return wn;
  }
}

},{"./getWeekNumber":23}],22:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.concat");

require("core-js/modules/es.array.filter");

require("core-js/modules/es.array.map");

require("core-js/modules/es.array.slice");

require("core-js/modules/es.string.split");

require("core-js/modules/es.string.trim");

/**
 * *********************************************************
 *         (ユーティリティ関数) 週インデックス取得
 * *********************************************************
 */
module.exports = getWeekIndex;
/**
 * dependencies
 */

var CONFIG = require('../config');
/**
 * alias
 */


var WEEK_INDEXES = [].slice.call(CONFIG.JWEEK).concat(CONFIG.WEEK.map(function (w) {
  return w.toLowerCase().slice(0, 3);
})).concat(CONFIG.WEEK.map(function (w) {
  return w.toLowerCase();
})).concat(CONFIG.JWEEK.map(function (w) {
  return w + '曜日';
})).reduce(function (x, y, i) {
  x[y] = i % 7;
  return x;
}, {});
/**
 * 週の文字列からインデックスを返す
 * 配列を渡した場合は、配列で返す
 * 判別できる週の文字列がひとつもない場合はnullを返す
 * カンマ区切りの文字列は配列で返す
 *
 * '日' -> 0,  'sat' -> 6, ['月', '火', '休'] -> [1, 2]
 * '祝' -> null, ['休', '祝'] -> null
 * '土,日' -> [6, 0]
 *
 * @method getWeekIndex
 * @param  {String|Array|Number} week
 * @return {Number|Array}        index
 */

function getWeekIndex(week) {
  if (Array.isArray(week)) {
    var idxes = week.map(function (w) {
      return typeof w === 'string' ? index(w) : null;
    }).filter(function (x) {
      return x !== null;
    });
    return idxes.length ? idxes : null;
  } else if (typeof week === 'string') {
    if (week.indexOf(',') !== -1) {
      return getWeekIndex(week.split(',').map(function (x) {
        return x.trim();
      }));
    } else {
      return index(week);
    }
  } else if (typeof week === 'number') {
    return CONFIG.WEEK.hasOwProperty(week) ? week : null;
  }

  return null;
} // インデックスを返す


function index(w) {
  var idx = WEEK_INDEXES[w.toLowerCase()];
  return typeof idx === 'number' ? idx : null;
}

},{"../config":5,"core-js/modules/es.array.concat":126,"core-js/modules/es.array.filter":127,"core-js/modules/es.array.map":130,"core-js/modules/es.array.slice":131,"core-js/modules/es.string.split":142,"core-js/modules/es.string.trim":143}],23:[function(require,module,exports){
"use strict";

/**
 * *********************************************************
 *            (ユーティリティ関数) 週番号を取得
 * *********************************************************
 */
module.exports = getWeekNumber;
/**
 * alias
 */

var A_DAY = 86400000;
/**
 * @method getWeekNumber
 * @param  {Date}   date
 * @param  {String} startWeek   日:0, 月:1, ...
 * @param  {Number} startMonth  1月:1, 2月:2, ...
 * @return {Number} weekNumber
 */

function getWeekNumber(date, startWeek, startMonth) {
  var y = date.getFullYear();
  var m = date.getMonth();
  y = m < startMonth - 1 ? y - 1 : y; // 年度の補正

  var dx1 = new Date(y, startMonth - 1, 1); // x月1日

  var plus = (dx1.getDay() - startWeek + 7) % 7; // x日1日の前の日数

  var days = (date - dx1) / A_DAY + plus; // そこからのdateまでの日数

  return Math.floor(days / 7) + 1;
}

},{}],24:[function(require,module,exports){
"use strict";

/**
 * *********************************************************
 *       (ユーティリティ関数) 第x week曜日の日にち
 * *********************************************************
 */
module.exports = getXDay;
/**
 * @method getXDay
 * @param  {Number} year
 * @param  {Number} month
 * @param  {Number} x      5以上を指定した場合は最終の指定曜日の日とします
 * @param  {Number} week   0:日, 1:月, ...
 * @return {Date}   date
 */

function getXDay(year, month, x, week) {
  var f = new Date(year, month - 1, 1).getDay(); // 1日のインデックス

  var d1 = 1 + week - f + (week < f ? 7 : 0); // 第1の日にち

  if (4 < x) {
    var days = new Date(year, month, 0).getDate(); // 最終週の場合

    x = parseInt((days - d1) / 7, 10) + 1;
  }

  var day = d1 + (x - 1) * 7; // 第xの日にち

  return new Date(year, month - 1, day);
}

},{}],25:[function(require,module,exports){
"use strict";

require("core-js/modules/es.string.match");

require("core-js/modules/es.string.replace");

/**
 * *********************************************************
 *       (ユーティリティ関数) 口語を日時に変換
 * *********************************************************
 * {Date} fromNow({String} value, {Number} startMonth, {Number} startWeek, {Date} now)
 */
module.exports = fromNow;
/**
 * dependencies
 */

var CONFIG = require('../config');

var getWeekIndex = require('./getWeekIndex');

var suji = require('./suji');

var add = require('./addTerm');

var replace = require('./replaceTerm');
/**
 * alias
 */


var START_MONTH = CONFIG.START_MONTH;
var START_WEEK = getWeekIndex(CONFIG.START_WEEK);
/**
 * 計算式の定義
 *
 * 文字列で日時を表す語や{{num}}{{期間}}{{前|後}}などを定義する
 * 関数を定義した場合はその関数を実行する
 * 文字列を指定した場合は、その定義名と同じ処理を行う
 *
 * 関数のAPI
 *
 * 語の中に数字が存在しない場合
 * @param {Date}   now
 * @param {Number} sm   startMonth
 * @param {Number} sw   startWeek
 * @param {Date}   date
 *
 * 語の中に数字が存在する場合
 * @param {Date}   now
 * @param {Number} x
 * @param {Number} sm   startMonth
 * @param {Number} sw   startWeek
 * @param {Date}   date
 */

var CALC = {
  // ***** 日を表す語
  '今': function _(now) {
    return now;
  },
  'いま': '今',
  'now': '今',
  '今日': function _(now) {
    return trim(now);
  },
  'きょう': '今日',
  '本日': '今日',
  'today': '今日',
  '昨日': function _(now) {
    return add(trim(now), {
      d: -1
    });
  },
  'きのう': '昨日',
  'yesterday': '昨日',
  '明日': function _(now) {
    return add(trim(now), {
      d: 1
    });
  },
  'あす': '明日',
  'あした': '明日',
  'tomorrow': '明日',
  'あさって': function _(now) {
    return add(trim(now), {
      d: 2
    });
  },
  '明後日': 'あさって',
  'おととい': function _(now) {
    return add(trim(now), {
      d: -2
    });
  },
  'おとつい': 'おととい',
  '一昨日': 'おととい',
  // ***** 期間の最初または最後の日を表す語
  '年初': function _(now) {
    return replace(trim(now), {
      m: 1,
      d: 1
    });
  },
  '年頭': '年初',
  '今年初め': '年初',
  '今年始め': '年初',
  '年末': function _(now) {
    return replace(trim(now), {
      m: 12,
      d: 31
    });
  },
  '歳末': '年末',
  '今年末': '年末',
  '来年初め': function _(now) {
    return replaceAdd(trim(now), {
      m: 1,
      d: 1
    }, {
      y: 1
    });
  },
  '来年始め': '来年初め',
  '来年末': function _(now) {
    return replaceAdd(trim(now), {
      m: 12,
      d: 31
    }, {
      y: 1
    });
  },
  '昨年初め': function _(now) {
    return replaceAdd(trim(now), {
      m: 1,
      d: 1
    }, {
      y: -1
    });
  },
  '昨年始め': '昨年初め',
  '昨年末': function _(now) {
    return replaceAdd(trim(now), {
      m: 12,
      d: 31
    }, {
      y: -1
    });
  },
  '年度初め': function _(now, sm) {
    return replace(trim(now), {
      y: y(now) - (m(now) < sm ? 1 : 0),
      m: sm,
      d: 1
    });
  },
  '年度始め': '年度初め',
  '年度頭': '年度初め',
  '年度末': function _(now, sm) {
    return replace(trim(now), {
      y: y(now) + (m(now) < sm ? 0 : 1),
      m: sm,
      d: 0
    });
  },
  '月初': function _(now) {
    return replace(trim(now), {
      d: 1
    });
  },
  '月初め': '月初',
  '月始め': '月初',
  '今月初め': '月初',
  '今月始め': '月初',
  '月末': function _(now) {
    return replace(trim(now), {
      d: d(new Date(y(now), m(now), 0))
    });
  },
  '今月末': '月末',
  '月終わり': '月末',
  '今月終わり': '月末',
  '先月初め': function _(now) {
    return replaceAdd(trim(now), {
      d: 1
    }, {
      m: -1
    });
  },
  '先月始め': '先月初め',
  '先月頭': '先月初め',
  '先月末': function _(now) {
    return replace(trim(now), {
      d: 0
    });
  },
  '先月終わり': '先月末',
  '来月初め': function _(now) {
    return replaceAdd(trim(now), {
      d: 1
    }, {
      m: 1
    });
  },
  '来月始め': '来月初め',
  '来月頭': '来月初め',
  '来月末': function _(now) {
    return addReplace(trim(now), {
      m: 2
    }, {
      d: 0
    });
  },
  '来月終わり': '来月末',
  '週初め': function _(now, sm, sw) {
    return add(trim(now), {
      d: (w(now) - sw + 7) % 7 * -1
    });
  },
  '週初': '週初め',
  '今週初め': '週初め',
  '週開始': '週初め',
  '週末': function _(now, sm, sw) {
    return add(trim(now), {
      d: (w(now) - sw + 7) % 7 * -1 + 6
    });
  },
  '今週末': '週末',
  '週終わり': '週末',
  // ***** 加減をする語
  'x年前': function x(now, _x) {
    return add(trim(now), {
      y: -_x
    });
  },
  'x年後': function x(now, _x2) {
    return add(trim(now), {
      y: _x2
    });
  },
  '半年前': function _(now) {
    return add(trim(now), {
      m: -6
    });
  },
  '半年後': function _(now) {
    return add(trim(now), {
      m: 6
    });
  },
  'ひと月前': function _(now) {
    return add(trim(now), {
      m: -1
    });
  },
  'ひと月後': function _(now) {
    return add(trim(now), {
      m: 1
    });
  },
  'xヶ月前': function x(now, _x3) {
    return add(trim(now), {
      m: -_x3
    });
  },
  'xカ月前': 'xヶ月前',
  'xケ月前': 'xヶ月前',
  'xか月前': 'xヶ月前',
  'xヶ月後': function x(now, _x4) {
    return add(trim(now), {
      m: _x4
    });
  },
  'xカ月後': 'xヶ月後',
  'xケ月後': 'xヶ月後',
  'xか月後': 'xヶ月後',
  'x週間前': function x(now, _x5) {
    return add(trim(now), {
      d: _x5 * -7
    });
  },
  'x週前': 'x週間前',
  'x週間後': function x(now, _x6) {
    return add(trim(now), {
      d: _x6 * 7
    });
  },
  'x週後': 'x週間後',
  'x日前': function x(now, _x7) {
    return add(trim(now), {
      d: -_x7
    });
  },
  'x日後': function x(now, _x8) {
    return add(trim(now), {
      d: _x8
    });
  },
  'x時間前': function x(now, _x9) {
    return add(now, {
      h: -_x9
    });
  },
  'x時間後': function x(now, _x10) {
    return add(now, {
      h: _x10
    });
  },
  'x分前': function x(now, _x11) {
    return add(now, {
      i: -_x11
    });
  },
  'x分後': function x(now, _x12) {
    return add(now, {
      i: _x12
    });
  },
  'x秒前': function x(now, _x13) {
    return add(now, {
      s: -_x13
    });
  },
  'x秒後': function x(now, _x14) {
    return add(now, {
      s: _x14
    });
  },
  'xミリ秒前': function x(now, _x15) {
    return add(now, {
      ms: -_x15
    });
  },
  'xミリ秒後': function x(now, _x16) {
    return add(now, {
      ms: _x16
    });
  },
  // ***** ある月の日を表す語
  '今月x日': function x(now, _x17) {
    return enableDay(trim(now), _x17);
  },
  '今月のx日': '今月x日',
  '先月x日': function x(now, _x18) {
    return enableDay(add(trim(now), {
      m: -1
    }), _x18);
  },
  '先月のx日': '先月x日',
  '来月x日': function x(now, _x19) {
    return enableDay(add(trim(now), {
      m: 1
    }), _x19);
  },
  '来月のx日': '来月x日',
  '先々月x日': function x(now, _x20) {
    return enableDay(add(trim(now), {
      m: -2
    }), _x20);
  },
  '先々月のx日': '先々月x日',
  '再来月x日': function x(now, _x21) {
    return enableDay(add(trim(now), {
      m: 2
    }), _x21);
  },
  '再来月のx日': '再来月x日',
  '今度のx日': function x(now, _x22) {
    return enableDay(add(trim(now), {
      m: d(now) < _x22 ? 0 : 1
    }), _x22);
  },
  '次のx日': '今度のx日',
  '前回のx日': function x(now, _x23) {
    return enableDay(add(trim(now), {
      m: d(now) < _x23 ? -1 : 0
    }), _x23);
  },
  '前のx日': '前回のx日',
  // ***** ある週の曜日を表す語
  '今週日曜日': function _(now, sm, sw) {
    return add(trim(now), {
      d: 0 - w(now) + (0 < sw ? 7 : 0)
    });
  },
  '今週月曜日': function _(now, sm, sw) {
    return add(trim(now), {
      d: 1 - w(now) + (1 < sw ? 7 : 0)
    });
  },
  '今週火曜日': function _(now, sm, sw) {
    return add(trim(now), {
      d: 2 - w(now) + (2 < sw ? 7 : 0)
    });
  },
  '今週水曜日': function _(now, sm, sw) {
    return add(trim(now), {
      d: 3 - w(now) + (3 < sw ? 7 : 0)
    });
  },
  '今週木曜日': function _(now, sm, sw) {
    return add(trim(now), {
      d: 4 - w(now) + (4 < sw ? 7 : 0)
    });
  },
  '今週金曜日': function _(now, sm, sw) {
    return add(trim(now), {
      d: 5 - w(now) + (5 < sw ? 7 : 0)
    });
  },
  '今週土曜日': function _(now) {
    return add(trim(now), {
      d: 6 - w(now)
    });
  },
  '今週の日曜日': '今週日曜日',
  '今週の月曜日': '今週月曜日',
  '今週の火曜日': '今週火曜日',
  '今週の水曜日': '今週水曜日',
  '今週の木曜日': '今週木曜日',
  '今週の金曜日': '今週金曜日',
  '今週の土曜日': '今週土曜日',
  '先週日曜日': function _(now, sm, sw) {
    return add(CALC['今週日曜日'](now, sm, sw), {
      d: -7
    });
  },
  '先週月曜日': function _(now, sm, sw) {
    return add(CALC['今週月曜日'](now, sm, sw), {
      d: -7
    });
  },
  '先週火曜日': function _(now, sm, sw) {
    return add(CALC['今週火曜日'](now, sm, sw), {
      d: -7
    });
  },
  '先週水曜日': function _(now, sm, sw) {
    return add(CALC['今週水曜日'](now, sm, sw), {
      d: -7
    });
  },
  '先週木曜日': function _(now, sm, sw) {
    return add(CALC['今週木曜日'](now, sm, sw), {
      d: -7
    });
  },
  '先週金曜日': function _(now, sm, sw) {
    return add(CALC['今週金曜日'](now, sm, sw), {
      d: -7
    });
  },
  '先週土曜日': function _(now, sm, sw) {
    return add(CALC['今週土曜日'](now, sm, sw), {
      d: -7
    });
  },
  '先週の日曜日': '先週日曜日',
  '先週の月曜日': '先週月曜日',
  '先週の火曜日': '先週火曜日',
  '先週の水曜日': '先週水曜日',
  '先週の木曜日': '先週木曜日',
  '先週の金曜日': '先週金曜日',
  '先週の土曜日': '先週土曜日',
  '来週日曜日': function _(now, sm, sw) {
    return add(CALC['今週日曜日'](now, sm, sw), {
      d: 7
    });
  },
  '来週月曜日': function _(now, sm, sw) {
    return add(CALC['今週月曜日'](now, sm, sw), {
      d: 7
    });
  },
  '来週火曜日': function _(now, sm, sw) {
    return add(CALC['今週火曜日'](now, sm, sw), {
      d: 7
    });
  },
  '来週水曜日': function _(now, sm, sw) {
    return add(CALC['今週水曜日'](now, sm, sw), {
      d: 7
    });
  },
  '来週木曜日': function _(now, sm, sw) {
    return add(CALC['今週木曜日'](now, sm, sw), {
      d: 7
    });
  },
  '来週金曜日': function _(now, sm, sw) {
    return add(CALC['今週金曜日'](now, sm, sw), {
      d: 7
    });
  },
  '来週土曜日': function _(now, sm, sw) {
    return add(CALC['今週土曜日'](now, sm, sw), {
      d: 7
    });
  },
  '来週の日曜日': '来週日曜日',
  '来週の月曜日': '来週月曜日',
  '来週の火曜日': '来週火曜日',
  '来週の水曜日': '来週水曜日',
  '来週の木曜日': '来週木曜日',
  '来週の金曜日': '来週金曜日',
  '来週の土曜日': '来週土曜日',
  '先々週日曜日': function _(now, sm, sw) {
    return add(CALC['今週日曜日'](now, sm, sw), {
      d: -14
    });
  },
  '先々週月曜日': function _(now, sm, sw) {
    return add(CALC['今週月曜日'](now, sm, sw), {
      d: -14
    });
  },
  '先々週火曜日': function _(now, sm, sw) {
    return add(CALC['今週火曜日'](now, sm, sw), {
      d: -14
    });
  },
  '先々週水曜日': function _(now, sm, sw) {
    return add(CALC['今週水曜日'](now, sm, sw), {
      d: -14
    });
  },
  '先々週木曜日': function _(now, sm, sw) {
    return add(CALC['今週木曜日'](now, sm, sw), {
      d: -14
    });
  },
  '先々週金曜日': function _(now, sm, sw) {
    return add(CALC['今週金曜日'](now, sm, sw), {
      d: -14
    });
  },
  '先々週土曜日': function _(now, sm, sw) {
    return add(CALC['今週土曜日'](now, sm, sw), {
      d: -14
    });
  },
  '先々週の日曜日': '先々週日曜日',
  '先々週の月曜日': '先々週月曜日',
  '先々週の火曜日': '先々週火曜日',
  '先々週の水曜日': '先々週水曜日',
  '先々週の木曜日': '先々週木曜日',
  '先々週の金曜日': '先々週金曜日',
  '先々週の土曜日': '先々週土曜日',
  '再来週日曜日': function _(now, sm, sw) {
    return add(CALC['今週日曜日'](now, sm, sw), {
      d: 14
    });
  },
  '再来週月曜日': function _(now, sm, sw) {
    return add(CALC['今週月曜日'](now, sm, sw), {
      d: 14
    });
  },
  '再来週火曜日': function _(now, sm, sw) {
    return add(CALC['今週火曜日'](now, sm, sw), {
      d: 14
    });
  },
  '再来週水曜日': function _(now, sm, sw) {
    return add(CALC['今週水曜日'](now, sm, sw), {
      d: 14
    });
  },
  '再来週木曜日': function _(now, sm, sw) {
    return add(CALC['今週木曜日'](now, sm, sw), {
      d: 14
    });
  },
  '再来週金曜日': function _(now, sm, sw) {
    return add(CALC['今週金曜日'](now, sm, sw), {
      d: 14
    });
  },
  '再来週土曜日': function _(now, sm, sw) {
    return add(CALC['今週土曜日'](now, sm, sw), {
      d: 14
    });
  },
  '再来週の日曜日': '再来週日曜日',
  '再来週の月曜日': '再来週月曜日',
  '再来週の火曜日': '再来週火曜日',
  '再来週の水曜日': '再来週水曜日',
  '再来週の木曜日': '再来週木曜日',
  '再来週の金曜日': '再来週金曜日',
  '再来週の土曜日': '再来週土曜日',
  '今度の日曜日': function _(now) {
    return add(trim(now), {
      d: 7 - w(now)
    });
  },
  '今度の月曜日': function _(now) {
    return add(trim(now), {
      d: (w(now) < 1 ? 0 : 7) + 1 - w(now)
    });
  },
  '今度の火曜日': function _(now) {
    return add(trim(now), {
      d: (w(now) < 2 ? 0 : 7) + 2 - w(now)
    });
  },
  '今度の水曜日': function _(now) {
    return add(trim(now), {
      d: (w(now) < 3 ? 0 : 7) + 3 - w(now)
    });
  },
  '今度の木曜日': function _(now) {
    return add(trim(now), {
      d: (w(now) < 4 ? 0 : 7) + 4 - w(now)
    });
  },
  '今度の金曜日': function _(now) {
    return add(trim(now), {
      d: (w(now) < 5 ? 0 : 7) + 5 - w(now)
    });
  },
  '今度の土曜日': function _(now) {
    return add(trim(now), {
      d: (w(now) < 6 ? 0 : 7) + 6 - w(now)
    });
  },
  '次の日曜日': '今度の日曜日',
  '次の月曜日': '今度の月曜日',
  '次の火曜日': '今度の火曜日',
  '次の水曜日': '今度の水曜日',
  '次の木曜日': '今度の木曜日',
  '次の金曜日': '今度の金曜日',
  '次の土曜日': '今度の土曜日',
  '前回の日曜日': function _(now) {
    return add(trim(now), {
      d: w(now) ? -w(now) : -7
    });
  },
  '前回の月曜日': function _(now) {
    return add(trim(now), {
      d: (1 < w(now) ? 0 : -7) + 1 - w(now)
    });
  },
  '前回の火曜日': function _(now) {
    return add(trim(now), {
      d: (2 < w(now) ? 0 : -7) + 2 - w(now)
    });
  },
  '前回の水曜日': function _(now) {
    return add(trim(now), {
      d: (3 < w(now) ? 0 : -7) + 3 - w(now)
    });
  },
  '前回の木曜日': function _(now) {
    return add(trim(now), {
      d: (4 < w(now) ? 0 : -7) + 4 - w(now)
    });
  },
  '前回の金曜日': function _(now) {
    return add(trim(now), {
      d: (5 < w(now) ? 0 : -7) + 5 - w(now)
    });
  },
  '前回の土曜日': function _(now) {
    return add(trim(now), {
      d: -1 - w(now)
    });
  },
  '前の日曜日': '前回の日曜日',
  '前の月曜日': '前回の月曜日',
  '前の火曜日': '前回の火曜日',
  '前の水曜日': '前回の水曜日',
  '前の木曜日': '前回の木曜日',
  '前の金曜日': '前回の金曜日',
  '前の土曜日': '前回の土曜日'
};
/**
 * 口語から日時を返します
 *
 * nowに仮の現在日時を指定することもできます
 *
 * @param  {String} value
 * @param  {Number} startMonth 既定値: CONFIG.START_MONTH  1...12
 * @param  {Number} startWeek  既定値: CONFIG.START_WEEK   日:0...土:6,
 * @param  {Date}   now        既定値: 現在の日時
 * @return {Date}   date
 */

function fromNow(value, startMonth, startWeek, now) {
  value = value.toLowerCase();
  var sm = typeof startMonth === 'number' ? startMonth : START_MONTH;
  var sw = typeof startWeek === 'number' ? startWeek : START_WEEK;
  now = now || new Date();
  var calc = CALC[value];

  if (calc) {
    return typeof calc === 'function' ? calc(now, sm, sw) : CALC[calc](now, sm, sw);
  } else {
    value = suji(value);
    var r;

    if (r = value.match(/\d+/)) {
      var c = value.replace(r[0], 'x');
      calc = CALC[c];

      if (calc) {
        var x = +r[0];
        return typeof calc === 'function' ? calc(now, x, sm, sw) : CALC[calc](now, x, sm, sw);
      }
    }
  }

  return null;
} // *************************** サポート関数 共通
// 時間を省略


function trim(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
} // 年の取得


function y(date) {
  return date.getFullYear();
} // 月の取得


function m(date) {
  return date.getMonth() + 1;
} // 日の取得


function d(date) {
  return date.getDate();
} // 曜日の取得


function w(date) {
  return date.getDay();
} // 指定した位を加算後に置き換えする


function addReplace(date, value1, value2) {
  return replace(add(date, value1), value2);
} // 指定した位を置き換え後に加算する


function replaceAdd(date, value1, value2) {
  return add(replace(date, value1), value2);
} // *************************** サポート関数 個別
// 日にちの日を置き換えて、月が変わらなかった場合はその日を返し
// 変わってしまう場合はnullを返す


function enableDay(date, d) {
  var val = replace(date, {
    d: d
  });

  if (date.getFullYear() === val.getFullYear() && date.getMonth() === val.getMonth()) {
    return val;
  } else {
    return null;
  }
}

},{"../config":5,"./addTerm":12,"./getWeekIndex":22,"./replaceTerm":26,"./suji":28,"core-js/modules/es.string.match":140,"core-js/modules/es.string.replace":141}],26:[function(require,module,exports){
"use strict";

/**
 * *********************************************************
 *         (ユーティリティ関数) 日時の位を置き換え
 * *********************************************************
 */
module.exports = replaceTerm;
/**
 * 指定した位を置き換えます
 *
 * 年・月のいずれかのみ置き換えを行った場合は、次のルールが適用します
 *
 * 民法第143条 暦による期間の計算
 * 週、月又は年の初めから期間を起算しないときは、その期間は、最後の週、月又は年において
 * その起算日に応当する日の前日に満了する。ただし、月又は年によって期間を定めた場合にお
 * いて、最後の月に応当する日がないときは、その月の末日に満了する。
 *
 * @param  {Date}   date
 * @param  {Object} value
 * @return {Date}   date
 */

function replaceTerm(date, value) {
  var y = value.hasOwnProperty('y') ? value.y : date.getFullYear();
  var m = value.hasOwnProperty('m') ? value.m : date.getMonth() + 1;
  var d = value.hasOwnProperty('d') ? value.d : date.getDate();
  var h = value.hasOwnProperty('h') ? value.h : date.getHours();
  var i = value.hasOwnProperty('i') ? value.i : date.getMinutes();
  var s = value.hasOwnProperty('s') ? value.s : date.getSeconds();
  var ms = value.hasOwnProperty('ms') ? value.ms : date.getMilliseconds();

  if ((value.hasOwnProperty('y') || value.hasOwnProperty('m')) && !value.hasOwnProperty('d') && !value.hasOwnProperty('h') && !value.hasOwnProperty('i') && !value.hasOwnProperty('s') && !value.hasOwnProperty('ms')) {
    d = Math.min(new Date(y, m, 0).getDate(), d);
  }

  return new Date(y, m - 1, d, h, i, s, ms);
}

},{}],27:[function(require,module,exports){
"use strict";

/**
 * *********************************************************
 *           (ユーティリティ関数) 期間の分割
 * *********************************************************
 */
module.exports = separate;
/**
 * dependencies
 */

var START_MONTH = require('../config').START_MONTH;

var addTerm = require('./addTerm');
/**
 * 期間をブロックごとに分割(年度、月、日)します
 *
 * この関数は、年度集計や月次集計されているデータを合算して算出する際に便利です
 * 営業日計算のキャッシュを再利用するのにも使用しています
 *
 * 期間は次のdays,months,yearsのプロパティに配列で設定されます
 *
 *   例えば from:2015-01-29  to:2017-07-02 の場合は次のようになります
 *
 *          3日          2か月       2年         3か月         2日
 *    from          m1           y           m2           d2           to
 *     |---days-1---|--months-1--|---years---|--months-2--|---days-2---|
 * 2015-01-29   2015-02-01   2015-04-01  2017-04-01   2017-07-01   2017-07-2
 *
 * {
 *   days  : [ D2015-01-29, D2015-01-30, D2015-01-31, D2017-07-01, D2017-07-02],
 *   months: [ D2015-02-01, D2015-03-01, D2017-04-01, D2017-05-01, D2017-06-01],
 *   years : [ D2015-04-01, D2016-04-01]
 * }
 *
 * (値は表記上文字列でが、すべてDateオブジェクトです)
 *
 * @method separate
 * @param  {Date}   from
 * @param  {Date}   to
 * @param  {Number} startMonth
 * @return {Object} {
 *                    days   : [days1..., days2...],
 *                    months : [months1..., months2...],
 *                    years  : [years...]
 *                  }
 */


function separate(from, to, startMonth) {
  from = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  to = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1); // 年度の開始月

  var sm = startMonth || START_MONTH; // 結果

  var days = [];
  var months = [];
  var years = []; // from/to Month/Year Start/End/Next

  var fms = new Date(from.getFullYear(), from.getMonth(), 1);
  var fmn = new Date(fms.getFullYear(), fms.getMonth() + 1, 1);
  var fys = new Date(from.getFullYear() - (from.getMonth() + 1 < sm ? 1 : 0), sm - 1, 1);
  var fyn = new Date(fys.getFullYear() + 1, fys.getMonth(), 1);
  var tms = new Date(to.getFullYear(), to.getMonth(), 1);
  var tys = new Date(to.getFullYear() - (to.getMonth() + 1 < sm ? 1 : 0), sm - 1, 1);
  var m1 = !(fms - from) ? fms : fmn < to ? fmn : to;
  var y = !(fys - m1) ? fys : fyn < to ? fyn : tms;
  var m2 = y < tys ? tys : y;
  var d2 = m2 < tms ? tms : m2;
  var v = addTerm(from, {}); // days 1     from <=> m1

  while (v < m1) {
    days.push(v);
    v = addTerm(v, {
      d: 1
    });
  } // months 1   m1 <==> y


  while (v < y) {
    months.push(v);
    v = addTerm(v, {
      m: 1
    });
  } // years 1    y <==> m2


  while (v < m2) {
    years.push(v);
    v = addTerm(v, {
      y: 1
    });
  } // months 2  m2 <==> d2


  while (v < d2) {
    months.push(v);
    v = addTerm(v, {
      m: 1
    });
  } // days 2    d2 <==> to


  while (v < to) {
    days.push(v);
    v = addTerm(v, {
      d: 1
    });
  }

  var rtn = {
    years: years,
    months: months,
    days: days
  };
  return rtn;
}

},{"../config":5,"./addTerm":12}],28:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.concat");

require("core-js/modules/es.array.join");

require("core-js/modules/es.array.map");

require("core-js/modules/es.array.slice");

require("core-js/modules/es.string.replace");

require("core-js/modules/es.string.split");

/**
 * *********************************************************
 *             (ユーティリティ関数) 数字変換
 * *********************************************************
 */
module.exports = suji;
/**
 * alias
 */

var JNUM = '〇,一,二,三,四,五,六,七,八,九'.split(',');
var ZNUM = '０,１,２,３,４,５,６,７,８,９'.split(',');
var ZNUM_REG = /０|１|２|３|４|５|６|７|８|９/g;
var ALL_NUM = [].slice.call(JNUM).concat(ZNUM);
var DIGIT = /0|\d+/g;
/**
 * 数字を漢数字・漢字・全角に変更します
 *
 * 文字列は漢数字・漢字・全角に変更後とみなし、逆に数字に変更します
 *
 * 第二引数による動作の違いは以下のとおり
 *         0  3    10    15    20     24      63        1998        2000      2015
 * 漢数字: 〇 三   十   十五  二十  二十四  六十三  千九百九十八    二千    二千十五
 * 漢字  : 〇 三  一〇  一五  二〇   二四    六三    一九九八     二〇〇〇  二〇一五
 * 全角  : ０ ３  １０  １５  ２０   ２４    ６３    １９９８     ２０００  ２０１５
 *
 * またどちらの場合も半角数字に序数を追加する事もできます
 *
 *
 * @method suji
 * @param  {Number|String} num
 * @param  {String}        type
 * @return {String|Number} suji
 */

function suji(num, type) {
  if (typeof num === 'string') {
    switch (type) {
      case '漢数字':
        return num.replace(DIGIT, function (x) {
          return kansuji(+x);
        });

      case '漢字':
        return num.replace(DIGIT, function (x) {
          return kanji(+x);
        });

      case '全角':
        return num.replace(DIGIT, function (x) {
          return zenkaku(+x);
        });

      case '半角':
        return num.replace(ZNUM_REG, function (x) {
          return ZNUM.indexOf(x);
        });

      case '序数':
        if (/^0+$/.test(num)) {
          return num + 'th';
        }

        return num.replace(DIGIT, function (x) {
          return x === '0' ? '0' : josu(+x);
        });

      default:
        return reverse(num);
    }
  } else if (typeof num === 'number') {
    switch (type) {
      case '漢数字':
        return kansuji(num);

      case '漢字':
        return kanji(num);

      case '全角':
        return zenkaku(num);

      case '序数':
        return josu(num);

      default:
        return '' + num;
    }
  } else {
    return '';
  }
}
/**
 * 漢数字 (0から9999まで対応)
 * @method kansuji
 * @param  {Number} num
 * @return {String} suji
 */


function kansuji(num) {
  if (num === 0) {
    return '〇';
  } else if (num < 0 || 9999 < num) {
    return '';
  }

  var kurai = ('0000' + num).slice(-4).split('');
  var s = kurai[0] * 1;
  var h = kurai[1] * 1;
  var j = kurai[2] * 1;
  var i = kurai[3] * 1;
  return (s === 0 ? '' : s === 1 ? '千' : JNUM[s] + '千') + (h === 0 ? '' : h === 1 ? '百' : JNUM[h] + '百') + (j === 0 ? '' : j === 1 ? '十' : JNUM[j] + '十') + (i === 0 ? '' : JNUM[i]);
}
/**
 * 漢字
 * @method kanji
 * @param  {Number} num
 * @return {String} suji
 */


function kanji(num) {
  return ('' + num).split('').map(function (x) {
    return JNUM[x * 1];
  }).join('');
}
/**
 * 全角
 * @method zenkaku
 * @param  {Number} num
 * @return {String} suji
 */


function zenkaku(num) {
  return ('' + num).split('').map(function (x) {
    return ZNUM[x * 1];
  }).join('');
}
/**
 * 漢数字・漢字・全角を半角数字に変換
 * @method reverse
 * @param  {String} value
 * @return {String} value
 */


function reverse(value) {
  var r = '';
  var stack = null;
  var num = null;
  var a = (value + 'E').split('');

  for (var i = 0, j = a.length - 1; i <= j; i++) {
    var x = a[i];

    switch (x) {
      case '千':
        stack = (stack || 0) + (num || 1) * 1000;
        num = null;
        break;

      case '百':
        stack = (stack || 0) + (num || 1) * 100;
        num = null;
        break;

      case '十':
        stack = (stack || 0) + (num || 1) * 10;
        num = null;
        break;

      default:
        var idx = ALL_NUM.indexOf(x);

        if (idx === -1) {
          if (stack !== null || num !== null) {
            r += (stack || 0) + (num || 0);
            stack = null;
            num = null;
          }

          if (i !== j) {
            r += x;
          }
        } else {
          if (num === 0) {
            r += '0';
          }

          num = (num || 0) * 10 + idx % 10;
        }

        break;
    }
  }

  return r;
}
/**
 * 序数
 * @method josu
 * @param  {Number} num
 * @return {String} suji
 */


function josu(num) {
  // 10-19, 110-119, 210-219...
  if (parseInt(num % 100 / 10, 10) === 1) {
    return num + 'th';
  }

  switch (num % 10) {
    case 1:
      return num + 'st';

    case 2:
      return num + 'nd';

    case 3:
      return num + 'rd';

    default:
      return num + 'th';
  }
}

},{"core-js/modules/es.array.concat":126,"core-js/modules/es.array.join":129,"core-js/modules/es.array.map":130,"core-js/modules/es.array.slice":131,"core-js/modules/es.string.replace":141,"core-js/modules/es.string.split":142}],29:[function(require,module,exports){
"use strict";

/**
 * *********************************************************
 *           (ユーティリティメソッド) 日時取得
 * *********************************************************
 */
module.exports = toDate;
/**
 * dependencies
 */

var toDatetime = require('./toDatetime');
/**
 * できる限り日時を判別しDateオブジェクトを作成する関数
 *
 * skipTrimにtrueをした場合は、Dateオブジェクトの場合に時以下の切り捨てをしません
 *
 * @param  {Date|String|Array|Number|Object} date
 * @param  {Number}                          startMonth
 * @return {Date}                            date
 */


function toDate(date, startMonth) {
  date = toDatetime(date, startMonth);
  return date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()) : null;
}

},{"./toDatetime":30}],30:[function(require,module,exports){
"use strict";

require("core-js/modules/es.symbol");

require("core-js/modules/es.symbol.description");

require("core-js/modules/es.symbol.iterator");

require("core-js/modules/es.array.iterator");

require("core-js/modules/es.array.join");

require("core-js/modules/es.array.slice");

require("core-js/modules/es.number.constructor");

require("core-js/modules/es.number.is-nan");

require("core-js/modules/es.object.keys");

require("core-js/modules/es.object.to-string");

require("core-js/modules/es.regexp.constructor");

require("core-js/modules/es.regexp.to-string");

require("core-js/modules/es.string.iterator");

require("core-js/modules/es.string.match");

require("core-js/modules/es.string.replace");

require("core-js/modules/es.string.trim");

require("core-js/modules/web.dom-collections.for-each");

require("core-js/modules/web.dom-collections.iterator");

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/**
 * *********************************************************
 *           (ユーティリティメソッド) 日時取得
 * *********************************************************
 */

/*eslint no-irregular-whitespace:0*/
module.exports = toDatetime;
/**
 * 引数をできるだけ解釈してDateオブジェクトに変更します
 * new Date(y, m, d)では1月は0ですが、この関数では月を数字で指定する場合は1です
 *
 * 対応フォーマットは次のとおりです
 *  2015-6-1
 *  2015-06-01
 *  2015.6.1
 *  2015.06.01
 *  2015/6/1
 *  2015/06/01
 *  2015年6月1日
 *  平成27年6月1日
 *  平成二十七年六月二十三日
 *  H27.6.1
 *
 *  2015-6-1 14:20
 *  2015-6-1 14:20:30
 *  2015-6-1 14:20:30.888
 *  2015-6-1 pm2:20
 *  2015年6月1日 午後2時20分
 *  2015年6月1日 午後2時
 *
 *  14:20
 *  午後二時
 *
 *  2015
 *  2015年
 *  2015-9
 *  2015年9月
 *
 *  8-16
 *  8月16日
 *
 *  2015年6月末日
 *  6月末日
 *
 * 年・月・日がすべて設定されておらず、時間のみの指定の場合は本日とします
 * 年が不定の場合は、本年度とします
 * 月が不定の場合は、開始月とします
 * 日が不定の場合は、1日とします
 * 時が不定の場合は、0時とします
 * 分が不定の場合は、0分とします
 * 秒が不定の場合は、0秒とします
 *
 * 次の4つの方法で指定できます
 *
 *   1, Date         通常はそのまま返します。例外としてInvalid Dateはnullに変更します
 *   2. 数字         YYYYMMDDHHIISS のフォーマットとみなします
 *                   桁が足りない場合はMM以下が省略されている解釈します
 *                   西暦1000年未満の日時は数字では指定できないため、文字列にします
 *   3, 文字列       和暦、漢数字、全角数字、時刻表記に対応します
 *                   時刻のみの場合は日付の部分は本日です
 *   4, 配列         [年, 月, 日, 時, 分, 秒, ミリ秒]
 *                   月以降省略することができます
 *   5. オブジェクト 年月日時分秒ミリ秒のプロパティを持ったオブジェクトと解釈します
 *
 * 数字,文字列の方法で指定した場合は、存在する日時を指定したのかを確認します
 * 配列,オブジェクトの場合は各位が繰り上げ、繰り下げを行います
 *
 * @method toDatetime
 * @param  {Date|String|Array|Number|Object} value
 * @param  {Boolean}                         startMonth 既定値:CONFIG.START_MONTH
 * @return {Date}                            date
 */

/**
 * dependencies
 */

var CONFIG = require('../../lib/config');

var suji = require('../../lib/utils/suji');
/**
 * alias
 */


var ERAS = CONFIG.ERAS;
var TERM = CONFIG.TERM;
var ERA_MAP = ERAS.reduce(function (x, era, i) {
  x[era.N] = ERAS[i];
  x[era.n] = ERAS[i];
  return x;
}, {});
var REG_ERA = new RegExp('^(' + Object.keys(ERA_MAP).join('|') + ')(元|\\d+)(\\D)');
var REG_AMPM = /(am|pm|午前|午後)(\d+)/i;
var BASE_FORMAT = /^(\d{1,4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?(?:(?:(?: ?GMT)?([+-]\d{1,2}):?(\d{2})?)|(Z))?)?$/;
var YYYYMM1 = /^(\d{4})[-\/\.](\d{1,2})$/;
var YYYYMM2 = /^(\d{4})年(?:(\d{1,2})月)?$/;
var YYYYMMDD = /^(\d{4})年(?:(\d{1,2})月(?:(\d{1,2}|末)日)?)?/;
var MMDD1 = /^(\d{1,2})[-\/\.](\d{1,2})?/;
var MMDD2 = /^(\d{1,2})月(\d{1,2}|末)日/;
var HHIISSsss = /[ 　]*(\d{1,2})[:時](?:(\d{1,2})[:分]?(?:(\d{1,2})(?:\.(\d{1,3}))?秒?)?)?$/;
var NOT_DIGIT = /\D/;

function toDatetime(value, startMonth) {
  var sm = startMonth || CONFIG.START_MONTH; // Dateオブジェクト

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value; // 省略時はnull
  } else if (!value) {
    return null;
  }

  switch (_typeof(value)) {
    case 'number':
      return numberToDate('' + value, sm);

    case 'string':
      return value.match(NOT_DIGIT) ? stringToDate(value, sm) : numberToDate(value, sm);

    case 'object':
      return Array.isArray(value) ? arrayToDate(value, sm) : objectToDate(value, sm);

    default:
      return null;
  }
} // **************************************************************** 数字 => 日時

/**
 * 4-14桁の数字を日時として取り扱う
 *
 *  YYYYMMDDHHIISS
 *
 * MM以下を省略する事ができます
 *
 *  YYYY:
 *  MM  : startMonth
 *  DD  : 1日
 *  HH  : 0時
 *  II  : 0分
 *  SS  : 0秒
 *
 * @method numberToDate
 * @param  {String} value
 * @param  {NUmber} startMonth
 * @return {Date}   date
 */


function numberToDate(value, startMonth) {
  return getValidDate(+value.slice(0, 4), +value.slice(4, 6) || startMonth, +value.slice(6, 8) || 1, +value.slice(8, 10), +value.slice(10, 12), +value.slice(12, 14), 0);
} // ************************************************************** 文字列 => 日時


function stringToDate(value, sm) {
  value = value.trim();
  var r,
      y,
      m,
      d,
      h = 0,
      i = 0,
      s = 0,
      ms = 0,
      len = 0;

  if (r = value.match(BASE_FORMAT)) {
    return baseToDate(r);
  } // 変換


  value = replace(value);

  if (r = value.match(BASE_FORMAT)) {
    return baseToDate(r);
  } // 年+月のみ


  if (r = value.match(YYYYMM1) || value.match(YYYYMM2)) {
    return getValidDate(+r[1], +(r[2] || sm), 1, 0, 0, 0, 0);
  }

  var now = new Date();
  var timeskip = false;

  if (r = value.match(YYYYMMDD)) {
    y = +r[1];
    m = +(r[2] || sm);
    d = r[3] === '末' ? new Date(y, m, 0).getDate() : +(r[3] || 1);
    len = r[0].length;
    timeskip = !r[3];
  } else if (r = value.match(MMDD1) || value.match(MMDD2)) {
    m = +r[1];
    y = now.getFullYear() + (m < sm ? 1 : 0);
    d = r[2] === '末' ? new Date(y, m, 0).getDate() : +r[2];
    len = r[0].length;
  } else {
    y = now.getFullYear();
    m = now.getMonth() + 1;
    d = now.getDate();
  }

  if (r = value.match(HHIISSsss)) {
    h = +r[1];
    i = +(r[2] || 0);
    s = +(r[3] || 0);
    ms = +(r[4] ? (r[4] + '00').slice(0, 3) : 0);
    len += timeskip ? 0 : r[0].length;
  }

  return value.length === len ? getValidDate(y, m, d, h, i, s, ms) : null;
}
/**
 * 推奨フォーマットの日時をDateオブジェクトにする
 * @param  {Array} r
 * @return {Date}  date
 */


function baseToDate(r) {
  var ms = r[7] ? (r[7] + '00').slice(0, 3) : 0;
  var date = getValidDate(+r[1], +r[2], +r[3], +(r[4] || 0), +(r[5] || 0), +(r[6] || 0), +ms);

  if (date) {
    // GMT+h:mm
    if (r[8]) {
      var h = +r[8];
      var m = +(r[9] || 0);

      if (-12 <= h && h <= 12 && 0 <= m && m < 60) {
        var diff = date.getTimezoneOffset() + (h * 60 + m);
        date.setTime(date.getTime() - diff * 60000);
      } else {
        date = null;
      } // Z

    } else if (r[10]) {
      date.setTime(date.getTime() - date.getTimezoneOffset() * 60000);
    }
  }

  return date;
}
/**
 * 漢数字、漢字、全角文字・和暦・午前・午後を半角数字に変換
 * @param  {String} value
 * @return {String} value
 */


function replace(value) {
  // 漢数字、漢字、全角文字を半角数字に変換
  value = suji(value); // 和暦時西暦に変換

  value = value.replace(REG_ERA, function (x, g, n, af) {
    var era = ERA_MAP[g];
    return '' + (era.y + (n === '元' ? 1 : +n) - 1) + af;
  }); // 午前午後を24時間表記に変換

  value = value.replace(REG_AMPM, function (x, ampm, n) {
    var pm = ampm === '午後' || ampm.toLowerCase() === 'pm';
    return pm ? +n + 12 : n;
  });
  return value;
} // **************************************************************** 配列 => 日時

/**
 * 配列を日時にします
 * 値が数字でない場合や、8つ以上の要素が存在する場合はnullを返します
 * 存在しない日時でも繰り上げ、繰り下げを行います
 * @param  {Array}  value
 * @param  {Number} sm
 * @return {Date}   date
 */


function arrayToDate(value, sm) {
  var v = [0, sm, 1, 0, 0, 0, 0];
  var err = false;
  value.forEach(function (x, i) {
    if (i === 7 || typeof x !== 'number') {
      err = true;
    } else {
      v[i] = x;
    }
  });
  return err ? null : new Date(v[0], v[1] - 1, v[2], v[3], v[4], v[5], v[6]);
} // ******************************************************** オブジェクト => 日時

/**
 * CONFIG.TERMに設定されているキーと値に数字を設定したオブジェクトを
 * 日時にします
 * 存在しない日時でも繰り上げ、繰り下げを行います
 * 存在しないtermや同じtermのキーを使用したり値が数字でない場合はnullを返します
 *
 * @param  {Object} value
 * @param  {Number} sm
 * @return {Date}   date
 */


function objectToDate(value, sm) {
  var d = Object.keys(value).reduce(function (x, k) {
    var term = TERM[k.toLowerCase()];
    var v = value[k];

    if (term && !(term in x) && typeof v === 'number') {
      x[term] = v;
    } else {
      x.err = true;
    }

    return x;
  }, {});

  if (d.err) {
    return null;
  }

  var td = new Date();

  if (!('y' in d) && !('m' in d) && !('d' in d)) {
    d.y = td.getFullYear();
    d.m = td.getMonth() + 1;
    d.d = td.getDate();
  }

  var month = 'm' in d ? d.m : sm;
  var year = 'y' in d ? d.y : td.getFullYear() - (month < sm ? 1 : 0);
  return new Date(year, month - 1, 'd' in d ? d.d : 1, 'h' in d ? d.h : 0, 'i' in d ? d.i : 0, 's' in d ? d.s : 0, 'ms' in d ? d.ms : 0);
} // ******************************************************** 存在する日時かを確認

/**
 * @param  {Number} y
 * @param  {Number} mh
 * @param  {Number} d
 * @param  {Number} h
 * @param  {Number} m
 * @param  {Number} s
 * @param  {Number} ms
 * @return {Date}   date
 */


function getValidDate(y, m, d, h, i, s, ms) {
  var date = new Date(y, m - 1, d, h, i, s, ms);

  if (y === date.getFullYear() && m === date.getMonth() + 1 && d === date.getDate() && h === date.getHours() && i === date.getMinutes() && s === date.getSeconds() && ms === date.getMilliseconds()) {
    return date;
  } else {
    return null;
  }
}

},{"../../lib/config":5,"../../lib/utils/suji":28,"core-js/modules/es.array.iterator":128,"core-js/modules/es.array.join":129,"core-js/modules/es.array.slice":131,"core-js/modules/es.number.constructor":133,"core-js/modules/es.number.is-nan":134,"core-js/modules/es.object.keys":135,"core-js/modules/es.object.to-string":136,"core-js/modules/es.regexp.constructor":137,"core-js/modules/es.regexp.to-string":138,"core-js/modules/es.string.iterator":139,"core-js/modules/es.string.match":140,"core-js/modules/es.string.replace":141,"core-js/modules/es.string.trim":143,"core-js/modules/es.symbol":146,"core-js/modules/es.symbol.description":144,"core-js/modules/es.symbol.iterator":145,"core-js/modules/web.dom-collections.for-each":147,"core-js/modules/web.dom-collections.iterator":148}],31:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.join");

require("core-js/modules/es.array.map");

require("core-js/modules/es.object.keys");

/**
 * *********************************************************
 *       (ユーティリティ関数) フォーマットを文字列化
 * *********************************************************
 */
module.exports = buildFormat;
var OPTIONS = {
  tanshuku: '短縮',
  gannen: '元年',
  kansujiFull: '漢数字フル',
  kansuji: '漢数字',
  zenkaku: '全角',
  escape: 'エスケープ'
};
/**
 * {
 *   v: [{p:'YYYY'}, '年', {p:'MM'}, '月', {p:'DD'}, '日(', {p:'W', o:1}, ')'],
 *   o: {kansuji: true}
 * }
 *  => {YYYY}年{MM}月{DD}日({W>1})>>漢数字
 * @param  {Object} format
 * @return {String}
 */

function buildFormat(format) {
  return format.v.map(function (x) {
    return typeof x === 'string' ? x : '{' + x.p + ('o' in x ? '>' + x.o : '') + '}';
  }).join('') + (format.o ? '>>' + Object.keys(format.o).map(function (x) {
    return OPTIONS[x];
  }).join('') : '');
}

},{"core-js/modules/es.array.join":129,"core-js/modules/es.array.map":130,"core-js/modules/es.object.keys":135}],32:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.concat");

require("core-js/modules/es.array.join");

require("core-js/modules/es.array.map");

require("core-js/modules/es.object.keys");

require("core-js/modules/es.string.split");

/**
 * *********************************************************
 *       (ユーティリティ関数) 定休日のビルド
 * *********************************************************
 */
module.exports = toStringRegularHoliday;

var CONFIG = require('../config');
/**
 * 定休日をビルドする
 * {
 *   week : {'0': true, '6': true},
 *   day  : {'20': true, '30': true},
 *   xweek: {'2-2': true, '3-2': true}
 * } ->
 * '日, 土, 20, 30, 2火, 3火'
 *
 * @param  {Object} value
 * @return {String}
 */


function toStringRegularHoliday(value) {
  if (typeof value === 'function') {
    return value;
  }

  var weeks = Object.keys(value.week).map(function (x) {
    return CONFIG.JWEEK[x];
  });
  var days = Object.keys(value.day);
  var xweeks = Object.keys(value.xweek).map(function (x) {
    var sp = x.split('-');
    return sp[0] + CONFIG.JWEEK[sp[1]];
  });
  return [].concat(weeks).concat(days).concat(xweeks).join(', ') || null;
}

},{"../config":5,"core-js/modules/es.array.concat":126,"core-js/modules/es.array.join":129,"core-js/modules/es.array.map":130,"core-js/modules/es.object.keys":135,"core-js/modules/es.string.split":142}],33:[function(require,module,exports){
"use strict";

require("core-js/modules/es.array.join");

require("core-js/modules/es.array.map");

require("core-js/modules/es.array.slice");

require("core-js/modules/es.object.keys");

/**
 * *********************************************************
 *       (ユーティリティ関数) 休業期間の文字列化
 * *********************************************************
 */
module.exports = toStringSeasonHoliday;
/**
 * {
 *  '1229': '年末年始のお休み',
 *  '1230': '年末年始のお休み',
 *  '1231': '年末年始のお休み',
 *  '101' : '年末年始のお休み',
 *  '102' : '年末年始のお休み',
 *  '103' : '年末年始のお休み',
 *  '816' : 'お盆のお休み',
 *  '817' : 'お盆のお休み',
 *  '818' : 'お盆のお休み',
 *  '1010': '創立記念日'
 * } ->
 * 年末年始のお休み 1/1, 1/2, 1/3, お盆のお休み 8/16, 8/17, 8/18,
 * 創立記念日 10/10, 年末年始のお休み 12/29, 12/30, 12/31
 *
 * @param  {Object} value
 * @return {String}
 */

function toStringSeasonHoliday(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'function') {
    return value;
  }

  var cause = null;
  return Object.keys(value).map(function (x) {
    if (value[x] === cause) {
      return [+x.slice(0, x.length - 2), '/', +x.slice(-2)].join('');
    } else {
      cause = value[x];
      return [cause, ' ', +x.slice(0, x.length - 2), '/', +x.slice(-2)].join('');
    }
  }).join(', ');
}

},{"core-js/modules/es.array.join":129,"core-js/modules/es.array.map":130,"core-js/modules/es.array.slice":131,"core-js/modules/es.object.keys":135}],34:[function(require,module,exports){
(function (global){
'use strict';

// compare and isBuffer taken from https://github.com/feross/buffer/blob/680e9e5e488f22aac27599a57dc844a6315928dd/index.js
// original notice:

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
function compare(a, b) {
  if (a === b) {
    return 0;
  }

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break;
    }
  }

  if (x < y) {
    return -1;
  }
  if (y < x) {
    return 1;
  }
  return 0;
}
function isBuffer(b) {
  if (global.Buffer && typeof global.Buffer.isBuffer === 'function') {
    return global.Buffer.isBuffer(b);
  }
  return !!(b != null && b._isBuffer);
}

// based on node assert, original notice:

// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util/');
var hasOwn = Object.prototype.hasOwnProperty;
var pSlice = Array.prototype.slice;
var functionsHaveNames = (function () {
  return function foo() {}.name === 'foo';
}());
function pToString (obj) {
  return Object.prototype.toString.call(obj);
}
function isView(arrbuf) {
  if (isBuffer(arrbuf)) {
    return false;
  }
  if (typeof global.ArrayBuffer !== 'function') {
    return false;
  }
  if (typeof ArrayBuffer.isView === 'function') {
    return ArrayBuffer.isView(arrbuf);
  }
  if (!arrbuf) {
    return false;
  }
  if (arrbuf instanceof DataView) {
    return true;
  }
  if (arrbuf.buffer && arrbuf.buffer instanceof ArrayBuffer) {
    return true;
  }
  return false;
}
// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

var regex = /\s*function\s+([^\(\s]*)\s*/;
// based on https://github.com/ljharb/function.prototype.name/blob/adeeeec8bfcc6068b187d7d9fb3d5bb1d3a30899/implementation.js
function getName(func) {
  if (!util.isFunction(func)) {
    return;
  }
  if (functionsHaveNames) {
    return func.name;
  }
  var str = func.toString();
  var match = str.match(regex);
  return match && match[1];
}
assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  } else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = getName(stackStartFunction);
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function truncate(s, n) {
  if (typeof s === 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}
function inspect(something) {
  if (functionsHaveNames || !util.isFunction(something)) {
    return util.inspect(something);
  }
  var rawname = getName(something);
  var name = rawname ? ': ' + rawname : '';
  return '[Function' +  name + ']';
}
function getMessage(self) {
  return truncate(inspect(self.actual), 128) + ' ' +
         self.operator + ' ' +
         truncate(inspect(self.expected), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'deepStrictEqual', assert.deepStrictEqual);
  }
};

function _deepEqual(actual, expected, strict, memos) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;
  } else if (isBuffer(actual) && isBuffer(expected)) {
    return compare(actual, expected) === 0;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if ((actual === null || typeof actual !== 'object') &&
             (expected === null || typeof expected !== 'object')) {
    return strict ? actual === expected : actual == expected;

  // If both values are instances of typed arrays, wrap their underlying
  // ArrayBuffers in a Buffer each to increase performance
  // This optimization requires the arrays to have the same type as checked by
  // Object.prototype.toString (aka pToString). Never perform binary
  // comparisons for Float*Arrays, though, since e.g. +0 === -0 but their
  // bit patterns are not identical.
  } else if (isView(actual) && isView(expected) &&
             pToString(actual) === pToString(expected) &&
             !(actual instanceof Float32Array ||
               actual instanceof Float64Array)) {
    return compare(new Uint8Array(actual.buffer),
                   new Uint8Array(expected.buffer)) === 0;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else if (isBuffer(actual) !== isBuffer(expected)) {
    return false;
  } else {
    memos = memos || {actual: [], expected: []};

    var actualIndex = memos.actual.indexOf(actual);
    if (actualIndex !== -1) {
      if (actualIndex === memos.expected.indexOf(expected)) {
        return true;
      }
    }

    memos.actual.push(actual);
    memos.expected.push(expected);

    return objEquiv(actual, expected, strict, memos);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b, strict, actualVisitedObjects) {
  if (a === null || a === undefined || b === null || b === undefined)
    return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b))
    return a === b;
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b))
    return false;
  var aIsArgs = isArguments(a);
  var bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b, strict);
  }
  var ka = objectKeys(a);
  var kb = objectKeys(b);
  var key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length !== kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] !== kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key], strict, actualVisitedObjects))
      return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

assert.notDeepStrictEqual = notDeepStrictEqual;
function notDeepStrictEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'notDeepStrictEqual', notDeepStrictEqual);
  }
}


// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  }

  try {
    if (actual instanceof expected) {
      return true;
    }
  } catch (e) {
    // Ignore.  The instanceof check doesn't work for arrow functions.
  }

  if (Error.isPrototypeOf(expected)) {
    return false;
  }

  return expected.call({}, actual) === true;
}

function _tryBlock(block) {
  var error;
  try {
    block();
  } catch (e) {
    error = e;
  }
  return error;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (typeof block !== 'function') {
    throw new TypeError('"block" argument must be a function');
  }

  if (typeof expected === 'string') {
    message = expected;
    expected = null;
  }

  actual = _tryBlock(block);

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  var userProvidedMessage = typeof message === 'string';
  var isUnwantedException = !shouldThrow && util.isError(actual);
  var isUnexpectedException = !shouldThrow && actual && !expected;

  if ((isUnwantedException &&
      userProvidedMessage &&
      expectedException(actual, expected)) ||
      isUnexpectedException) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws(true, block, error, message);
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
  _throws(false, block, error, message);
};

assert.ifError = function(err) { if (err) throw err; };

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"util/":37}],35:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],36:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],37:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":36,"_process":149,"inherits":35}],38:[function(require,module,exports){
module.exports = function (it) {
  if (typeof it != 'function') {
    throw TypeError(String(it) + ' is not a function');
  } return it;
};

},{}],39:[function(require,module,exports){
var UNSCOPABLES = require('../internals/well-known-symbol')('unscopables');
var create = require('../internals/object-create');
var hide = require('../internals/hide');
var ArrayPrototype = Array.prototype;

// Array.prototype[@@unscopables]
// https://tc39.github.io/ecma262/#sec-array.prototype-@@unscopables
if (ArrayPrototype[UNSCOPABLES] == undefined) {
  hide(ArrayPrototype, UNSCOPABLES, create(null));
}

// add a key to Array.prototype[@@unscopables]
module.exports = function (key) {
  ArrayPrototype[UNSCOPABLES][key] = true;
};

},{"../internals/hide":71,"../internals/object-create":86,"../internals/well-known-symbol":123}],40:[function(require,module,exports){
'use strict';
var codePointAt = require('../internals/string-at');

// `AdvanceStringIndex` abstract operation
// https://tc39.github.io/ecma262/#sec-advancestringindex
module.exports = function (S, index, unicode) {
  return index + (unicode ? codePointAt(S, index, true).length : 1);
};

},{"../internals/string-at":113}],41:[function(require,module,exports){
var isObject = require('../internals/is-object');

module.exports = function (it) {
  if (!isObject(it)) {
    throw TypeError(String(it) + ' is not an object');
  } return it;
};

},{"../internals/is-object":79}],42:[function(require,module,exports){
'use strict';
var nativeForEach = [].forEach;
var internalForEach = require('../internals/array-methods')(0);

var SLOPPY_METHOD = require('../internals/sloppy-array-method')('forEach');

// `Array.prototype.forEach` method implementation
// https://tc39.github.io/ecma262/#sec-array.prototype.foreach
module.exports = SLOPPY_METHOD ? function forEach(callbackfn /* , thisArg */) {
  return internalForEach(this, callbackfn, arguments[1]);
} : nativeForEach;

},{"../internals/array-methods":45,"../internals/sloppy-array-method":111}],43:[function(require,module,exports){
var toIndexedObject = require('../internals/to-indexed-object');
var toLength = require('../internals/to-length');
var toAbsoluteIndex = require('../internals/to-absolute-index');

// `Array.prototype.{ indexOf, includes }` methods implementation
// false -> Array#indexOf
// https://tc39.github.io/ecma262/#sec-array.prototype.indexof
// true  -> Array#includes
// https://tc39.github.io/ecma262/#sec-array.prototype.includes
module.exports = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = toIndexedObject($this);
    var length = toLength(O.length);
    var index = toAbsoluteIndex(fromIndex, length);
    var value;
    // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare
    if (IS_INCLUDES && el != el) while (length > index) {
      value = O[index++];
      // eslint-disable-next-line no-self-compare
      if (value != value) return true;
    // Array#indexOf ignores holes, Array#includes - not
    } else for (;length > index; index++) if (IS_INCLUDES || index in O) {
      if (O[index] === el) return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

},{"../internals/to-absolute-index":115,"../internals/to-indexed-object":116,"../internals/to-length":118}],44:[function(require,module,exports){
var fails = require('../internals/fails');
var SPECIES = require('../internals/well-known-symbol')('species');

module.exports = function (METHOD_NAME) {
  return !fails(function () {
    var array = [];
    var constructor = array.constructor = {};
    constructor[SPECIES] = function () {
      return { foo: 1 };
    };
    return array[METHOD_NAME](Boolean).foo !== 1;
  });
};

},{"../internals/fails":63,"../internals/well-known-symbol":123}],45:[function(require,module,exports){
var bind = require('../internals/bind-context');
var IndexedObject = require('../internals/indexed-object');
var toObject = require('../internals/to-object');
var toLength = require('../internals/to-length');
var arraySpeciesCreate = require('../internals/array-species-create');

// `Array.prototype.{ forEach, map, filter, some, every, find, findIndex }` methods implementation
// 0 -> Array#forEach
// https://tc39.github.io/ecma262/#sec-array.prototype.foreach
// 1 -> Array#map
// https://tc39.github.io/ecma262/#sec-array.prototype.map
// 2 -> Array#filter
// https://tc39.github.io/ecma262/#sec-array.prototype.filter
// 3 -> Array#some
// https://tc39.github.io/ecma262/#sec-array.prototype.some
// 4 -> Array#every
// https://tc39.github.io/ecma262/#sec-array.prototype.every
// 5 -> Array#find
// https://tc39.github.io/ecma262/#sec-array.prototype.find
// 6 -> Array#findIndex
// https://tc39.github.io/ecma262/#sec-array.prototype.findIndex
module.exports = function (TYPE, specificCreate) {
  var IS_MAP = TYPE == 1;
  var IS_FILTER = TYPE == 2;
  var IS_SOME = TYPE == 3;
  var IS_EVERY = TYPE == 4;
  var IS_FIND_INDEX = TYPE == 6;
  var NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
  var create = specificCreate || arraySpeciesCreate;
  return function ($this, callbackfn, that) {
    var O = toObject($this);
    var self = IndexedObject(O);
    var boundFunction = bind(callbackfn, that, 3);
    var length = toLength(self.length);
    var index = 0;
    var target = IS_MAP ? create($this, length) : IS_FILTER ? create($this, 0) : undefined;
    var value, result;
    for (;length > index; index++) if (NO_HOLES || index in self) {
      value = self[index];
      result = boundFunction(value, index, O);
      if (TYPE) {
        if (IS_MAP) target[index] = result; // map
        else if (result) switch (TYPE) {
          case 3: return true;              // some
          case 5: return value;             // find
          case 6: return index;             // findIndex
          case 2: target.push(value);       // filter
        } else if (IS_EVERY) return false;  // every
      }
    }
    return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : target;
  };
};

},{"../internals/array-species-create":46,"../internals/bind-context":47,"../internals/indexed-object":74,"../internals/to-length":118,"../internals/to-object":119}],46:[function(require,module,exports){
var isObject = require('../internals/is-object');
var isArray = require('../internals/is-array');
var SPECIES = require('../internals/well-known-symbol')('species');

// `ArraySpeciesCreate` abstract operation
// https://tc39.github.io/ecma262/#sec-arrayspeciescreate
module.exports = function (originalArray, length) {
  var C;
  if (isArray(originalArray)) {
    C = originalArray.constructor;
    // cross-realm fallback
    if (typeof C == 'function' && (C === Array || isArray(C.prototype))) C = undefined;
    else if (isObject(C)) {
      C = C[SPECIES];
      if (C === null) C = undefined;
    }
  } return new (C === undefined ? Array : C)(length === 0 ? 0 : length);
};

},{"../internals/is-array":77,"../internals/is-object":79,"../internals/well-known-symbol":123}],47:[function(require,module,exports){
var aFunction = require('../internals/a-function');

// optional / simple context binding
module.exports = function (fn, that, length) {
  aFunction(fn);
  if (that === undefined) return fn;
  switch (length) {
    case 0: return function () {
      return fn.call(that);
    };
    case 1: return function (a) {
      return fn.call(that, a);
    };
    case 2: return function (a, b) {
      return fn.call(that, a, b);
    };
    case 3: return function (a, b, c) {
      return fn.call(that, a, b, c);
    };
  }
  return function (/* ...args */) {
    return fn.apply(that, arguments);
  };
};

},{"../internals/a-function":38}],48:[function(require,module,exports){
var toString = {}.toString;

module.exports = function (it) {
  return toString.call(it).slice(8, -1);
};

},{}],49:[function(require,module,exports){
var classofRaw = require('../internals/classof-raw');
var TO_STRING_TAG = require('../internals/well-known-symbol')('toStringTag');
// ES3 wrong here
var CORRECT_ARGUMENTS = classofRaw(function () { return arguments; }()) == 'Arguments';

// fallback for IE11 Script Access Denied error
var tryGet = function (it, key) {
  try {
    return it[key];
  } catch (e) { /* empty */ }
};

// getting tag from ES6+ `Object.prototype.toString`
module.exports = function (it) {
  var O, tag, result;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (tag = tryGet(O = Object(it), TO_STRING_TAG)) == 'string' ? tag
    // builtinTag case
    : CORRECT_ARGUMENTS ? classofRaw(O)
    // ES3 arguments fallback
    : (result = classofRaw(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : result;
};

},{"../internals/classof-raw":48,"../internals/well-known-symbol":123}],50:[function(require,module,exports){
var has = require('../internals/has');
var ownKeys = require('../internals/own-keys');
var getOwnPropertyDescriptorModule = require('../internals/object-get-own-property-descriptor');
var definePropertyModule = require('../internals/object-define-property');

module.exports = function (target, source) {
  var keys = ownKeys(source);
  var defineProperty = definePropertyModule.f;
  var getOwnPropertyDescriptor = getOwnPropertyDescriptorModule.f;
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (!has(target, key)) defineProperty(target, key, getOwnPropertyDescriptor(source, key));
  }
};

},{"../internals/has":69,"../internals/object-define-property":88,"../internals/object-get-own-property-descriptor":89,"../internals/own-keys":99}],51:[function(require,module,exports){
module.exports = !require('../internals/fails')(function () {
  function F() { /* empty */ }
  F.prototype.constructor = null;
  return Object.getPrototypeOf(new F()) !== F.prototype;
});

},{"../internals/fails":63}],52:[function(require,module,exports){
'use strict';
var IteratorPrototype = require('../internals/iterators-core').IteratorPrototype;
var create = require('../internals/object-create');
var createPropertyDescriptor = require('../internals/create-property-descriptor');
var setToStringTag = require('../internals/set-to-string-tag');
var Iterators = require('../internals/iterators');

var returnThis = function () { return this; };

module.exports = function (IteratorConstructor, NAME, next) {
  var TO_STRING_TAG = NAME + ' Iterator';
  IteratorConstructor.prototype = create(IteratorPrototype, { next: createPropertyDescriptor(1, next) });
  setToStringTag(IteratorConstructor, TO_STRING_TAG, false, true);
  Iterators[TO_STRING_TAG] = returnThis;
  return IteratorConstructor;
};

},{"../internals/create-property-descriptor":53,"../internals/iterators":83,"../internals/iterators-core":82,"../internals/object-create":86,"../internals/set-to-string-tag":108}],53:[function(require,module,exports){
module.exports = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

},{}],54:[function(require,module,exports){
'use strict';
var toPrimitive = require('../internals/to-primitive');
var definePropertyModule = require('../internals/object-define-property');
var createPropertyDescriptor = require('../internals/create-property-descriptor');

module.exports = function (object, key, value) {
  var propertyKey = toPrimitive(key);
  if (propertyKey in object) definePropertyModule.f(object, propertyKey, createPropertyDescriptor(0, value));
  else object[propertyKey] = value;
};

},{"../internals/create-property-descriptor":53,"../internals/object-define-property":88,"../internals/to-primitive":120}],55:[function(require,module,exports){
'use strict';
var $export = require('../internals/export');
var createIteratorConstructor = require('../internals/create-iterator-constructor');
var getPrototypeOf = require('../internals/object-get-prototype-of');
var setPrototypeOf = require('../internals/object-set-prototype-of');
var setToStringTag = require('../internals/set-to-string-tag');
var hide = require('../internals/hide');
var redefine = require('../internals/redefine');
var IS_PURE = require('../internals/is-pure');
var ITERATOR = require('../internals/well-known-symbol')('iterator');
var Iterators = require('../internals/iterators');
var IteratorsCore = require('../internals/iterators-core');
var IteratorPrototype = IteratorsCore.IteratorPrototype;
var BUGGY_SAFARI_ITERATORS = IteratorsCore.BUGGY_SAFARI_ITERATORS;
var KEYS = 'keys';
var VALUES = 'values';
var ENTRIES = 'entries';

var returnThis = function () { return this; };

module.exports = function (Iterable, NAME, IteratorConstructor, next, DEFAULT, IS_SET, FORCED) {
  createIteratorConstructor(IteratorConstructor, NAME, next);

  var getIterationMethod = function (KIND) {
    if (KIND === DEFAULT && defaultIterator) return defaultIterator;
    if (!BUGGY_SAFARI_ITERATORS && KIND in IterablePrototype) return IterablePrototype[KIND];
    switch (KIND) {
      case KEYS: return function keys() { return new IteratorConstructor(this, KIND); };
      case VALUES: return function values() { return new IteratorConstructor(this, KIND); };
      case ENTRIES: return function entries() { return new IteratorConstructor(this, KIND); };
    } return function () { return new IteratorConstructor(this); };
  };

  var TO_STRING_TAG = NAME + ' Iterator';
  var INCORRECT_VALUES_NAME = false;
  var IterablePrototype = Iterable.prototype;
  var nativeIterator = IterablePrototype[ITERATOR]
    || IterablePrototype['@@iterator']
    || DEFAULT && IterablePrototype[DEFAULT];
  var defaultIterator = !BUGGY_SAFARI_ITERATORS && nativeIterator || getIterationMethod(DEFAULT);
  var anyNativeIterator = NAME == 'Array' ? IterablePrototype.entries || nativeIterator : nativeIterator;
  var CurrentIteratorPrototype, methods, KEY;

  // fix native
  if (anyNativeIterator) {
    CurrentIteratorPrototype = getPrototypeOf(anyNativeIterator.call(new Iterable()));
    if (IteratorPrototype !== Object.prototype && CurrentIteratorPrototype.next) {
      if (!IS_PURE && getPrototypeOf(CurrentIteratorPrototype) !== IteratorPrototype) {
        if (setPrototypeOf) {
          setPrototypeOf(CurrentIteratorPrototype, IteratorPrototype);
        } else if (typeof CurrentIteratorPrototype[ITERATOR] != 'function') {
          hide(CurrentIteratorPrototype, ITERATOR, returnThis);
        }
      }
      // Set @@toStringTag to native iterators
      setToStringTag(CurrentIteratorPrototype, TO_STRING_TAG, true, true);
      if (IS_PURE) Iterators[TO_STRING_TAG] = returnThis;
    }
  }

  // fix Array#{values, @@iterator}.name in V8 / FF
  if (DEFAULT == VALUES && nativeIterator && nativeIterator.name !== VALUES) {
    INCORRECT_VALUES_NAME = true;
    defaultIterator = function values() { return nativeIterator.call(this); };
  }

  // define iterator
  if ((!IS_PURE || FORCED) && IterablePrototype[ITERATOR] !== defaultIterator) {
    hide(IterablePrototype, ITERATOR, defaultIterator);
  }
  Iterators[NAME] = defaultIterator;

  // export additional methods
  if (DEFAULT) {
    methods = {
      values: getIterationMethod(VALUES),
      keys: IS_SET ? defaultIterator : getIterationMethod(KEYS),
      entries: getIterationMethod(ENTRIES)
    };
    if (FORCED) for (KEY in methods) {
      if (BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME || !(KEY in IterablePrototype)) {
        redefine(IterablePrototype, KEY, methods[KEY]);
      }
    } else $export({ target: NAME, proto: true, forced: BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME }, methods);
  }

  return methods;
};

},{"../internals/create-iterator-constructor":52,"../internals/export":62,"../internals/hide":71,"../internals/is-pure":80,"../internals/iterators":83,"../internals/iterators-core":82,"../internals/object-get-prototype-of":93,"../internals/object-set-prototype-of":97,"../internals/redefine":101,"../internals/set-to-string-tag":108,"../internals/well-known-symbol":123}],56:[function(require,module,exports){
var path = require('../internals/path');
var has = require('../internals/has');
var wrappedWellKnownSymbolModule = require('../internals/wrapped-well-known-symbol');
var defineProperty = require('../internals/object-define-property').f;

module.exports = function (NAME) {
  var Symbol = path.Symbol || (path.Symbol = {});
  if (!has(Symbol, NAME)) defineProperty(Symbol, NAME, {
    value: wrappedWellKnownSymbolModule.f(NAME)
  });
};

},{"../internals/has":69,"../internals/object-define-property":88,"../internals/path":100,"../internals/wrapped-well-known-symbol":125}],57:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('../internals/fails')(function () {
  return Object.defineProperty({}, 'a', { get: function () { return 7; } }).a != 7;
});

},{"../internals/fails":63}],58:[function(require,module,exports){
var isObject = require('../internals/is-object');
var document = require('../internals/global').document;
// typeof document.createElement is 'object' in old IE
var exist = isObject(document) && isObject(document.createElement);

module.exports = function (it) {
  return exist ? document.createElement(it) : {};
};

},{"../internals/global":68,"../internals/is-object":79}],59:[function(require,module,exports){
// iterable DOM collections
// flag - `iterable` interface - 'entries', 'keys', 'values', 'forEach' methods
module.exports = {
  CSSRuleList: 0,
  CSSStyleDeclaration: 0,
  CSSValueList: 0,
  ClientRectList: 0,
  DOMRectList: 0,
  DOMStringList: 0,
  DOMTokenList: 1,
  DataTransferItemList: 0,
  FileList: 0,
  HTMLAllCollection: 0,
  HTMLCollection: 0,
  HTMLFormElement: 0,
  HTMLSelectElement: 0,
  MediaList: 0,
  MimeTypeArray: 0,
  NamedNodeMap: 0,
  NodeList: 1,
  PaintRequestList: 0,
  Plugin: 0,
  PluginArray: 0,
  SVGLengthList: 0,
  SVGNumberList: 0,
  SVGPathSegList: 0,
  SVGPointList: 0,
  SVGStringList: 0,
  SVGTransformList: 0,
  SourceBufferList: 0,
  StyleSheetList: 0,
  TextTrackCueList: 0,
  TextTrackList: 0,
  TouchList: 0
};

},{}],60:[function(require,module,exports){
// IE8- don't enum bug keys
module.exports = [
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf'
];

},{}],61:[function(require,module,exports){
var objectKeys = require('../internals/object-keys');
var getOwnPropertySymbolsModule = require('../internals/object-get-own-property-symbols');
var propertyIsEnumerableModule = require('../internals/object-property-is-enumerable');

// all enumerable object keys, includes symbols
module.exports = function (it) {
  var result = objectKeys(it);
  var getOwnPropertySymbols = getOwnPropertySymbolsModule.f;
  if (getOwnPropertySymbols) {
    var symbols = getOwnPropertySymbols(it);
    var propertyIsEnumerable = propertyIsEnumerableModule.f;
    var i = 0;
    var key;
    while (symbols.length > i) if (propertyIsEnumerable.call(it, key = symbols[i++])) result.push(key);
  } return result;
};

},{"../internals/object-get-own-property-symbols":92,"../internals/object-keys":95,"../internals/object-property-is-enumerable":96}],62:[function(require,module,exports){
var global = require('../internals/global');
var getOwnPropertyDescriptor = require('../internals/object-get-own-property-descriptor').f;
var hide = require('../internals/hide');
var redefine = require('../internals/redefine');
var setGlobal = require('../internals/set-global');
var copyConstructorProperties = require('../internals/copy-constructor-properties');
var isForced = require('../internals/is-forced');

/*
  options.target      - name of the target object
  options.global      - target is the global object
  options.stat        - export as static methods of target
  options.proto       - export as prototype methods of target
  options.real        - real prototype method for the `pure` version
  options.forced      - export even if the native feature is available
  options.bind        - bind methods to the target, required for the `pure` version
  options.wrap        - wrap constructors to preventing global pollution, required for the `pure` version
  options.unsafe      - use the simple assignment of property instead of delete + defineProperty
  options.sham        - add a flag to not completely full polyfills
  options.enumerable  - export as enumerable property
  options.noTargetGet - prevent calling a getter on target
*/
module.exports = function (options, source) {
  var TARGET = options.target;
  var GLOBAL = options.global;
  var STATIC = options.stat;
  var FORCED, target, key, targetProperty, sourceProperty, descriptor;
  if (GLOBAL) {
    target = global;
  } else if (STATIC) {
    target = global[TARGET] || setGlobal(TARGET, {});
  } else {
    target = (global[TARGET] || {}).prototype;
  }
  if (target) for (key in source) {
    sourceProperty = source[key];
    if (options.noTargetGet) {
      descriptor = getOwnPropertyDescriptor(target, key);
      targetProperty = descriptor && descriptor.value;
    } else targetProperty = target[key];
    FORCED = isForced(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
    // contained in target
    if (!FORCED && targetProperty !== undefined) {
      if (typeof sourceProperty === typeof targetProperty) continue;
      copyConstructorProperties(sourceProperty, targetProperty);
    }
    // add a flag to not completely full polyfills
    if (options.sham || (targetProperty && targetProperty.sham)) {
      hide(sourceProperty, 'sham', true);
    }
    // extend global
    redefine(target, key, sourceProperty, options);
  }
};

},{"../internals/copy-constructor-properties":50,"../internals/global":68,"../internals/hide":71,"../internals/is-forced":78,"../internals/object-get-own-property-descriptor":89,"../internals/redefine":101,"../internals/set-global":106}],63:[function(require,module,exports){
module.exports = function (exec) {
  try {
    return !!exec();
  } catch (e) {
    return true;
  }
};

},{}],64:[function(require,module,exports){
'use strict';
var hide = require('../internals/hide');
var redefine = require('../internals/redefine');
var fails = require('../internals/fails');
var wellKnownSymbol = require('../internals/well-known-symbol');
var regexpExec = require('../internals/regexp-exec');

var SPECIES = wellKnownSymbol('species');

var REPLACE_SUPPORTS_NAMED_GROUPS = !fails(function () {
  // #replace needs built-in support for named groups.
  // #match works fine because it just return the exec results, even if it has
  // a "grops" property.
  var re = /./;
  re.exec = function () {
    var result = [];
    result.groups = { a: '7' };
    return result;
  };
  return ''.replace(re, '$<a>') !== '7';
});

// Chrome 51 has a buggy "split" implementation when RegExp#exec !== nativeExec
// Weex JS has frozen built-in prototypes, so use try / catch wrapper
var SPLIT_WORKS_WITH_OVERWRITTEN_EXEC = !fails(function () {
  var re = /(?:)/;
  var originalExec = re.exec;
  re.exec = function () { return originalExec.apply(this, arguments); };
  var result = 'ab'.split(re);
  return result.length !== 2 || result[0] !== 'a' || result[1] !== 'b';
});

module.exports = function (KEY, length, exec, sham) {
  var SYMBOL = wellKnownSymbol(KEY);

  var DELEGATES_TO_SYMBOL = !fails(function () {
    // String methods call symbol-named RegEp methods
    var O = {};
    O[SYMBOL] = function () { return 7; };
    return ''[KEY](O) != 7;
  });

  var DELEGATES_TO_EXEC = DELEGATES_TO_SYMBOL && !fails(function () {
    // Symbol-named RegExp methods call .exec
    var execCalled = false;
    var re = /a/;
    re.exec = function () { execCalled = true; return null; };

    if (KEY === 'split') {
      // RegExp[@@split] doesn't call the regex's exec method, but first creates
      // a new one. We need to return the patched regex when creating the new one.
      re.constructor = {};
      re.constructor[SPECIES] = function () { return re; };
    }

    re[SYMBOL]('');
    return !execCalled;
  });

  if (
    !DELEGATES_TO_SYMBOL ||
    !DELEGATES_TO_EXEC ||
    (KEY === 'replace' && !REPLACE_SUPPORTS_NAMED_GROUPS) ||
    (KEY === 'split' && !SPLIT_WORKS_WITH_OVERWRITTEN_EXEC)
  ) {
    var nativeRegExpMethod = /./[SYMBOL];
    var methods = exec(SYMBOL, ''[KEY], function (nativeMethod, regexp, str, arg2, forceStringMethod) {
      if (regexp.exec === regexpExec) {
        if (DELEGATES_TO_SYMBOL && !forceStringMethod) {
          // The native String method already delegates to @@method (this
          // polyfilled function), leasing to infinite recursion.
          // We avoid it by directly calling the native @@method method.
          return { done: true, value: nativeRegExpMethod.call(regexp, str, arg2) };
        }
        return { done: true, value: nativeMethod.call(str, regexp, arg2) };
      }
      return { done: false };
    });
    var stringMethod = methods[0];
    var regexMethod = methods[1];

    redefine(String.prototype, KEY, stringMethod);
    redefine(RegExp.prototype, SYMBOL, length == 2
      // 21.2.5.8 RegExp.prototype[@@replace](string, replaceValue)
      // 21.2.5.11 RegExp.prototype[@@split](string, limit)
      ? function (string, arg) { return regexMethod.call(string, this, arg); }
      // 21.2.5.6 RegExp.prototype[@@match](string)
      // 21.2.5.9 RegExp.prototype[@@search](string)
      : function (string) { return regexMethod.call(string, this); }
    );
    if (sham) hide(RegExp.prototype[SYMBOL], 'sham', true);
  }
};

},{"../internals/fails":63,"../internals/hide":71,"../internals/redefine":101,"../internals/regexp-exec":103,"../internals/well-known-symbol":123}],65:[function(require,module,exports){
var fails = require('../internals/fails');
var whitespaces = require('../internals/whitespaces');
var non = '\u200b\u0085\u180e';

// check that a method works with the correct list
// of whitespaces and has a correct name
module.exports = function (METHOD_NAME) {
  return fails(function () {
    return !!whitespaces[METHOD_NAME]() || non[METHOD_NAME]() != non || whitespaces[METHOD_NAME].name !== METHOD_NAME;
  });
};

},{"../internals/fails":63,"../internals/whitespaces":124}],66:[function(require,module,exports){
module.exports = require('../internals/shared')('native-function-to-string', Function.toString);

},{"../internals/shared":110}],67:[function(require,module,exports){
var path = require('../internals/path');
var global = require('../internals/global');

var aFunction = function (variable) {
  return typeof variable == 'function' ? variable : undefined;
};

module.exports = function (namespace, method) {
  return arguments.length < 2 ? aFunction(path[namespace]) || aFunction(global[namespace])
    : path[namespace] && path[namespace][method] || global[namespace] && global[namespace][method];
};

},{"../internals/global":68,"../internals/path":100}],68:[function(require,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
module.exports = typeof window == 'object' && window && window.Math == Math ? window
  : typeof self == 'object' && self && self.Math == Math ? self
  // eslint-disable-next-line no-new-func
  : Function('return this')();

},{}],69:[function(require,module,exports){
var hasOwnProperty = {}.hasOwnProperty;

module.exports = function (it, key) {
  return hasOwnProperty.call(it, key);
};

},{}],70:[function(require,module,exports){
module.exports = {};

},{}],71:[function(require,module,exports){
var definePropertyModule = require('../internals/object-define-property');
var createPropertyDescriptor = require('../internals/create-property-descriptor');

module.exports = require('../internals/descriptors') ? function (object, key, value) {
  return definePropertyModule.f(object, key, createPropertyDescriptor(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

},{"../internals/create-property-descriptor":53,"../internals/descriptors":57,"../internals/object-define-property":88}],72:[function(require,module,exports){
var document = require('../internals/global').document;

module.exports = document && document.documentElement;

},{"../internals/global":68}],73:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('../internals/descriptors') && !require('../internals/fails')(function () {
  return Object.defineProperty(require('../internals/document-create-element')('div'), 'a', {
    get: function () { return 7; }
  }).a != 7;
});

},{"../internals/descriptors":57,"../internals/document-create-element":58,"../internals/fails":63}],74:[function(require,module,exports){
// fallback for non-array-like ES3 and non-enumerable old V8 strings
var fails = require('../internals/fails');
var classof = require('../internals/classof-raw');
var split = ''.split;

module.exports = fails(function () {
  // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
  // eslint-disable-next-line no-prototype-builtins
  return !Object('z').propertyIsEnumerable(0);
}) ? function (it) {
  return classof(it) == 'String' ? split.call(it, '') : Object(it);
} : Object;

},{"../internals/classof-raw":48,"../internals/fails":63}],75:[function(require,module,exports){
var isObject = require('../internals/is-object');
var setPrototypeOf = require('../internals/object-set-prototype-of');

module.exports = function (that, target, C) {
  var S = target.constructor;
  var P;
  if (S !== C && typeof S == 'function' && (P = S.prototype) !== C.prototype && isObject(P) && setPrototypeOf) {
    setPrototypeOf(that, P);
  } return that;
};

},{"../internals/is-object":79,"../internals/object-set-prototype-of":97}],76:[function(require,module,exports){
var NATIVE_WEAK_MAP = require('../internals/native-weak-map');
var isObject = require('../internals/is-object');
var hide = require('../internals/hide');
var objectHas = require('../internals/has');
var sharedKey = require('../internals/shared-key');
var hiddenKeys = require('../internals/hidden-keys');
var WeakMap = require('../internals/global').WeakMap;
var set, get, has;

var enforce = function (it) {
  return has(it) ? get(it) : set(it, {});
};

var getterFor = function (TYPE) {
  return function (it) {
    var state;
    if (!isObject(it) || (state = get(it)).type !== TYPE) {
      throw TypeError('Incompatible receiver, ' + TYPE + ' required');
    } return state;
  };
};

if (NATIVE_WEAK_MAP) {
  var store = new WeakMap();
  var wmget = store.get;
  var wmhas = store.has;
  var wmset = store.set;
  set = function (it, metadata) {
    wmset.call(store, it, metadata);
    return metadata;
  };
  get = function (it) {
    return wmget.call(store, it) || {};
  };
  has = function (it) {
    return wmhas.call(store, it);
  };
} else {
  var STATE = sharedKey('state');
  hiddenKeys[STATE] = true;
  set = function (it, metadata) {
    hide(it, STATE, metadata);
    return metadata;
  };
  get = function (it) {
    return objectHas(it, STATE) ? it[STATE] : {};
  };
  has = function (it) {
    return objectHas(it, STATE);
  };
}

module.exports = {
  set: set,
  get: get,
  has: has,
  enforce: enforce,
  getterFor: getterFor
};

},{"../internals/global":68,"../internals/has":69,"../internals/hidden-keys":70,"../internals/hide":71,"../internals/is-object":79,"../internals/native-weak-map":85,"../internals/shared-key":109}],77:[function(require,module,exports){
var classof = require('../internals/classof-raw');

// `IsArray` abstract operation
// https://tc39.github.io/ecma262/#sec-isarray
module.exports = Array.isArray || function isArray(arg) {
  return classof(arg) == 'Array';
};

},{"../internals/classof-raw":48}],78:[function(require,module,exports){
var fails = require('../internals/fails');
var replacement = /#|\.prototype\./;

var isForced = function (feature, detection) {
  var value = data[normalize(feature)];
  return value == POLYFILL ? true
    : value == NATIVE ? false
    : typeof detection == 'function' ? fails(detection)
    : !!detection;
};

var normalize = isForced.normalize = function (string) {
  return String(string).replace(replacement, '.').toLowerCase();
};

var data = isForced.data = {};
var NATIVE = isForced.NATIVE = 'N';
var POLYFILL = isForced.POLYFILL = 'P';

module.exports = isForced;

},{"../internals/fails":63}],79:[function(require,module,exports){
module.exports = function (it) {
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

},{}],80:[function(require,module,exports){
module.exports = false;

},{}],81:[function(require,module,exports){
var isObject = require('../internals/is-object');
var classof = require('../internals/classof-raw');
var MATCH = require('../internals/well-known-symbol')('match');

// `IsRegExp` abstract operation
// https://tc39.github.io/ecma262/#sec-isregexp
module.exports = function (it) {
  var isRegExp;
  return isObject(it) && ((isRegExp = it[MATCH]) !== undefined ? !!isRegExp : classof(it) == 'RegExp');
};

},{"../internals/classof-raw":48,"../internals/is-object":79,"../internals/well-known-symbol":123}],82:[function(require,module,exports){
'use strict';
var getPrototypeOf = require('../internals/object-get-prototype-of');
var hide = require('../internals/hide');
var has = require('../internals/has');
var IS_PURE = require('../internals/is-pure');
var ITERATOR = require('../internals/well-known-symbol')('iterator');
var BUGGY_SAFARI_ITERATORS = false;

var returnThis = function () { return this; };

// `%IteratorPrototype%` object
// https://tc39.github.io/ecma262/#sec-%iteratorprototype%-object
var IteratorPrototype, PrototypeOfArrayIteratorPrototype, arrayIterator;

if ([].keys) {
  arrayIterator = [].keys();
  // Safari 8 has buggy iterators w/o `next`
  if (!('next' in arrayIterator)) BUGGY_SAFARI_ITERATORS = true;
  else {
    PrototypeOfArrayIteratorPrototype = getPrototypeOf(getPrototypeOf(arrayIterator));
    if (PrototypeOfArrayIteratorPrototype !== Object.prototype) IteratorPrototype = PrototypeOfArrayIteratorPrototype;
  }
}

if (IteratorPrototype == undefined) IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
if (!IS_PURE && !has(IteratorPrototype, ITERATOR)) hide(IteratorPrototype, ITERATOR, returnThis);

module.exports = {
  IteratorPrototype: IteratorPrototype,
  BUGGY_SAFARI_ITERATORS: BUGGY_SAFARI_ITERATORS
};

},{"../internals/has":69,"../internals/hide":71,"../internals/is-pure":80,"../internals/object-get-prototype-of":93,"../internals/well-known-symbol":123}],83:[function(require,module,exports){
arguments[4][70][0].apply(exports,arguments)
},{"dup":70}],84:[function(require,module,exports){
// Chrome 38 Symbol has incorrect toString conversion
module.exports = !require('../internals/fails')(function () {
  // eslint-disable-next-line no-undef
  String(Symbol());
});

},{"../internals/fails":63}],85:[function(require,module,exports){
var nativeFunctionToString = require('../internals/function-to-string');
var WeakMap = require('../internals/global').WeakMap;

module.exports = typeof WeakMap === 'function' && /native code/.test(nativeFunctionToString.call(WeakMap));

},{"../internals/function-to-string":66,"../internals/global":68}],86:[function(require,module,exports){
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
var anObject = require('../internals/an-object');
var defineProperties = require('../internals/object-define-properties');
var enumBugKeys = require('../internals/enum-bug-keys');
var html = require('../internals/html');
var documentCreateElement = require('../internals/document-create-element');
var IE_PROTO = require('../internals/shared-key')('IE_PROTO');
var PROTOTYPE = 'prototype';
var Empty = function () { /* empty */ };

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function () {
  // Thrash, waste and sodomy: IE GC bug
  var iframe = documentCreateElement('iframe');
  var length = enumBugKeys.length;
  var lt = '<';
  var script = 'script';
  var gt = '>';
  var js = 'java' + script + ':';
  var iframeDocument;
  iframe.style.display = 'none';
  html.appendChild(iframe);
  iframe.src = String(js);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + script + gt + 'document.F=Object' + lt + '/' + script + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while (length--) delete createDict[PROTOTYPE][enumBugKeys[length]];
  return createDict();
};

module.exports = Object.create || function create(O, Properties) {
  var result;
  if (O !== null) {
    Empty[PROTOTYPE] = anObject(O);
    result = new Empty();
    Empty[PROTOTYPE] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = createDict();
  return Properties === undefined ? result : defineProperties(result, Properties);
};

require('../internals/hidden-keys')[IE_PROTO] = true;

},{"../internals/an-object":41,"../internals/document-create-element":58,"../internals/enum-bug-keys":60,"../internals/hidden-keys":70,"../internals/html":72,"../internals/object-define-properties":87,"../internals/shared-key":109}],87:[function(require,module,exports){
var DESCRIPTORS = require('../internals/descriptors');
var definePropertyModule = require('../internals/object-define-property');
var anObject = require('../internals/an-object');
var objectKeys = require('../internals/object-keys');

module.exports = DESCRIPTORS ? Object.defineProperties : function defineProperties(O, Properties) {
  anObject(O);
  var keys = objectKeys(Properties);
  var length = keys.length;
  var i = 0;
  var key;
  while (length > i) definePropertyModule.f(O, key = keys[i++], Properties[key]);
  return O;
};

},{"../internals/an-object":41,"../internals/descriptors":57,"../internals/object-define-property":88,"../internals/object-keys":95}],88:[function(require,module,exports){
var DESCRIPTORS = require('../internals/descriptors');
var IE8_DOM_DEFINE = require('../internals/ie8-dom-define');
var anObject = require('../internals/an-object');
var toPrimitive = require('../internals/to-primitive');
var nativeDefineProperty = Object.defineProperty;

exports.f = DESCRIPTORS ? nativeDefineProperty : function defineProperty(O, P, Attributes) {
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if (IE8_DOM_DEFINE) try {
    return nativeDefineProperty(O, P, Attributes);
  } catch (e) { /* empty */ }
  if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};

},{"../internals/an-object":41,"../internals/descriptors":57,"../internals/ie8-dom-define":73,"../internals/to-primitive":120}],89:[function(require,module,exports){
var DESCRIPTORS = require('../internals/descriptors');
var propertyIsEnumerableModule = require('../internals/object-property-is-enumerable');
var createPropertyDescriptor = require('../internals/create-property-descriptor');
var toIndexedObject = require('../internals/to-indexed-object');
var toPrimitive = require('../internals/to-primitive');
var has = require('../internals/has');
var IE8_DOM_DEFINE = require('../internals/ie8-dom-define');
var nativeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

exports.f = DESCRIPTORS ? nativeGetOwnPropertyDescriptor : function getOwnPropertyDescriptor(O, P) {
  O = toIndexedObject(O);
  P = toPrimitive(P, true);
  if (IE8_DOM_DEFINE) try {
    return nativeGetOwnPropertyDescriptor(O, P);
  } catch (e) { /* empty */ }
  if (has(O, P)) return createPropertyDescriptor(!propertyIsEnumerableModule.f.call(O, P), O[P]);
};

},{"../internals/create-property-descriptor":53,"../internals/descriptors":57,"../internals/has":69,"../internals/ie8-dom-define":73,"../internals/object-property-is-enumerable":96,"../internals/to-indexed-object":116,"../internals/to-primitive":120}],90:[function(require,module,exports){
// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
var toIndexedObject = require('../internals/to-indexed-object');
var nativeGetOwnPropertyNames = require('../internals/object-get-own-property-names').f;
var toString = {}.toString;

var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
  ? Object.getOwnPropertyNames(window) : [];

var getWindowNames = function (it) {
  try {
    return nativeGetOwnPropertyNames(it);
  } catch (e) {
    return windowNames.slice();
  }
};

module.exports.f = function getOwnPropertyNames(it) {
  return windowNames && toString.call(it) == '[object Window]'
    ? getWindowNames(it)
    : nativeGetOwnPropertyNames(toIndexedObject(it));
};

},{"../internals/object-get-own-property-names":91,"../internals/to-indexed-object":116}],91:[function(require,module,exports){
// 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
var internalObjectKeys = require('../internals/object-keys-internal');
var hiddenKeys = require('../internals/enum-bug-keys').concat('length', 'prototype');

exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
  return internalObjectKeys(O, hiddenKeys);
};

},{"../internals/enum-bug-keys":60,"../internals/object-keys-internal":94}],92:[function(require,module,exports){
exports.f = Object.getOwnPropertySymbols;

},{}],93:[function(require,module,exports){
// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
var has = require('../internals/has');
var toObject = require('../internals/to-object');
var IE_PROTO = require('../internals/shared-key')('IE_PROTO');
var CORRECT_PROTOTYPE_GETTER = require('../internals/correct-prototype-getter');
var ObjectPrototype = Object.prototype;

module.exports = CORRECT_PROTOTYPE_GETTER ? Object.getPrototypeOf : function (O) {
  O = toObject(O);
  if (has(O, IE_PROTO)) return O[IE_PROTO];
  if (typeof O.constructor == 'function' && O instanceof O.constructor) {
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectPrototype : null;
};

},{"../internals/correct-prototype-getter":51,"../internals/has":69,"../internals/shared-key":109,"../internals/to-object":119}],94:[function(require,module,exports){
var has = require('../internals/has');
var toIndexedObject = require('../internals/to-indexed-object');
var arrayIndexOf = require('../internals/array-includes')(false);
var hiddenKeys = require('../internals/hidden-keys');

module.exports = function (object, names) {
  var O = toIndexedObject(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) !has(hiddenKeys, key) && has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while (names.length > i) if (has(O, key = names[i++])) {
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};

},{"../internals/array-includes":43,"../internals/has":69,"../internals/hidden-keys":70,"../internals/to-indexed-object":116}],95:[function(require,module,exports){
// 19.1.2.14 / 15.2.3.14 Object.keys(O)
var internalObjectKeys = require('../internals/object-keys-internal');
var enumBugKeys = require('../internals/enum-bug-keys');

module.exports = Object.keys || function keys(O) {
  return internalObjectKeys(O, enumBugKeys);
};

},{"../internals/enum-bug-keys":60,"../internals/object-keys-internal":94}],96:[function(require,module,exports){
'use strict';
var nativePropertyIsEnumerable = {}.propertyIsEnumerable;
var nativeGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

// Nashorn ~ JDK8 bug
var NASHORN_BUG = nativeGetOwnPropertyDescriptor && !nativePropertyIsEnumerable.call({ 1: 2 }, 1);

exports.f = NASHORN_BUG ? function propertyIsEnumerable(V) {
  var descriptor = nativeGetOwnPropertyDescriptor(this, V);
  return !!descriptor && descriptor.enumerable;
} : nativePropertyIsEnumerable;

},{}],97:[function(require,module,exports){
// Works with __proto__ only. Old v8 can't work with null proto objects.
/* eslint-disable no-proto */
var validateSetPrototypeOfArguments = require('../internals/validate-set-prototype-of-arguments');

module.exports = Object.setPrototypeOf || ('__proto__' in {} ? function () { // eslint-disable-line
  var correctSetter = false;
  var test = {};
  var setter;
  try {
    setter = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__').set;
    setter.call(test, []);
    correctSetter = test instanceof Array;
  } catch (e) { /* empty */ }
  return function setPrototypeOf(O, proto) {
    validateSetPrototypeOfArguments(O, proto);
    if (correctSetter) setter.call(O, proto);
    else O.__proto__ = proto;
    return O;
  };
}() : undefined);

},{"../internals/validate-set-prototype-of-arguments":122}],98:[function(require,module,exports){
'use strict';
var classof = require('../internals/classof');
var TO_STRING_TAG = require('../internals/well-known-symbol')('toStringTag');
var test = {};

test[TO_STRING_TAG] = 'z';

// `Object.prototype.toString` method implementation
// https://tc39.github.io/ecma262/#sec-object.prototype.tostring
module.exports = String(test) !== '[object z]' ? function toString() {
  return '[object ' + classof(this) + ']';
} : test.toString;

},{"../internals/classof":49,"../internals/well-known-symbol":123}],99:[function(require,module,exports){
var getOwnPropertyNamesModule = require('../internals/object-get-own-property-names');
var getOwnPropertySymbolsModule = require('../internals/object-get-own-property-symbols');
var anObject = require('../internals/an-object');
var Reflect = require('../internals/global').Reflect;

// all object keys, includes non-enumerable and symbols
module.exports = Reflect && Reflect.ownKeys || function ownKeys(it) {
  var keys = getOwnPropertyNamesModule.f(anObject(it));
  var getOwnPropertySymbols = getOwnPropertySymbolsModule.f;
  return getOwnPropertySymbols ? keys.concat(getOwnPropertySymbols(it)) : keys;
};

},{"../internals/an-object":41,"../internals/global":68,"../internals/object-get-own-property-names":91,"../internals/object-get-own-property-symbols":92}],100:[function(require,module,exports){
module.exports = require('../internals/global');

},{"../internals/global":68}],101:[function(require,module,exports){
var global = require('../internals/global');
var hide = require('../internals/hide');
var has = require('../internals/has');
var setGlobal = require('../internals/set-global');
var nativeFunctionToString = require('../internals/function-to-string');
var InternalStateModule = require('../internals/internal-state');
var getInternalState = InternalStateModule.get;
var enforceInternalState = InternalStateModule.enforce;
var TEMPLATE = String(nativeFunctionToString).split('toString');

require('../internals/shared')('inspectSource', function (it) {
  return nativeFunctionToString.call(it);
});

(module.exports = function (O, key, value, options) {
  var unsafe = options ? !!options.unsafe : false;
  var simple = options ? !!options.enumerable : false;
  var noTargetGet = options ? !!options.noTargetGet : false;
  if (typeof value == 'function') {
    if (typeof key == 'string' && !has(value, 'name')) hide(value, 'name', key);
    enforceInternalState(value).source = TEMPLATE.join(typeof key == 'string' ? key : '');
  }
  if (O === global) {
    if (simple) O[key] = value;
    else setGlobal(key, value);
    return;
  } else if (!unsafe) {
    delete O[key];
  } else if (!noTargetGet && O[key]) {
    simple = true;
  }
  if (simple) O[key] = value;
  else hide(O, key, value);
// add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
})(Function.prototype, 'toString', function toString() {
  return typeof this == 'function' && getInternalState(this).source || nativeFunctionToString.call(this);
});

},{"../internals/function-to-string":66,"../internals/global":68,"../internals/has":69,"../internals/hide":71,"../internals/internal-state":76,"../internals/set-global":106,"../internals/shared":110}],102:[function(require,module,exports){
var classof = require('./classof-raw');
var regexpExec = require('./regexp-exec');

// `RegExpExec` abstract operation
// https://tc39.github.io/ecma262/#sec-regexpexec
module.exports = function (R, S) {
  var exec = R.exec;
  if (typeof exec === 'function') {
    var result = exec.call(R, S);
    if (typeof result !== 'object') {
      throw TypeError('RegExp exec method returned something other than an Object or null');
    }
    return result;
  }

  if (classof(R) !== 'RegExp') {
    throw TypeError('RegExp#exec called on incompatible receiver');
  }

  return regexpExec.call(R, S);
};


},{"./classof-raw":48,"./regexp-exec":103}],103:[function(require,module,exports){
'use strict';

var regexpFlags = require('./regexp-flags');

var nativeExec = RegExp.prototype.exec;
// This always refers to the native implementation, because the
// String#replace polyfill uses ./fix-regexp-well-known-symbol-logic.js,
// which loads this file before patching the method.
var nativeReplace = String.prototype.replace;

var patchedExec = nativeExec;

var UPDATES_LAST_INDEX_WRONG = (function () {
  var re1 = /a/;
  var re2 = /b*/g;
  nativeExec.call(re1, 'a');
  nativeExec.call(re2, 'a');
  return re1.lastIndex !== 0 || re2.lastIndex !== 0;
})();

// nonparticipating capturing group, copied from es5-shim's String#split patch.
var NPCG_INCLUDED = /()??/.exec('')[1] !== undefined;

var PATCH = UPDATES_LAST_INDEX_WRONG || NPCG_INCLUDED;

if (PATCH) {
  patchedExec = function exec(str) {
    var re = this;
    var lastIndex, reCopy, match, i;

    if (NPCG_INCLUDED) {
      reCopy = new RegExp('^' + re.source + '$(?!\\s)', regexpFlags.call(re));
    }
    if (UPDATES_LAST_INDEX_WRONG) lastIndex = re.lastIndex;

    match = nativeExec.call(re, str);

    if (UPDATES_LAST_INDEX_WRONG && match) {
      re.lastIndex = re.global ? match.index + match[0].length : lastIndex;
    }
    if (NPCG_INCLUDED && match && match.length > 1) {
      // Fix browsers whose `exec` methods don't consistently return `undefined`
      // for NPCG, like IE8. NOTE: This doesn' work for /(.?)?/
      nativeReplace.call(match[0], reCopy, function () {
        for (i = 1; i < arguments.length - 2; i++) {
          if (arguments[i] === undefined) match[i] = undefined;
        }
      });
    }

    return match;
  };
}

module.exports = patchedExec;

},{"./regexp-flags":104}],104:[function(require,module,exports){
'use strict';
var anObject = require('../internals/an-object');

// `RegExp.prototype.flags` getter implementation
// https://tc39.github.io/ecma262/#sec-get-regexp.prototype.flags
module.exports = function () {
  var that = anObject(this);
  var result = '';
  if (that.global) result += 'g';
  if (that.ignoreCase) result += 'i';
  if (that.multiline) result += 'm';
  if (that.unicode) result += 'u';
  if (that.sticky) result += 'y';
  return result;
};

},{"../internals/an-object":41}],105:[function(require,module,exports){
// `RequireObjectCoercible` abstract operation
// https://tc39.github.io/ecma262/#sec-requireobjectcoercible
module.exports = function (it) {
  if (it == undefined) throw TypeError("Can't call method on " + it);
  return it;
};

},{}],106:[function(require,module,exports){
var global = require('../internals/global');
var hide = require('../internals/hide');

module.exports = function (key, value) {
  try {
    hide(global, key, value);
  } catch (e) {
    global[key] = value;
  } return value;
};

},{"../internals/global":68,"../internals/hide":71}],107:[function(require,module,exports){
'use strict';
var getBuiltIn = require('../internals/get-built-in');
var definePropertyModule = require('../internals/object-define-property');
var DESCRIPTORS = require('../internals/descriptors');
var SPECIES = require('../internals/well-known-symbol')('species');

module.exports = function (CONSTRUCTOR_NAME) {
  var C = getBuiltIn(CONSTRUCTOR_NAME);
  var defineProperty = definePropertyModule.f;
  if (DESCRIPTORS && C && !C[SPECIES]) defineProperty(C, SPECIES, {
    configurable: true,
    get: function () { return this; }
  });
};

},{"../internals/descriptors":57,"../internals/get-built-in":67,"../internals/object-define-property":88,"../internals/well-known-symbol":123}],108:[function(require,module,exports){
var defineProperty = require('../internals/object-define-property').f;
var has = require('../internals/has');
var TO_STRING_TAG = require('../internals/well-known-symbol')('toStringTag');

module.exports = function (it, TAG, STATIC) {
  if (it && !has(it = STATIC ? it : it.prototype, TO_STRING_TAG)) {
    defineProperty(it, TO_STRING_TAG, { configurable: true, value: TAG });
  }
};

},{"../internals/has":69,"../internals/object-define-property":88,"../internals/well-known-symbol":123}],109:[function(require,module,exports){
var shared = require('../internals/shared')('keys');
var uid = require('../internals/uid');

module.exports = function (key) {
  return shared[key] || (shared[key] = uid(key));
};

},{"../internals/shared":110,"../internals/uid":121}],110:[function(require,module,exports){
var global = require('../internals/global');
var setGlobal = require('../internals/set-global');
var SHARED = '__core-js_shared__';
var store = global[SHARED] || setGlobal(SHARED, {});

(module.exports = function (key, value) {
  return store[key] || (store[key] = value !== undefined ? value : {});
})('versions', []).push({
  version: '3.0.0',
  mode: require('../internals/is-pure') ? 'pure' : 'global',
  copyright: '© 2019 Denis Pushkarev (zloirock.ru)'
});

},{"../internals/global":68,"../internals/is-pure":80,"../internals/set-global":106}],111:[function(require,module,exports){
'use strict';
var fails = require('../internals/fails');

module.exports = function (METHOD_NAME, argument) {
  var method = [][METHOD_NAME];
  return !method || !fails(function () {
    // eslint-disable-next-line no-useless-call
    method.call(null, argument || function () { throw Error(); }, 1);
  });
};

},{"../internals/fails":63}],112:[function(require,module,exports){
var anObject = require('../internals/an-object');
var aFunction = require('../internals/a-function');
var SPECIES = require('../internals/well-known-symbol')('species');

// `SpeciesConstructor` abstract operation
// https://tc39.github.io/ecma262/#sec-speciesconstructor
module.exports = function (O, defaultConstructor) {
  var C = anObject(O).constructor;
  var S;
  return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? defaultConstructor : aFunction(S);
};

},{"../internals/a-function":38,"../internals/an-object":41,"../internals/well-known-symbol":123}],113:[function(require,module,exports){
var toInteger = require('../internals/to-integer');
var requireObjectCoercible = require('../internals/require-object-coercible');
// CONVERT_TO_STRING: true  -> String#at
// CONVERT_TO_STRING: false -> String#codePointAt
module.exports = function (that, pos, CONVERT_TO_STRING) {
  var S = String(requireObjectCoercible(that));
  var position = toInteger(pos);
  var size = S.length;
  var first, second;
  if (position < 0 || position >= size) return CONVERT_TO_STRING ? '' : undefined;
  first = S.charCodeAt(position);
  return first < 0xd800 || first > 0xdbff || position + 1 === size
    || (second = S.charCodeAt(position + 1)) < 0xdc00 || second > 0xdfff
      ? CONVERT_TO_STRING ? S.charAt(position) : first
      : CONVERT_TO_STRING ? S.slice(position, position + 2) : (first - 0xd800 << 10) + (second - 0xdc00) + 0x10000;
};

},{"../internals/require-object-coercible":105,"../internals/to-integer":117}],114:[function(require,module,exports){
var requireObjectCoercible = require('../internals/require-object-coercible');
var whitespace = '[' + require('../internals/whitespaces') + ']';
var ltrim = RegExp('^' + whitespace + whitespace + '*');
var rtrim = RegExp(whitespace + whitespace + '*$');

// 1 -> String#trimStart
// 2 -> String#trimEnd
// 3 -> String#trim
module.exports = function (string, TYPE) {
  string = String(requireObjectCoercible(string));
  if (TYPE & 1) string = string.replace(ltrim, '');
  if (TYPE & 2) string = string.replace(rtrim, '');
  return string;
};

},{"../internals/require-object-coercible":105,"../internals/whitespaces":124}],115:[function(require,module,exports){
var toInteger = require('../internals/to-integer');
var max = Math.max;
var min = Math.min;

// Helper for a popular repeating case of the spec:
// Let integer be ? ToInteger(index).
// If integer < 0, let result be max((length + integer), 0); else let result be min(length, length).
module.exports = function (index, length) {
  var integer = toInteger(index);
  return integer < 0 ? max(integer + length, 0) : min(integer, length);
};

},{"../internals/to-integer":117}],116:[function(require,module,exports){
// toObject with fallback for non-array-like ES3 strings
var IndexedObject = require('../internals/indexed-object');
var requireObjectCoercible = require('../internals/require-object-coercible');

module.exports = function (it) {
  return IndexedObject(requireObjectCoercible(it));
};

},{"../internals/indexed-object":74,"../internals/require-object-coercible":105}],117:[function(require,module,exports){
var ceil = Math.ceil;
var floor = Math.floor;

// `ToInteger` abstract operation
// https://tc39.github.io/ecma262/#sec-tointeger
module.exports = function (argument) {
  return isNaN(argument = +argument) ? 0 : (argument > 0 ? floor : ceil)(argument);
};

},{}],118:[function(require,module,exports){
var toInteger = require('../internals/to-integer');
var min = Math.min;

// `ToLength` abstract operation
// https://tc39.github.io/ecma262/#sec-tolength
module.exports = function (argument) {
  return argument > 0 ? min(toInteger(argument), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};

},{"../internals/to-integer":117}],119:[function(require,module,exports){
var requireObjectCoercible = require('../internals/require-object-coercible');

// `ToObject` abstract operation
// https://tc39.github.io/ecma262/#sec-toobject
module.exports = function (argument) {
  return Object(requireObjectCoercible(argument));
};

},{"../internals/require-object-coercible":105}],120:[function(require,module,exports){
// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = require('../internals/is-object');
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function (it, S) {
  if (!isObject(it)) return it;
  var fn, val;
  if (S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  if (typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it))) return val;
  if (!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
  throw TypeError("Can't convert object to primitive value");
};

},{"../internals/is-object":79}],121:[function(require,module,exports){
var id = 0;
var postfix = Math.random();

module.exports = function (key) {
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + postfix).toString(36));
};

},{}],122:[function(require,module,exports){
var isObject = require('../internals/is-object');
var anObject = require('../internals/an-object');

module.exports = function (O, proto) {
  anObject(O);
  if (!isObject(proto) && proto !== null) {
    throw TypeError("Can't set " + String(proto) + ' as a prototype');
  }
};

},{"../internals/an-object":41,"../internals/is-object":79}],123:[function(require,module,exports){
var store = require('../internals/shared')('wks');
var uid = require('../internals/uid');
var Symbol = require('../internals/global').Symbol;
var NATIVE_SYMBOL = require('../internals/native-symbol');

module.exports = function (name) {
  return store[name] || (store[name] = NATIVE_SYMBOL && Symbol[name]
    || (NATIVE_SYMBOL ? Symbol : uid)('Symbol.' + name));
};

},{"../internals/global":68,"../internals/native-symbol":84,"../internals/shared":110,"../internals/uid":121}],124:[function(require,module,exports){
// a string of all valid unicode whitespaces
// eslint-disable-next-line max-len
module.exports = '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF';

},{}],125:[function(require,module,exports){
exports.f = require('../internals/well-known-symbol');

},{"../internals/well-known-symbol":123}],126:[function(require,module,exports){
'use strict';
var isArray = require('../internals/is-array');
var isObject = require('../internals/is-object');
var toObject = require('../internals/to-object');
var toLength = require('../internals/to-length');
var createProperty = require('../internals/create-property');
var arraySpeciesCreate = require('../internals/array-species-create');
var IS_CONCAT_SPREADABLE = require('../internals/well-known-symbol')('isConcatSpreadable');
var MAX_SAFE_INTEGER = 0x1fffffffffffff;
var MAXIMUM_ALLOWED_INDEX_EXCEEDED = 'Maximum allowed index exceeded';

var IS_CONCAT_SPREADABLE_SUPPORT = !require('../internals/fails')(function () {
  var array = [];
  array[IS_CONCAT_SPREADABLE] = false;
  return array.concat()[0] !== array;
});

var SPECIES_SUPPORT = require('../internals/array-method-has-species-support')('concat');

var isConcatSpreadable = function (O) {
  if (!isObject(O)) return false;
  var spreadable = O[IS_CONCAT_SPREADABLE];
  return spreadable !== undefined ? !!spreadable : isArray(O);
};

var FORCED = !IS_CONCAT_SPREADABLE_SUPPORT || !SPECIES_SUPPORT;

// `Array.prototype.concat` method
// https://tc39.github.io/ecma262/#sec-array.prototype.concat
// with adding support of @@isConcatSpreadable and @@species
require('../internals/export')({ target: 'Array', proto: true, forced: FORCED }, {
  concat: function concat(arg) { // eslint-disable-line no-unused-vars
    var O = toObject(this);
    var A = arraySpeciesCreate(O, 0);
    var n = 0;
    var i, k, length, len, E;
    for (i = -1, length = arguments.length; i < length; i++) {
      E = i === -1 ? O : arguments[i];
      if (isConcatSpreadable(E)) {
        len = toLength(E.length);
        if (n + len > MAX_SAFE_INTEGER) throw TypeError(MAXIMUM_ALLOWED_INDEX_EXCEEDED);
        for (k = 0; k < len; k++, n++) if (k in E) createProperty(A, n, E[k]);
      } else {
        if (n >= MAX_SAFE_INTEGER) throw TypeError(MAXIMUM_ALLOWED_INDEX_EXCEEDED);
        createProperty(A, n++, E);
      }
    }
    A.length = n;
    return A;
  }
});

},{"../internals/array-method-has-species-support":44,"../internals/array-species-create":46,"../internals/create-property":54,"../internals/export":62,"../internals/fails":63,"../internals/is-array":77,"../internals/is-object":79,"../internals/to-length":118,"../internals/to-object":119,"../internals/well-known-symbol":123}],127:[function(require,module,exports){
'use strict';
var internalFilter = require('../internals/array-methods')(2);

var SPECIES_SUPPORT = require('../internals/array-method-has-species-support')('filter');

// `Array.prototype.filter` method
// https://tc39.github.io/ecma262/#sec-array.prototype.filter
// with adding support of @@species
require('../internals/export')({ target: 'Array', proto: true, forced: !SPECIES_SUPPORT }, {
  filter: function filter(callbackfn /* , thisArg */) {
    return internalFilter(this, callbackfn, arguments[1]);
  }
});

},{"../internals/array-method-has-species-support":44,"../internals/array-methods":45,"../internals/export":62}],128:[function(require,module,exports){
'use strict';
var toIndexedObject = require('../internals/to-indexed-object');
var addToUnscopables = require('../internals/add-to-unscopables');
var Iterators = require('../internals/iterators');
var InternalStateModule = require('../internals/internal-state');
var defineIterator = require('../internals/define-iterator');
var ARRAY_ITERATOR = 'Array Iterator';
var setInternalState = InternalStateModule.set;
var getInternalState = InternalStateModule.getterFor(ARRAY_ITERATOR);

// `Array.prototype.entries` method
// https://tc39.github.io/ecma262/#sec-array.prototype.entries
// `Array.prototype.keys` method
// https://tc39.github.io/ecma262/#sec-array.prototype.keys
// `Array.prototype.values` method
// https://tc39.github.io/ecma262/#sec-array.prototype.values
// `Array.prototype[@@iterator]` method
// https://tc39.github.io/ecma262/#sec-array.prototype-@@iterator
// `CreateArrayIterator` internal method
// https://tc39.github.io/ecma262/#sec-createarrayiterator
module.exports = defineIterator(Array, 'Array', function (iterated, kind) {
  setInternalState(this, {
    type: ARRAY_ITERATOR,
    target: toIndexedObject(iterated), // target
    index: 0,                          // next index
    kind: kind                         // kind
  });
// `%ArrayIteratorPrototype%.next` method
// https://tc39.github.io/ecma262/#sec-%arrayiteratorprototype%.next
}, function () {
  var state = getInternalState(this);
  var target = state.target;
  var kind = state.kind;
  var index = state.index++;
  if (!target || index >= target.length) {
    state.target = undefined;
    return { value: undefined, done: true };
  }
  if (kind == 'keys') return { value: index, done: false };
  if (kind == 'values') return { value: target[index], done: false };
  return { value: [index, target[index]], done: false };
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values%
// https://tc39.github.io/ecma262/#sec-createunmappedargumentsobject
// https://tc39.github.io/ecma262/#sec-createmappedargumentsobject
Iterators.Arguments = Iterators.Array;

// https://tc39.github.io/ecma262/#sec-array.prototype-@@unscopables
addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');

},{"../internals/add-to-unscopables":39,"../internals/define-iterator":55,"../internals/internal-state":76,"../internals/iterators":83,"../internals/to-indexed-object":116}],129:[function(require,module,exports){
'use strict';
var toIndexedObject = require('../internals/to-indexed-object');
var nativeJoin = [].join;

var ES3_STRINGS = require('../internals/indexed-object') != Object;
var SLOPPY_METHOD = require('../internals/sloppy-array-method')('join', ',');

// `Array.prototype.join` method
// https://tc39.github.io/ecma262/#sec-array.prototype.join
require('../internals/export')({ target: 'Array', proto: true, forced: ES3_STRINGS || SLOPPY_METHOD }, {
  join: function join(separator) {
    return nativeJoin.call(toIndexedObject(this), separator === undefined ? ',' : separator);
  }
});

},{"../internals/export":62,"../internals/indexed-object":74,"../internals/sloppy-array-method":111,"../internals/to-indexed-object":116}],130:[function(require,module,exports){
'use strict';
var internalMap = require('../internals/array-methods')(1);

var SPECIES_SUPPORT = require('../internals/array-method-has-species-support')('map');

// `Array.prototype.map` method
// https://tc39.github.io/ecma262/#sec-array.prototype.map
// with adding support of @@species
require('../internals/export')({ target: 'Array', proto: true, forced: !SPECIES_SUPPORT }, {
  map: function map(callbackfn /* , thisArg */) {
    return internalMap(this, callbackfn, arguments[1]);
  }
});

},{"../internals/array-method-has-species-support":44,"../internals/array-methods":45,"../internals/export":62}],131:[function(require,module,exports){
'use strict';
var isObject = require('../internals/is-object');
var isArray = require('../internals/is-array');
var toAbsoluteIndex = require('../internals/to-absolute-index');
var toLength = require('../internals/to-length');
var toIndexedObject = require('../internals/to-indexed-object');
var createProperty = require('../internals/create-property');
var SPECIES = require('../internals/well-known-symbol')('species');
var nativeSlice = [].slice;
var max = Math.max;

var SPECIES_SUPPORT = require('../internals/array-method-has-species-support')('slice');

// `Array.prototype.slice` method
// https://tc39.github.io/ecma262/#sec-array.prototype.slice
// fallback for not array-like ES3 strings and DOM objects
require('../internals/export')({ target: 'Array', proto: true, forced: !SPECIES_SUPPORT }, {
  slice: function slice(start, end) {
    var O = toIndexedObject(this);
    var length = toLength(O.length);
    var k = toAbsoluteIndex(start, length);
    var fin = toAbsoluteIndex(end === undefined ? length : end, length);
    // inline `ArraySpeciesCreate` for usage native `Array#slice` where it's possible
    var Constructor, result, n;
    if (isArray(O)) {
      Constructor = O.constructor;
      // cross-realm fallback
      if (typeof Constructor == 'function' && (Constructor === Array || isArray(Constructor.prototype))) {
        Constructor = undefined;
      } else if (isObject(Constructor)) {
        Constructor = Constructor[SPECIES];
        if (Constructor === null) Constructor = undefined;
      }
      if (Constructor === Array || Constructor === undefined) {
        return nativeSlice.call(O, k, fin);
      }
    }
    result = new (Constructor === undefined ? Array : Constructor)(max(fin - k, 0));
    for (n = 0; k < fin; k++, n++) if (k in O) createProperty(result, n, O[k]);
    result.length = n;
    return result;
  }
});

},{"../internals/array-method-has-species-support":44,"../internals/create-property":54,"../internals/export":62,"../internals/is-array":77,"../internals/is-object":79,"../internals/to-absolute-index":115,"../internals/to-indexed-object":116,"../internals/to-length":118,"../internals/well-known-symbol":123}],132:[function(require,module,exports){
'use strict';
var toAbsoluteIndex = require('../internals/to-absolute-index');
var toInteger = require('../internals/to-integer');
var toLength = require('../internals/to-length');
var toObject = require('../internals/to-object');
var arraySpeciesCreate = require('../internals/array-species-create');
var createProperty = require('../internals/create-property');
var max = Math.max;
var min = Math.min;
var MAX_SAFE_INTEGER = 0x1fffffffffffff;
var MAXIMUM_ALLOWED_LENGTH_EXCEEDED = 'Maximum allowed length exceeded';

var SPECIES_SUPPORT = require('../internals/array-method-has-species-support')('splice');

// `Array.prototype.splice` method
// https://tc39.github.io/ecma262/#sec-array.prototype.splice
// with adding support of @@species
require('../internals/export')({ target: 'Array', proto: true, forced: !SPECIES_SUPPORT }, {
  splice: function splice(start, deleteCount /* , ...items */) {
    var O = toObject(this);
    var len = toLength(O.length);
    var actualStart = toAbsoluteIndex(start, len);
    var argumentsLength = arguments.length;
    var insertCount, actualDeleteCount, A, k, from, to;
    if (argumentsLength === 0) {
      insertCount = actualDeleteCount = 0;
    } else if (argumentsLength === 1) {
      insertCount = 0;
      actualDeleteCount = len - actualStart;
    } else {
      insertCount = argumentsLength - 2;
      actualDeleteCount = min(max(toInteger(deleteCount), 0), len - actualStart);
    }
    if (len + insertCount - actualDeleteCount > MAX_SAFE_INTEGER) {
      throw TypeError(MAXIMUM_ALLOWED_LENGTH_EXCEEDED);
    }
    A = arraySpeciesCreate(O, actualDeleteCount);
    for (k = 0; k < actualDeleteCount; k++) {
      from = actualStart + k;
      if (from in O) createProperty(A, k, O[from]);
    }
    A.length = actualDeleteCount;
    if (insertCount < actualDeleteCount) {
      for (k = actualStart; k < len - actualDeleteCount; k++) {
        from = k + actualDeleteCount;
        to = k + insertCount;
        if (from in O) O[to] = O[from];
        else delete O[to];
      }
      for (k = len; k > len - actualDeleteCount + insertCount; k--) delete O[k - 1];
    } else if (insertCount > actualDeleteCount) {
      for (k = len - actualDeleteCount; k > actualStart; k--) {
        from = k + actualDeleteCount - 1;
        to = k + insertCount - 1;
        if (from in O) O[to] = O[from];
        else delete O[to];
      }
    }
    for (k = 0; k < insertCount; k++) {
      O[k + actualStart] = arguments[k + 2];
    }
    O.length = len - actualDeleteCount + insertCount;
    return A;
  }
});

},{"../internals/array-method-has-species-support":44,"../internals/array-species-create":46,"../internals/create-property":54,"../internals/export":62,"../internals/to-absolute-index":115,"../internals/to-integer":117,"../internals/to-length":118,"../internals/to-object":119}],133:[function(require,module,exports){
'use strict';
var global = require('../internals/global');
var isForced = require('../internals/is-forced');
var has = require('../internals/has');
var classof = require('../internals/classof-raw');
var inheritIfRequired = require('../internals/inherit-if-required');
var toPrimitive = require('../internals/to-primitive');
var fails = require('../internals/fails');
var getOwnPropertyNames = require('../internals/object-get-own-property-names').f;
var getOwnPropertyDescriptor = require('../internals/object-get-own-property-descriptor').f;
var defineProperty = require('../internals/object-define-property').f;
var internalStringTrim = require('../internals/string-trim');
var NUMBER = 'Number';
var NativeNumber = global[NUMBER];
var NumberPrototype = NativeNumber.prototype;

// Opera ~12 has broken Object#toString
var BROKEN_CLASSOF = classof(require('../internals/object-create')(NumberPrototype)) == NUMBER;
var NATIVE_TRIM = 'trim' in String.prototype;

// `ToNumber` abstract operation
// https://tc39.github.io/ecma262/#sec-tonumber
var toNumber = function (argument) {
  var it = toPrimitive(argument, false);
  var first, third, radix, maxCode, digits, length, i, code;
  if (typeof it == 'string' && it.length > 2) {
    it = NATIVE_TRIM ? it.trim() : internalStringTrim(it, 3);
    first = it.charCodeAt(0);
    if (first === 43 || first === 45) {
      third = it.charCodeAt(2);
      if (third === 88 || third === 120) return NaN; // Number('+0x1') should be NaN, old V8 fix
    } else if (first === 48) {
      switch (it.charCodeAt(1)) {
        case 66: case 98: radix = 2; maxCode = 49; break; // fast equal of /^0b[01]+$/i
        case 79: case 111: radix = 8; maxCode = 55; break; // fast equal of /^0o[0-7]+$/i
        default: return +it;
      }
      digits = it.slice(2);
      length = digits.length;
      for (i = 0; i < length; i++) {
        code = digits.charCodeAt(i);
        // parseInt parses a string to a first unavailable symbol
        // but ToNumber should return NaN if a string contains unavailable symbols
        if (code < 48 || code > maxCode) return NaN;
      } return parseInt(digits, radix);
    }
  } return +it;
};

// `Number` constructor
// https://tc39.github.io/ecma262/#sec-number-constructor
if (isForced(NUMBER, !NativeNumber(' 0o1') || !NativeNumber('0b1') || NativeNumber('+0x1'))) {
  var NumberWrapper = function Number(value) {
    var it = arguments.length < 1 ? 0 : value;
    var that = this;
    return that instanceof NumberWrapper
      // check on 1..constructor(foo) case
      && (BROKEN_CLASSOF ? fails(function () { NumberPrototype.valueOf.call(that); }) : classof(that) != NUMBER)
        ? inheritIfRequired(new NativeNumber(toNumber(it)), that, NumberWrapper) : toNumber(it);
  };
  for (var keys = require('../internals/descriptors') ? getOwnPropertyNames(NativeNumber) : (
    // ES3:
    'MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,' +
    // ES2015 (in case, if modules with ES2015 Number statics required before):
    'EPSILON,isFinite,isInteger,isNaN,isSafeInteger,MAX_SAFE_INTEGER,' +
    'MIN_SAFE_INTEGER,parseFloat,parseInt,isInteger'
  ).split(','), j = 0, key; keys.length > j; j++) {
    if (has(NativeNumber, key = keys[j]) && !has(NumberWrapper, key)) {
      defineProperty(NumberWrapper, key, getOwnPropertyDescriptor(NativeNumber, key));
    }
  }
  NumberWrapper.prototype = NumberPrototype;
  NumberPrototype.constructor = NumberWrapper;
  require('../internals/redefine')(global, NUMBER, NumberWrapper);
}

},{"../internals/classof-raw":48,"../internals/descriptors":57,"../internals/fails":63,"../internals/global":68,"../internals/has":69,"../internals/inherit-if-required":75,"../internals/is-forced":78,"../internals/object-create":86,"../internals/object-define-property":88,"../internals/object-get-own-property-descriptor":89,"../internals/object-get-own-property-names":91,"../internals/redefine":101,"../internals/string-trim":114,"../internals/to-primitive":120}],134:[function(require,module,exports){
// `Number.isNaN` method
// https://tc39.github.io/ecma262/#sec-number.isnan
require('../internals/export')({ target: 'Number', stat: true }, {
  isNaN: function isNaN(number) {
    // eslint-disable-next-line no-self-compare
    return number != number;
  }
});

},{"../internals/export":62}],135:[function(require,module,exports){
var toObject = require('../internals/to-object');
var nativeKeys = require('../internals/object-keys');
var FAILS_ON_PRIMITIVES = require('../internals/fails')(function () { nativeKeys(1); });

// `Object.keys` method
// https://tc39.github.io/ecma262/#sec-object.keys
require('../internals/export')({ target: 'Object', stat: true, forced: FAILS_ON_PRIMITIVES }, {
  keys: function keys(it) {
    return nativeKeys(toObject(it));
  }
});

},{"../internals/export":62,"../internals/fails":63,"../internals/object-keys":95,"../internals/to-object":119}],136:[function(require,module,exports){
var toString = require('../internals/object-to-string');
var ObjectPrototype = Object.prototype;

// `Object.prototype.toString` method
// https://tc39.github.io/ecma262/#sec-object.prototype.tostring
if (toString !== ObjectPrototype.toString) {
  require('../internals/redefine')(ObjectPrototype, 'toString', toString, { unsafe: true });
}

},{"../internals/object-to-string":98,"../internals/redefine":101}],137:[function(require,module,exports){
var DESCRIPTORS = require('../internals/descriptors');
var MATCH = require('../internals/well-known-symbol')('match');
var global = require('../internals/global');
var isForced = require('../internals/is-forced');
var inheritIfRequired = require('../internals/inherit-if-required');
var defineProperty = require('../internals/object-define-property').f;
var getOwnPropertyNames = require('../internals/object-get-own-property-names').f;
var isRegExp = require('../internals/is-regexp');
var getFlags = require('../internals/regexp-flags');
var redefine = require('../internals/redefine');
var fails = require('../internals/fails');
var NativeRegExp = global.RegExp;
var RegExpPrototype = NativeRegExp.prototype;
var re1 = /a/g;
var re2 = /a/g;

// "new" should create a new object, old webkit bug
var CORRECT_NEW = new NativeRegExp(re1) !== re1;

var FORCED = isForced('RegExp', DESCRIPTORS && (!CORRECT_NEW || fails(function () {
  re2[MATCH] = false;
  // RegExp constructor can alter flags and IsRegExp works correct with @@match
  return NativeRegExp(re1) != re1 || NativeRegExp(re2) == re2 || NativeRegExp(re1, 'i') != '/a/i';
})));

// `RegExp` constructor
// https://tc39.github.io/ecma262/#sec-regexp-constructor
if (FORCED) {
  var RegExpWrapper = function RegExp(pattern, flags) {
    var thisIsRegExp = this instanceof RegExpWrapper;
    var patternIsRegExp = isRegExp(pattern);
    var flagsAreUndefined = flags === undefined;
    return !thisIsRegExp && patternIsRegExp && pattern.constructor === RegExpWrapper && flagsAreUndefined ? pattern
      : inheritIfRequired(CORRECT_NEW
        ? new NativeRegExp(patternIsRegExp && !flagsAreUndefined ? pattern.source : pattern, flags)
        : NativeRegExp((patternIsRegExp = pattern instanceof RegExpWrapper)
          ? pattern.source
          : pattern, patternIsRegExp && flagsAreUndefined ? getFlags.call(pattern) : flags)
      , thisIsRegExp ? this : RegExpPrototype, RegExpWrapper);
  };
  var proxy = function (key) {
    key in RegExpWrapper || defineProperty(RegExpWrapper, key, {
      configurable: true,
      get: function () { return NativeRegExp[key]; },
      set: function (it) { NativeRegExp[key] = it; }
    });
  };
  var keys = getOwnPropertyNames(NativeRegExp);
  var i = 0;
  while (i < keys.length) proxy(keys[i++]);
  RegExpPrototype.constructor = RegExpWrapper;
  RegExpWrapper.prototype = RegExpPrototype;
  redefine(global, 'RegExp', RegExpWrapper);
}

// https://tc39.github.io/ecma262/#sec-get-regexp-@@species
require('../internals/set-species')('RegExp');

},{"../internals/descriptors":57,"../internals/fails":63,"../internals/global":68,"../internals/inherit-if-required":75,"../internals/is-forced":78,"../internals/is-regexp":81,"../internals/object-define-property":88,"../internals/object-get-own-property-names":91,"../internals/redefine":101,"../internals/regexp-flags":104,"../internals/set-species":107,"../internals/well-known-symbol":123}],138:[function(require,module,exports){
'use strict';
var anObject = require('../internals/an-object');
var fails = require('../internals/fails');
var flags = require('../internals/regexp-flags');
var DESCRIPTORS = require('../internals/descriptors');
var TO_STRING = 'toString';
var nativeToString = /./[TO_STRING];

var NOT_GENERIC = fails(function () { return nativeToString.call({ source: 'a', flags: 'b' }) != '/a/b'; });
// FF44- RegExp#toString has a wrong name
var INCORRECT_NAME = nativeToString.name != TO_STRING;

// `RegExp.prototype.toString` method
// https://tc39.github.io/ecma262/#sec-regexp.prototype.tostring
if (NOT_GENERIC || INCORRECT_NAME) {
  require('../internals/redefine')(RegExp.prototype, TO_STRING, function toString() {
    var R = anObject(this);
    return '/'.concat(R.source, '/',
      'flags' in R ? R.flags : !DESCRIPTORS && R instanceof RegExp ? flags.call(R) : undefined);
  }, { unsafe: true });
}

},{"../internals/an-object":41,"../internals/descriptors":57,"../internals/fails":63,"../internals/redefine":101,"../internals/regexp-flags":104}],139:[function(require,module,exports){
'use strict';
var codePointAt = require('../internals/string-at');
var InternalStateModule = require('../internals/internal-state');
var defineIterator = require('../internals/define-iterator');
var STRING_ITERATOR = 'String Iterator';
var setInternalState = InternalStateModule.set;
var getInternalState = InternalStateModule.getterFor(STRING_ITERATOR);

// `String.prototype[@@iterator]` method
// https://tc39.github.io/ecma262/#sec-string.prototype-@@iterator
defineIterator(String, 'String', function (iterated) {
  setInternalState(this, {
    type: STRING_ITERATOR,
    string: String(iterated),
    index: 0
  });
// `%StringIteratorPrototype%.next` method
// https://tc39.github.io/ecma262/#sec-%stringiteratorprototype%.next
}, function next() {
  var state = getInternalState(this);
  var string = state.string;
  var index = state.index;
  var point;
  if (index >= string.length) return { value: undefined, done: true };
  point = codePointAt(string, index, true);
  state.index += point.length;
  return { value: point, done: false };
});

},{"../internals/define-iterator":55,"../internals/internal-state":76,"../internals/string-at":113}],140:[function(require,module,exports){
'use strict';

var anObject = require('../internals/an-object');
var toLength = require('../internals/to-length');
var requireObjectCoercible = require('../internals/require-object-coercible');
var advanceStringIndex = require('../internals/advance-string-index');
var regExpExec = require('../internals/regexp-exec-abstract');

// @@match logic
require('../internals/fix-regexp-well-known-symbol-logic')(
  'match',
  1,
  function (MATCH, nativeMatch, maybeCallNative) {
    return [
      // `String.prototype.match` method
      // https://tc39.github.io/ecma262/#sec-string.prototype.match
      function match(regexp) {
        var O = requireObjectCoercible(this);
        var matcher = regexp == undefined ? undefined : regexp[MATCH];
        return matcher !== undefined ? matcher.call(regexp, O) : new RegExp(regexp)[MATCH](String(O));
      },
      // `RegExp.prototype[@@match]` method
      // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@match
      function (regexp) {
        var res = maybeCallNative(nativeMatch, regexp, this);
        if (res.done) return res.value;

        var rx = anObject(regexp);
        var S = String(this);

        if (!rx.global) return regExpExec(rx, S);

        var fullUnicode = rx.unicode;
        rx.lastIndex = 0;
        var A = [];
        var n = 0;
        var result;
        while ((result = regExpExec(rx, S)) !== null) {
          var matchStr = String(result[0]);
          A[n] = matchStr;
          if (matchStr === '') rx.lastIndex = advanceStringIndex(S, toLength(rx.lastIndex), fullUnicode);
          n++;
        }
        return n === 0 ? null : A;
      }
    ];
  }
);

},{"../internals/advance-string-index":40,"../internals/an-object":41,"../internals/fix-regexp-well-known-symbol-logic":64,"../internals/regexp-exec-abstract":102,"../internals/require-object-coercible":105,"../internals/to-length":118}],141:[function(require,module,exports){
'use strict';

var anObject = require('../internals/an-object');
var toObject = require('../internals/to-object');
var toLength = require('../internals/to-length');
var toInteger = require('../internals/to-integer');
var requireObjectCoercible = require('../internals/require-object-coercible');
var advanceStringIndex = require('../internals/advance-string-index');
var regExpExec = require('../internals/regexp-exec-abstract');
var max = Math.max;
var min = Math.min;
var floor = Math.floor;
var SUBSTITUTION_SYMBOLS = /\$([$&`']|\d\d?|<[^>]*>)/g;
var SUBSTITUTION_SYMBOLS_NO_NAMED = /\$([$&`']|\d\d?)/g;

var maybeToString = function (it) {
  return it === undefined ? it : String(it);
};

// @@replace logic
require('../internals/fix-regexp-well-known-symbol-logic')(
  'replace',
  2,
  function (REPLACE, nativeReplace, maybeCallNative) {
    return [
      // `String.prototype.replace` method
      // https://tc39.github.io/ecma262/#sec-string.prototype.replace
      function replace(searchValue, replaceValue) {
        var O = requireObjectCoercible(this);
        var replacer = searchValue == undefined ? undefined : searchValue[REPLACE];
        return replacer !== undefined
          ? replacer.call(searchValue, O, replaceValue)
          : nativeReplace.call(String(O), searchValue, replaceValue);
      },
      // `RegExp.prototype[@@replace]` method
      // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@replace
      function (regexp, replaceValue) {
        var res = maybeCallNative(nativeReplace, regexp, this, replaceValue);
        if (res.done) return res.value;

        var rx = anObject(regexp);
        var S = String(this);

        var functionalReplace = typeof replaceValue === 'function';
        if (!functionalReplace) replaceValue = String(replaceValue);

        var global = rx.global;
        if (global) {
          var fullUnicode = rx.unicode;
          rx.lastIndex = 0;
        }
        var results = [];
        while (true) {
          var result = regExpExec(rx, S);
          if (result === null) break;

          results.push(result);
          if (!global) break;

          var matchStr = String(result[0]);
          if (matchStr === '') rx.lastIndex = advanceStringIndex(S, toLength(rx.lastIndex), fullUnicode);
        }

        var accumulatedResult = '';
        var nextSourcePosition = 0;
        for (var i = 0; i < results.length; i++) {
          result = results[i];

          var matched = String(result[0]);
          var position = max(min(toInteger(result.index), S.length), 0);
          var captures = [];
          // NOTE: This is equivalent to
          //   captures = result.slice(1).map(maybeToString)
          // but for some reason `nativeSlice.call(result, 1, result.length)` (called in
          // the slice polyfill when slicing native arrays) "doesn't work" in safari 9 and
          // causes a crash (https://pastebin.com/N21QzeQA) when trying to debug it.
          for (var j = 1; j < result.length; j++) captures.push(maybeToString(result[j]));
          var namedCaptures = result.groups;
          if (functionalReplace) {
            var replacerArgs = [matched].concat(captures, position, S);
            if (namedCaptures !== undefined) replacerArgs.push(namedCaptures);
            var replacement = String(replaceValue.apply(undefined, replacerArgs));
          } else {
            replacement = getSubstitution(matched, S, position, captures, namedCaptures, replaceValue);
          }
          if (position >= nextSourcePosition) {
            accumulatedResult += S.slice(nextSourcePosition, position) + replacement;
            nextSourcePosition = position + matched.length;
          }
        }
        return accumulatedResult + S.slice(nextSourcePosition);
      }
    ];

    // https://tc39.github.io/ecma262/#sec-getsubstitution
    function getSubstitution(matched, str, position, captures, namedCaptures, replacement) {
      var tailPos = position + matched.length;
      var m = captures.length;
      var symbols = SUBSTITUTION_SYMBOLS_NO_NAMED;
      if (namedCaptures !== undefined) {
        namedCaptures = toObject(namedCaptures);
        symbols = SUBSTITUTION_SYMBOLS;
      }
      return nativeReplace.call(replacement, symbols, function (match, ch) {
        var capture;
        switch (ch.charAt(0)) {
          case '$': return '$';
          case '&': return matched;
          case '`': return str.slice(0, position);
          case "'": return str.slice(tailPos);
          case '<':
            capture = namedCaptures[ch.slice(1, -1)];
            break;
          default: // \d\d?
            var n = +ch;
            if (n === 0) return match;
            if (n > m) {
              var f = floor(n / 10);
              if (f === 0) return match;
              if (f <= m) return captures[f - 1] === undefined ? ch.charAt(1) : captures[f - 1] + ch.charAt(1);
              return match;
            }
            capture = captures[n - 1];
        }
        return capture === undefined ? '' : capture;
      });
    }
  }
);

},{"../internals/advance-string-index":40,"../internals/an-object":41,"../internals/fix-regexp-well-known-symbol-logic":64,"../internals/regexp-exec-abstract":102,"../internals/require-object-coercible":105,"../internals/to-integer":117,"../internals/to-length":118,"../internals/to-object":119}],142:[function(require,module,exports){
'use strict';

var isRegExp = require('../internals/is-regexp');
var anObject = require('../internals/an-object');
var requireObjectCoercible = require('../internals/require-object-coercible');
var speciesConstructor = require('../internals/species-constructor');
var advanceStringIndex = require('../internals/advance-string-index');
var toLength = require('../internals/to-length');
var callRegExpExec = require('../internals/regexp-exec-abstract');
var regexpExec = require('../internals/regexp-exec');
var fails = require('../internals/fails');
var arrayPush = [].push;
var min = Math.min;
var MAX_UINT32 = 0xffffffff;

// babel-minify transpiles RegExp('x', 'y') -> /x/y and it causes SyntaxError
var SUPPORTS_Y = !fails(function () { return !RegExp(MAX_UINT32, 'y'); });

// @@split logic
require('../internals/fix-regexp-well-known-symbol-logic')(
  'split',
  2,
  function (SPLIT, nativeSplit, maybeCallNative) {
    var internalSplit;
    if (
      'abbc'.split(/(b)*/)[1] == 'c' ||
      'test'.split(/(?:)/, -1).length != 4 ||
      'ab'.split(/(?:ab)*/).length != 2 ||
      '.'.split(/(.?)(.?)/).length != 4 ||
      '.'.split(/()()/).length > 1 ||
      ''.split(/.?/).length
    ) {
      // based on es5-shim implementation, need to rework it
      internalSplit = function (separator, limit) {
        var string = String(requireObjectCoercible(this));
        var lim = limit === undefined ? MAX_UINT32 : limit >>> 0;
        if (lim === 0) return [];
        if (separator === undefined) return [string];
        // If `separator` is not a regex, use native split
        if (!isRegExp(separator)) {
          return nativeSplit.call(string, separator, lim);
        }
        var output = [];
        var flags = (separator.ignoreCase ? 'i' : '') +
                    (separator.multiline ? 'm' : '') +
                    (separator.unicode ? 'u' : '') +
                    (separator.sticky ? 'y' : '');
        var lastLastIndex = 0;
        // Make `global` and avoid `lastIndex` issues by working with a copy
        var separatorCopy = new RegExp(separator.source, flags + 'g');
        var match, lastIndex, lastLength;
        while (match = regexpExec.call(separatorCopy, string)) {
          lastIndex = separatorCopy.lastIndex;
          if (lastIndex > lastLastIndex) {
            output.push(string.slice(lastLastIndex, match.index));
            if (match.length > 1 && match.index < string.length) arrayPush.apply(output, match.slice(1));
            lastLength = match[0].length;
            lastLastIndex = lastIndex;
            if (output.length >= lim) break;
          }
          if (separatorCopy.lastIndex === match.index) separatorCopy.lastIndex++; // Avoid an infinite loop
        }
        if (lastLastIndex === string.length) {
          if (lastLength || !separatorCopy.test('')) output.push('');
        } else output.push(string.slice(lastLastIndex));
        return output.length > lim ? output.slice(0, lim) : output;
      };
    // Chakra, V8
    } else if ('0'.split(undefined, 0).length) {
      internalSplit = function (separator, limit) {
        return separator === undefined && limit === 0 ? [] : nativeSplit.call(this, separator, limit);
      };
    } else internalSplit = nativeSplit;

    return [
      // `String.prototype.split` method
      // https://tc39.github.io/ecma262/#sec-string.prototype.split
      function split(separator, limit) {
        var O = requireObjectCoercible(this);
        var splitter = separator == undefined ? undefined : separator[SPLIT];
        return splitter !== undefined
          ? splitter.call(separator, O, limit)
          : internalSplit.call(String(O), separator, limit);
      },
      // `RegExp.prototype[@@split]` method
      // https://tc39.github.io/ecma262/#sec-regexp.prototype-@@split
      //
      // NOTE: This cannot be properly polyfilled in engines that don't support
      // the 'y' flag.
      function (regexp, limit) {
        var res = maybeCallNative(internalSplit, regexp, this, limit, internalSplit !== nativeSplit);
        if (res.done) return res.value;

        var rx = anObject(regexp);
        var S = String(this);
        var C = speciesConstructor(rx, RegExp);

        var unicodeMatching = rx.unicode;
        var flags = (rx.ignoreCase ? 'i' : '') +
                    (rx.multiline ? 'm' : '') +
                    (rx.unicode ? 'u' : '') +
                    (SUPPORTS_Y ? 'y' : 'g');

        // ^(? + rx + ) is needed, in combination with some S slicing, to
        // simulate the 'y' flag.
        var splitter = new C(SUPPORTS_Y ? rx : '^(?:' + rx.source + ')', flags);
        var lim = limit === undefined ? MAX_UINT32 : limit >>> 0;
        if (lim === 0) return [];
        if (S.length === 0) return callRegExpExec(splitter, S) === null ? [S] : [];
        var p = 0;
        var q = 0;
        var A = [];
        while (q < S.length) {
          splitter.lastIndex = SUPPORTS_Y ? q : 0;
          var z = callRegExpExec(splitter, SUPPORTS_Y ? S : S.slice(q));
          var e;
          if (
            z === null ||
            (e = min(toLength(splitter.lastIndex + (SUPPORTS_Y ? 0 : q)), S.length)) === p
          ) {
            q = advanceStringIndex(S, q, unicodeMatching);
          } else {
            A.push(S.slice(p, q));
            if (A.length === lim) return A;
            for (var i = 1; i <= z.length - 1; i++) {
              A.push(z[i]);
              if (A.length === lim) return A;
            }
            q = p = e;
          }
        }
        A.push(S.slice(p));
        return A;
      }
    ];
  },
  !SUPPORTS_Y
);

},{"../internals/advance-string-index":40,"../internals/an-object":41,"../internals/fails":63,"../internals/fix-regexp-well-known-symbol-logic":64,"../internals/is-regexp":81,"../internals/regexp-exec":103,"../internals/regexp-exec-abstract":102,"../internals/require-object-coercible":105,"../internals/species-constructor":112,"../internals/to-length":118}],143:[function(require,module,exports){
'use strict';
var internalStringTrim = require('../internals/string-trim');
var FORCED = require('../internals/forced-string-trim-method')('trim');

// `String.prototype.trim` method
// https://tc39.github.io/ecma262/#sec-string.prototype.trim
require('../internals/export')({ target: 'String', proto: true, forced: FORCED }, {
  trim: function trim() {
    return internalStringTrim(this, 3);
  }
});

},{"../internals/export":62,"../internals/forced-string-trim-method":65,"../internals/string-trim":114}],144:[function(require,module,exports){
// `Symbol.prototype.description` getter
// https://tc39.github.io/ecma262/#sec-symbol.prototype.description
'use strict';
var DESCRIPTORS = require('../internals/descriptors');
var has = require('../internals/has');
var isObject = require('../internals/is-object');
var defineProperty = require('../internals/object-define-property').f;
var copyConstructorProperties = require('../internals/copy-constructor-properties');
var NativeSymbol = require('../internals/global').Symbol;

if (DESCRIPTORS && typeof NativeSymbol == 'function' && (!('description' in NativeSymbol.prototype) ||
  // Safari 12 bug
  NativeSymbol().description !== undefined
)) {
  var EmptyStringDescriptionStore = {};
  // wrap Symbol constructor for correct work with undefined description
  var SymbolWrapper = function Symbol() {
    var description = arguments.length < 1 || arguments[0] === undefined ? undefined : String(arguments[0]);
    var result = this instanceof SymbolWrapper
      ? new NativeSymbol(description)
      // in Edge 13, String(Symbol(undefined)) === 'Symbol(undefined)'
      : description === undefined ? NativeSymbol() : NativeSymbol(description);
    if (description === '') EmptyStringDescriptionStore[result] = true;
    return result;
  };
  copyConstructorProperties(SymbolWrapper, NativeSymbol);
  var symbolPrototype = SymbolWrapper.prototype = NativeSymbol.prototype;
  symbolPrototype.constructor = SymbolWrapper;

  var symbolToString = symbolPrototype.toString;
  var native = String(NativeSymbol('test')) == 'Symbol(test)';
  var regexp = /^Symbol\((.*)\)[^)]+$/;
  defineProperty(symbolPrototype, 'description', {
    configurable: true,
    get: function description() {
      var symbol = isObject(this) ? this.valueOf() : this;
      var string = symbolToString.call(symbol);
      if (has(EmptyStringDescriptionStore, symbol)) return '';
      var desc = native ? string.slice(7, -1) : string.replace(regexp, '$1');
      return desc === '' ? undefined : desc;
    }
  });

  require('../internals/export')({ global: true, forced: true }, { Symbol: SymbolWrapper });
}

},{"../internals/copy-constructor-properties":50,"../internals/descriptors":57,"../internals/export":62,"../internals/global":68,"../internals/has":69,"../internals/is-object":79,"../internals/object-define-property":88}],145:[function(require,module,exports){
// `Symbol.iterator` well-known symbol
// https://tc39.github.io/ecma262/#sec-symbol.iterator
require('../internals/define-well-known-symbol')('iterator');

},{"../internals/define-well-known-symbol":56}],146:[function(require,module,exports){
'use strict';
// ECMAScript 6 symbols shim
var global = require('../internals/global');
var has = require('../internals/has');
var DESCRIPTORS = require('../internals/descriptors');
var IS_PURE = require('../internals/is-pure');
var $export = require('../internals/export');
var redefine = require('../internals/redefine');
var hiddenKeys = require('../internals/hidden-keys');
var fails = require('../internals/fails');
var shared = require('../internals/shared');
var setToStringTag = require('../internals/set-to-string-tag');
var uid = require('../internals/uid');
var wellKnownSymbol = require('../internals/well-known-symbol');
var wrappedWellKnownSymbolModule = require('../internals/wrapped-well-known-symbol');
var defineWellKnownSymbol = require('../internals/define-well-known-symbol');
var enumKeys = require('../internals/enum-keys');
var isArray = require('../internals/is-array');
var anObject = require('../internals/an-object');
var isObject = require('../internals/is-object');
var toIndexedObject = require('../internals/to-indexed-object');
var toPrimitive = require('../internals/to-primitive');
var createPropertyDescriptor = require('../internals/create-property-descriptor');
var nativeObjectCreate = require('../internals/object-create');
var getOwnPropertyNamesExternal = require('../internals/object-get-own-property-names-external');
var getOwnPropertyDescriptorModule = require('../internals/object-get-own-property-descriptor');
var definePropertyModule = require('../internals/object-define-property');
var propertyIsEnumerableModule = require('../internals/object-property-is-enumerable');
var hide = require('../internals/hide');
var objectKeys = require('../internals/object-keys');
var HIDDEN = require('../internals/shared-key')('hidden');
var InternalStateModule = require('../internals/internal-state');
var SYMBOL = 'Symbol';
var setInternalState = InternalStateModule.set;
var getInternalState = InternalStateModule.getterFor(SYMBOL);
var nativeGetOwnPropertyDescriptor = getOwnPropertyDescriptorModule.f;
var nativeDefineProperty = definePropertyModule.f;
var nativeGetOwnPropertyNames = getOwnPropertyNamesExternal.f;
var $Symbol = global.Symbol;
var JSON = global.JSON;
var nativeJSONStringify = JSON && JSON.stringify;
var PROTOTYPE = 'prototype';
var TO_PRIMITIVE = wellKnownSymbol('toPrimitive');
var nativePropertyIsEnumerable = propertyIsEnumerableModule.f;
var SymbolRegistry = shared('symbol-registry');
var AllSymbols = shared('symbols');
var ObjectPrototypeSymbols = shared('op-symbols');
var WellKnownSymbolsStore = shared('wks');
var ObjectPrototype = Object[PROTOTYPE];
var QObject = global.QObject;
var NATIVE_SYMBOL = require('../internals/native-symbol');
// Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
var USE_SETTER = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;

// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
var setSymbolDescriptor = DESCRIPTORS && fails(function () {
  return nativeObjectCreate(nativeDefineProperty({}, 'a', {
    get: function () { return nativeDefineProperty(this, 'a', { value: 7 }).a; }
  })).a != 7;
}) ? function (it, key, D) {
  var ObjectPrototypeDescriptor = nativeGetOwnPropertyDescriptor(ObjectPrototype, key);
  if (ObjectPrototypeDescriptor) delete ObjectPrototype[key];
  nativeDefineProperty(it, key, D);
  if (ObjectPrototypeDescriptor && it !== ObjectPrototype) {
    nativeDefineProperty(ObjectPrototype, key, ObjectPrototypeDescriptor);
  }
} : nativeDefineProperty;

var wrap = function (tag, description) {
  var symbol = AllSymbols[tag] = nativeObjectCreate($Symbol[PROTOTYPE]);
  setInternalState(symbol, {
    type: SYMBOL,
    tag: tag,
    description: description
  });
  if (!DESCRIPTORS) symbol.description = description;
  return symbol;
};

var isSymbol = NATIVE_SYMBOL && typeof $Symbol.iterator == 'symbol' ? function (it) {
  return typeof it == 'symbol';
} : function (it) {
  return Object(it) instanceof $Symbol;
};

var $defineProperty = function defineProperty(it, key, D) {
  if (it === ObjectPrototype) $defineProperty(ObjectPrototypeSymbols, key, D);
  anObject(it);
  key = toPrimitive(key, true);
  anObject(D);
  if (has(AllSymbols, key)) {
    if (!D.enumerable) {
      if (!has(it, HIDDEN)) nativeDefineProperty(it, HIDDEN, createPropertyDescriptor(1, {}));
      it[HIDDEN][key] = true;
    } else {
      if (has(it, HIDDEN) && it[HIDDEN][key]) it[HIDDEN][key] = false;
      D = nativeObjectCreate(D, { enumerable: createPropertyDescriptor(0, false) });
    } return setSymbolDescriptor(it, key, D);
  } return nativeDefineProperty(it, key, D);
};

var $defineProperties = function defineProperties(it, P) {
  anObject(it);
  var keys = enumKeys(P = toIndexedObject(P));
  var i = 0;
  var l = keys.length;
  var key;
  while (l > i) $defineProperty(it, key = keys[i++], P[key]);
  return it;
};

var $create = function create(it, P) {
  return P === undefined ? nativeObjectCreate(it) : $defineProperties(nativeObjectCreate(it), P);
};

var $propertyIsEnumerable = function propertyIsEnumerable(key) {
  var E = nativePropertyIsEnumerable.call(this, key = toPrimitive(key, true));
  if (this === ObjectPrototype && has(AllSymbols, key) && !has(ObjectPrototypeSymbols, key)) return false;
  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
};

var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key) {
  it = toIndexedObject(it);
  key = toPrimitive(key, true);
  if (it === ObjectPrototype && has(AllSymbols, key) && !has(ObjectPrototypeSymbols, key)) return;
  var D = nativeGetOwnPropertyDescriptor(it, key);
  if (D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key])) D.enumerable = true;
  return D;
};

var $getOwnPropertyNames = function getOwnPropertyNames(it) {
  var names = nativeGetOwnPropertyNames(toIndexedObject(it));
  var result = [];
  var i = 0;
  var key;
  while (names.length > i) {
    if (!has(AllSymbols, key = names[i++]) && !has(hiddenKeys, key)) result.push(key);
  } return result;
};

var $getOwnPropertySymbols = function getOwnPropertySymbols(it) {
  var IS_OP = it === ObjectPrototype;
  var names = nativeGetOwnPropertyNames(IS_OP ? ObjectPrototypeSymbols : toIndexedObject(it));
  var result = [];
  var i = 0;
  var key;
  while (names.length > i) {
    if (has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectPrototype, key) : true)) result.push(AllSymbols[key]);
  } return result;
};

// `Symbol` constructor
// https://tc39.github.io/ecma262/#sec-symbol-constructor
if (!NATIVE_SYMBOL) {
  $Symbol = function Symbol() {
    if (this instanceof $Symbol) throw TypeError('Symbol is not a constructor');
    var description = arguments[0] === undefined ? undefined : String(arguments[0]);
    var tag = uid(description);
    var setter = function (value) {
      if (this === ObjectPrototype) setter.call(ObjectPrototypeSymbols, value);
      if (has(this, HIDDEN) && has(this[HIDDEN], tag)) this[HIDDEN][tag] = false;
      setSymbolDescriptor(this, tag, createPropertyDescriptor(1, value));
    };
    if (DESCRIPTORS && USE_SETTER) setSymbolDescriptor(ObjectPrototype, tag, { configurable: true, set: setter });
    return wrap(tag, description);
  };
  redefine($Symbol[PROTOTYPE], 'toString', function toString() {
    return getInternalState(this).tag;
  });

  propertyIsEnumerableModule.f = $propertyIsEnumerable;
  definePropertyModule.f = $defineProperty;
  getOwnPropertyDescriptorModule.f = $getOwnPropertyDescriptor;
  require('../internals/object-get-own-property-names').f = getOwnPropertyNamesExternal.f = $getOwnPropertyNames;
  require('../internals/object-get-own-property-symbols').f = $getOwnPropertySymbols;

  if (DESCRIPTORS) {
    // https://github.com/tc39/proposal-Symbol-description
    nativeDefineProperty($Symbol[PROTOTYPE], 'description', {
      configurable: true,
      get: function description() {
        return getInternalState(this).description;
      }
    });
    if (!IS_PURE) {
      redefine(ObjectPrototype, 'propertyIsEnumerable', $propertyIsEnumerable, { unsafe: true });
    }
  }

  wrappedWellKnownSymbolModule.f = function (name) {
    return wrap(wellKnownSymbol(name), name);
  };
}

$export({ global: true, wrap: true, forced: !NATIVE_SYMBOL, sham: !NATIVE_SYMBOL }, { Symbol: $Symbol });

for (var wellKnownSymbols = objectKeys(WellKnownSymbolsStore), k = 0; wellKnownSymbols.length > k;) {
  defineWellKnownSymbol(wellKnownSymbols[k++]);
}

$export({ target: SYMBOL, stat: true, forced: !NATIVE_SYMBOL }, {
  // `Symbol.for` method
  // https://tc39.github.io/ecma262/#sec-symbol.for
  'for': function (key) {
    return has(SymbolRegistry, key += '')
      ? SymbolRegistry[key]
      : SymbolRegistry[key] = $Symbol(key);
  },
  // `Symbol.keyFor` method
  // https://tc39.github.io/ecma262/#sec-symbol.keyfor
  keyFor: function keyFor(sym) {
    if (!isSymbol(sym)) throw TypeError(sym + ' is not a symbol');
    for (var key in SymbolRegistry) if (SymbolRegistry[key] === sym) return key;
  },
  useSetter: function () { USE_SETTER = true; },
  useSimple: function () { USE_SETTER = false; }
});

$export({ target: 'Object', stat: true, forced: !NATIVE_SYMBOL, sham: !DESCRIPTORS }, {
  // `Object.create` method
  // https://tc39.github.io/ecma262/#sec-object.create
  create: $create,
  // `Object.defineProperty` method
  // https://tc39.github.io/ecma262/#sec-object.defineproperty
  defineProperty: $defineProperty,
  // `Object.defineProperties` method
  // https://tc39.github.io/ecma262/#sec-object.defineproperties
  defineProperties: $defineProperties,
  // `Object.getOwnPropertyDescriptor` method
  // https://tc39.github.io/ecma262/#sec-object.getownpropertydescriptors
  getOwnPropertyDescriptor: $getOwnPropertyDescriptor
});

$export({ target: 'Object', stat: true, forced: !NATIVE_SYMBOL }, {
  // `Object.getOwnPropertyNames` method
  // https://tc39.github.io/ecma262/#sec-object.getownpropertynames
  getOwnPropertyNames: $getOwnPropertyNames,
  // `Object.getOwnPropertySymbols` method
  // https://tc39.github.io/ecma262/#sec-object.getownpropertysymbols
  getOwnPropertySymbols: $getOwnPropertySymbols
});

// `JSON.stringify` method behavior with symbols
// https://tc39.github.io/ecma262/#sec-json.stringify
JSON && $export({ target: 'JSON', stat: true, forced: !NATIVE_SYMBOL || fails(function () {
  var symbol = $Symbol();
  // MS Edge converts symbol values to JSON as {}
  return nativeJSONStringify([symbol]) != '[null]'
    // WebKit converts symbol values to JSON as null
    || nativeJSONStringify({ a: symbol }) != '{}'
    // V8 throws on boxed symbols
    || nativeJSONStringify(Object(symbol)) != '{}';
}) }, {
  stringify: function stringify(it) {
    var args = [it];
    var i = 1;
    var replacer, $replacer;
    while (arguments.length > i) args.push(arguments[i++]);
    $replacer = replacer = args[1];
    if (!isObject(replacer) && it === undefined || isSymbol(it)) return; // IE8 returns string on undefined
    if (!isArray(replacer)) replacer = function (key, value) {
      if (typeof $replacer == 'function') value = $replacer.call(this, key, value);
      if (!isSymbol(value)) return value;
    };
    args[1] = replacer;
    return nativeJSONStringify.apply(JSON, args);
  }
});

// `Symbol.prototype[@@toPrimitive]` method
// https://tc39.github.io/ecma262/#sec-symbol.prototype-@@toprimitive
if (!$Symbol[PROTOTYPE][TO_PRIMITIVE]) hide($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
// `Symbol.prototype[@@toStringTag]` property
// https://tc39.github.io/ecma262/#sec-symbol.prototype-@@tostringtag
setToStringTag($Symbol, SYMBOL);

hiddenKeys[HIDDEN] = true;

},{"../internals/an-object":41,"../internals/create-property-descriptor":53,"../internals/define-well-known-symbol":56,"../internals/descriptors":57,"../internals/enum-keys":61,"../internals/export":62,"../internals/fails":63,"../internals/global":68,"../internals/has":69,"../internals/hidden-keys":70,"../internals/hide":71,"../internals/internal-state":76,"../internals/is-array":77,"../internals/is-object":79,"../internals/is-pure":80,"../internals/native-symbol":84,"../internals/object-create":86,"../internals/object-define-property":88,"../internals/object-get-own-property-descriptor":89,"../internals/object-get-own-property-names":91,"../internals/object-get-own-property-names-external":90,"../internals/object-get-own-property-symbols":92,"../internals/object-keys":95,"../internals/object-property-is-enumerable":96,"../internals/redefine":101,"../internals/set-to-string-tag":108,"../internals/shared":110,"../internals/shared-key":109,"../internals/to-indexed-object":116,"../internals/to-primitive":120,"../internals/uid":121,"../internals/well-known-symbol":123,"../internals/wrapped-well-known-symbol":125}],147:[function(require,module,exports){
var DOMIterables = require('../internals/dom-iterables');
var forEach = require('../internals/array-for-each');
var hide = require('../internals/hide');
var global = require('../internals/global');

for (var COLLECTION_NAME in DOMIterables) {
  var Collection = global[COLLECTION_NAME];
  var CollectionPrototype = Collection && Collection.prototype;
  // some Chrome versions have non-configurable methods on DOMTokenList
  if (CollectionPrototype && CollectionPrototype.forEach !== forEach) try {
    hide(CollectionPrototype, 'forEach', forEach);
  } catch (e) {
    CollectionPrototype.forEach = forEach;
  }
}

},{"../internals/array-for-each":42,"../internals/dom-iterables":59,"../internals/global":68,"../internals/hide":71}],148:[function(require,module,exports){
var DOMIterables = require('../internals/dom-iterables');
var ArrayIteratorMethods = require('../modules/es.array.iterator');
var global = require('../internals/global');
var hide = require('../internals/hide');
var wellKnownSymbol = require('../internals/well-known-symbol');
var ITERATOR = wellKnownSymbol('iterator');
var TO_STRING_TAG = wellKnownSymbol('toStringTag');
var ArrayValues = ArrayIteratorMethods.values;

for (var COLLECTION_NAME in DOMIterables) {
  var Collection = global[COLLECTION_NAME];
  var CollectionPrototype = Collection && Collection.prototype;
  if (CollectionPrototype) {
    // some Chrome versions have non-configurable methods on DOMTokenList
    if (CollectionPrototype[ITERATOR] !== ArrayValues) try {
      hide(CollectionPrototype, ITERATOR, ArrayValues);
    } catch (e) {
      CollectionPrototype[ITERATOR] = ArrayValues;
    }
    if (!CollectionPrototype[TO_STRING_TAG]) hide(CollectionPrototype, TO_STRING_TAG, COLLECTION_NAME);
    if (DOMIterables[COLLECTION_NAME]) for (var METHOD_NAME in ArrayIteratorMethods) {
      // some Chrome versions have non-configurable methods on DOMTokenList
      if (CollectionPrototype[METHOD_NAME] !== ArrayIteratorMethods[METHOD_NAME]) try {
        hide(CollectionPrototype, METHOD_NAME, ArrayIteratorMethods[METHOD_NAME]);
      } catch (e) {
        CollectionPrototype[METHOD_NAME] = ArrayIteratorMethods[METHOD_NAME];
      }
    }
  }
}

},{"../internals/dom-iterables":59,"../internals/global":68,"../internals/hide":71,"../internals/well-known-symbol":123,"../modules/es.array.iterator":128}],149:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],150:[function(require,module,exports){
"use strict";

// 営業日計算
var koyomi = require('../..').create();

var D = require('../../date-extra.js');

koyomi.regularHoliday = '土,日';
koyomi.seasonHoliday = '12/29-1/4';
koyomi.openOnHoliday = false;
/*
     2015/4/27 - 2015/5/10

      月 火 水 木 金 土 日
    4/27 28 29 30  1  2  3
            祝       休 祝
    5/ 4  5  6  7  8  9 10
      祝 祝 祝       休 休
*/

var add = koyomi.addBiz.bind(koyomi);

var eq = require('assert').deepEqual;

eq(add('2015-5-1', 0), D(2015, 5, 1));
eq(add('2015-5-2', 0), D(2015, 5, 7));
eq(add('2015-5-3', 0), D(2015, 5, 7));
eq(add('2015-5-4', 0), D(2015, 5, 7));
eq(add('2015-5-5', 0), D(2015, 5, 7));
eq(add('2015-5-6', 0), D(2015, 5, 7));
eq(add('2015-5-7', 0), D(2015, 5, 7));
eq(add('2015-5-1', 1), D(2015, 5, 7));
eq(add('2015-5-2', 1), D(2015, 5, 7));
eq(add('2015-5-3', 1), D(2015, 5, 7));
eq(add('2015-5-4', 1), D(2015, 5, 7));
eq(add('2015-5-5', 1), D(2015, 5, 7));
eq(add('2015-5-6', 1), D(2015, 5, 7));
eq(add('2015-5-7', 1), D(2015, 5, 8)); // include

eq(add('2015-5-1', 1, true), D(2015, 5, 1));
eq(add('2015-5-2', 1, true), D(2015, 5, 7));
eq(add('2015-5-6', 1, true), D(2015, 5, 7));
eq(add('2015-5-7', 1, true), D(2015, 5, 7));
eq(add('2015-5-1', 1, false), D(2015, 5, 7));
eq(add('2015-5-2', 1, false), D(2015, 5, 7));
eq(add('2015-5-6', 1, false), D(2015, 5, 7));
eq(add('2015-5-7', 1, false), D(2015, 5, 8)); // 年中無休

koyomi.regularHoliday = '';
koyomi.seasonHoliday = '';
koyomi.openOnHoliday = true;
eq(add('2015-5-2', 1), D(2015, 5, 3));
eq(add('2015-5-3', 1, true), D(2015, 5, 3));
koyomi.regularHoliday = '土,日'; // 既定に戻す

koyomi.seasonHoliday = '12/29-1/4'; // 既定に戻す

koyomi.openOnHoliday = false; // 既定に戻す
// season

koyomi.seasonHoliday = '12/29-12/31';
eq(add('2015-1-1', 1), D(2015, 1, 2));
koyomi.seasonHoliday = '12/20-1/20';
eq(add('2015-1-1', 1), D(2015, 1, 21));
koyomi.seasonHoliday = '1/1-1/5';
eq(add('2015-1-1', 1), D(2015, 1, 6));
koyomi.seasonHoliday = '12/29-1/6, 1/8';
eq(add('2015-1-1', 1), D(2015, 1, 7));
koyomi.seasonHoliday = '1/1-12/31';
eq(add('2015-1-1', 1), null); // 全休

koyomi.seasonHoliday = '12/29-1/3'; // 既定に戻す
// regular

koyomi.regularHoliday = '土,日';
eq(add('2015-2-13', 1), D(2015, 2, 16));
koyomi.regularHoliday = '';
eq(add('2015-2-13', 1), D(2015, 2, 14));
koyomi.regularHoliday = '木';
eq(add('2015-2-9', 1), D(2015, 2, 10));
eq(add('2015-2-10', 1), D(2015, 2, 13));
eq(add('2015-2-13', 1), D(2015, 2, 14));
koyomi.regularHoliday = '月,火,水,木,金,土,日';
eq(add('2015-2-13', 1), null);
koyomi.regularHoliday = '5,15,25';
eq(add('2015-2-4', 1), D(2015, 2, 6));
eq(add('2015-2-6', 1), D(2015, 2, 7));
koyomi.regularHoliday = '2火,3火';
eq(add('2015-2-9', 1), D(2015, 2, 12));
eq(add('2015-2-16', 1), D(2015, 2, 18));

koyomi.regularHoliday = function (t) {
  // 毎月 10日, 20日, 30日は定休日
  return t.getDate() % 10 === 0;
};

eq(add('2015-2-8', 1), D(2015, 2, 9));
eq(add('2015-2-9', 1), D(2015, 2, 12));
eq(add('2015-2-10', 1), D(2015, 2, 12));
eq(add('2015-2-19', 1), D(2015, 2, 21));
eq(add('2015-4-28', 1), D(2015, 5, 1));
koyomi.regularHoliday = '月,10,2火'; // 混合

eq(add('2015-2-6', 1), D(2015, 2, 7));
eq(add('2015-2-8', 1), D(2015, 2, 12));
koyomi.regularHoliday = '土,日'; // 既定に戻す
// holidays

koyomi.openOnHoliday = true;
eq(add('2015-2-10', 1), D(2015, 2, 11));
koyomi.openOnHoliday = false;
eq(add('2015-2-10', 1), D(2015, 2, 12));

},{"../..":8,"../../date-extra.js":1,"assert":34}],151:[function(require,module,exports){
"use strict";

require('./add-biz');

require('./biz-yyyymm');

require('./biz-from-to');

require('./biz-term');

require('./pass-biz');

require('./remain-biz');

require('./reset-biz-cache');

},{"./add-biz":150,"./biz-from-to":152,"./biz-term":153,"./biz-yyyymm":154,"./pass-biz":155,"./remain-biz":156,"./reset-biz-cache":157}],152:[function(require,module,exports){
"use strict";

// 営業日数
var koyomi = require('../..').create();

var count = koyomi.biz.bind(koyomi);

var test = require('assert').equal;

test(count('2015-1-1', '2015-1-1'), 0);
test(count('2015-1-1', '2015-1-31'), 19);
test(count('2015-5-1', '2015-5-31'), 18);
test(count('2015-1-1', '2015-12-31'), 242);

},{"../..":8,"assert":34}],153:[function(require,module,exports){
"use strict";

// 営業日数
var koyomi = require('../..').create();

var biz = koyomi.biz.bind(koyomi);

var eq = require('assert').equal;

require('../../date-extra.js');

koyomi.startMonth = 1;
koyomi.startWeek = '日';
koyomi.regularHoliday = '土,日';
koyomi.seasonHoliday = '12/29-1/4';
koyomi.openOnHoliday = false;
eq(biz(2015, 'y'), 19 + 19 + 22 + 21 + 18 + 22 + 22 + 21 + 19 + 21 + 19 + 19);
eq(biz('2015-01', 'm'), 19);
eq(biz('2015-1-13', 'w'), 4);
eq(biz('2015-1-13', 'd'), 1);

},{"../..":8,"../../date-extra.js":1,"assert":34}],154:[function(require,module,exports){
"use strict";

// 営業日数
var koyomi = require('../..').create();

var biz = koyomi.biz.bind(koyomi);

var eq = require('assert').equal;

koyomi.startMonth = 1;
koyomi.startWeek = '日';
koyomi.regularHoliday = '土,日';
koyomi.seasonHoliday = '12/29-1/4';
koyomi.openOnHoliday = false;
eq(biz(2015), 19 + 19 + 22 + 21 + 18 + 22 + 22 + 21 + 19 + 21 + 19 + 19);
eq(biz('2015'), 19 + 19 + 22 + 21 + 18 + 22 + 22 + 21 + 19 + 21 + 19 + 19);
eq(biz('2015-01'), 19);
eq(biz('2015-02'), 19);
eq(biz('2015-03'), 22);
eq(biz('2015-04'), 21);
eq(biz('2015-05'), 18);
eq(biz('2015-06'), 22);
eq(biz('2015-07'), 22);
eq(biz('2015-08'), 21);
eq(biz('2015-09'), 19);
eq(biz('2015-10'), 21);
eq(biz('2015-11'), 19);
eq(biz('2015-12'), 19);
eq(biz('2015年1月'), 19);
eq(biz('２０１５年１月'), 19);
eq(biz('平成二十七年一月'), null);

},{"../..":8,"assert":34}],155:[function(require,module,exports){
"use strict";

//経過営業日(月)
var koyomi = require('../..').create();

var pass = koyomi.passBiz.bind(koyomi);

var eq = require('assert').equal; //経過営業日(月)


eq(pass(20150501, 'm'), 1);
eq(pass(20150502, 'm'), 1);
eq(pass(20150503, 'm'), 1);
eq(pass(20150504, 'm'), 1);
eq(pass(20150505, 'm'), 1);
eq(pass(20150506, 'm'), 1);
eq(pass(20150507, 'm'), 2);
eq(pass(20150508, 'm'), 3);
eq(pass(20150509, 'm'), 3);
eq(pass(20150510, 'm'), 3);
eq(pass(20150511, 'm'), 4);
eq(pass(20150512, 'm'), 5);
eq(pass(20150513, 'm'), 6);
eq(pass(20150514, 'm'), 7);
eq(pass(20150515, 'm'), 8);
eq(pass(20150516, 'm'), 8);
eq(pass(20150517, 'm'), 8);
eq(pass(20150518, 'm'), 9);
eq(pass(20150519, 'm'), 10);
eq(pass(20150520, 'm'), 11);
eq(pass(20150521, 'm'), 12);
eq(pass(20150522, 'm'), 13);
eq(pass(20150523, 'm'), 13);
eq(pass(20150524, 'm'), 13);
eq(pass(20150525, 'm'), 14);
eq(pass(20150526, 'm'), 15);
eq(pass(20150527, 'm'), 16);
eq(pass(20150528, 'm'), 17);
eq(pass(20150529, 'm'), 18);
eq(pass(20150530, 'm'), 18);
eq(pass(20150531, 'm'), 18); //経過営業日(年度)

eq(pass(20150101, 'y'), 0);
eq(pass(20151231, 'y'), 242);
koyomi.startMonth = 4;
eq(pass(20150401, 'y'), 1);
eq(pass(20150402, 'y'), 2);
eq(pass(20150403, 'y'), 3);
eq(pass(20150404, 'y'), 3);
eq(pass(20150405, 'y'), 3);
eq(pass(20150406, 'y'), 4);
eq(pass(20150407, 'y'), 5);
eq(pass(20150408, 'y'), 6);
eq(pass(20150409, 'y'), 7);
eq(pass(20150410, 'y'), 8);
eq(pass(20150411, 'y'), 8);
eq(pass(20150412, 'y'), 8);
eq(pass(20150413, 'y'), 9);
eq(pass(20150414, 'y'), 10);
eq(pass(20150415, 'y'), 11);
eq(pass(20150416, 'y'), 12);
eq(pass(20150417, 'y'), 13);
eq(pass(20150418, 'y'), 13);
eq(pass(20150419, 'y'), 13);
eq(pass(20150420, 'y'), 14);
eq(pass(20150421, 'y'), 15);
eq(pass(20150422, 'y'), 16);
eq(pass(20150423, 'y'), 17);
eq(pass(20150424, 'y'), 18);
eq(pass(20150425, 'y'), 18);
eq(pass(20150426, 'y'), 18);
eq(pass(20150427, 'y'), 19);
eq(pass(20150428, 'y'), 20);
eq(pass(20150429, 'y'), 20);
eq(pass(20150430, 'y'), 21);
eq(pass(20150501, 'y'), 22);
eq(pass(20150502, 'y'), 22);
eq(pass(20150503, 'y'), 22);
eq(pass(20150504, 'y'), 22);
eq(pass(20150505, 'y'), 22);
eq(pass(20150506, 'y'), 22);
eq(pass(20150507, 'y'), 23);
eq(pass(20150508, 'y'), 24);
eq(pass(20150509, 'y'), 24);
eq(pass(20150510, 'y'), 24);
eq(pass(20150511, 'y'), 25);
eq(pass(20150512, 'y'), 26);
eq(pass(20150513, 'y'), 27);
eq(pass(20150514, 'y'), 28);
eq(pass(20150515, 'y'), 29);
eq(pass(20150516, 'y'), 29);
eq(pass(20150517, 'y'), 29);
eq(pass(20150518, 'y'), 30);
eq(pass(20150519, 'y'), 31);
eq(pass(20150520, 'y'), 32);
eq(pass(20150521, 'y'), 33);
eq(pass(20150522, 'y'), 34);
eq(pass(20150523, 'y'), 34);
eq(pass(20150524, 'y'), 34);
eq(pass(20150525, 'y'), 35);
eq(pass(20150526, 'y'), 36);
eq(pass(20150527, 'y'), 37);
eq(pass(20150528, 'y'), 38);
eq(pass(20150529, 'y'), 39);
eq(pass(20150530, 'y'), 39);
eq(pass(20150531, 'y'), 39);
eq(pass(20160301, 'y'), 222);
eq(pass(20160302, 'y'), 223);
eq(pass(20160303, 'y'), 224);
eq(pass(20160304, 'y'), 225);
eq(pass(20160305, 'y'), 225);
eq(pass(20160306, 'y'), 225);
eq(pass(20160307, 'y'), 226);
eq(pass(20160308, 'y'), 227);
eq(pass(20160309, 'y'), 228);
eq(pass(20160310, 'y'), 229);
eq(pass(20160311, 'y'), 230);
eq(pass(20160312, 'y'), 230);
eq(pass(20160313, 'y'), 230);
eq(pass(20160314, 'y'), 231);
eq(pass(20160315, 'y'), 232);
eq(pass(20160316, 'y'), 233);
eq(pass(20160317, 'y'), 234);
eq(pass(20160318, 'y'), 235);
eq(pass(20160319, 'y'), 235);
eq(pass(20160320, 'y'), 235);
eq(pass(20160321, 'y'), 235);
eq(pass(20160322, 'y'), 236);
eq(pass(20160323, 'y'), 237);
eq(pass(20160324, 'y'), 238);
eq(pass(20160325, 'y'), 239);
eq(pass(20160326, 'y'), 239);
eq(pass(20160327, 'y'), 239);
eq(pass(20160328, 'y'), 240);
eq(pass(20160329, 'y'), 241);
eq(pass(20160330, 'y'), 242);
eq(pass(20160331, 'y'), 243);

},{"../..":8,"assert":34}],156:[function(require,module,exports){
"use strict";

//残営業日
var koyomi = require('../..').create();

var remain = koyomi.remainBiz.bind(koyomi);

var eq = require('assert').equal;

require('../../date-extra');

koyomi.startMonth = 1;
koyomi.startWeek = '日';
koyomi.regularHoliday = '土,日';
koyomi.seasonHoliday = '12/29-1/4';
koyomi.openOnHoliday = false;
eq(remain(20150101, 'y'), 19 + 19 + 22 + 21 + 18 + 22 + 22 + 21 + 19 + 21 + 19 + 19);
eq(remain(20150102, 'y'), 19 + 19 + 22 + 21 + 18 + 22 + 22 + 21 + 19 + 21 + 19 + 19);
eq(remain(20150105, 'y'), 19 + 19 + 22 + 21 + 18 + 22 + 22 + 21 + 19 + 21 + 19 + 19);
eq(remain(20150106, 'y'), 18 + 19 + 22 + 21 + 18 + 22 + 22 + 21 + 19 + 21 + 19 + 19); // 月

eq(remain(20150501, 'm'), 18);
eq(remain(20150502, 'm'), 17);
eq(remain(20150503, 'm'), 17);
eq(remain(20150504, 'm'), 17);
eq(remain(20150505, 'm'), 17);
eq(remain(20150506, 'm'), 17);
eq(remain(20150507, 'm'), 17);
eq(remain(20150508, 'm'), 16);
eq(remain(20150509, 'm'), 15);
eq(remain(20150510, 'm'), 15);
eq(remain(20150511, 'm'), 15);
eq(remain(20150512, 'm'), 14);
eq(remain(20150513, 'm'), 13);
eq(remain(20150514, 'm'), 12);
eq(remain(20150515, 'm'), 11);
eq(remain(20150516, 'm'), 10);
eq(remain(20150517, 'm'), 10);
eq(remain(20150518, 'm'), 10);
eq(remain(20150519, 'm'), 9);
eq(remain(20150520, 'm'), 8);
eq(remain(20150521, 'm'), 7);
eq(remain(20150522, 'm'), 6);
eq(remain(20150523, 'm'), 5);
eq(remain(20150524, 'm'), 5);
eq(remain(20150525, 'm'), 5);
eq(remain(20150526, 'm'), 4);
eq(remain(20150527, 'm'), 3);
eq(remain(20150528, 'm'), 2);
eq(remain(20150529, 'm'), 1);
eq(remain(20150530, 'm'), 0);
eq(remain(20150531, 'm'), 0); // 年

koyomi.startMonth = 1;
eq(remain(20150101, 'y'), 242);
eq(remain(20151231, 'y'), 0);
koyomi.startMonth = 4;
eq(221, 18 + 22 + 22 + 21 + 19 + 21 + 19 + 19 + 18 + 20 + 22);
eq(remain(20150401, 'y'), 21 + 221);
eq(remain(20150402, 'y'), 20 + 221);
eq(remain(20150403, 'y'), 19 + 221);
eq(remain(20150404, 'y'), 18 + 221);
eq(remain(20150405, 'y'), 18 + 221);
eq(remain(20150406, 'y'), 18 + 221);
eq(remain(20150407, 'y'), 17 + 221);
eq(remain(20150408, 'y'), 16 + 221);
eq(remain(20150409, 'y'), 15 + 221);
eq(remain(20150410, 'y'), 14 + 221);
eq(remain(20150411, 'y'), 13 + 221);
eq(remain(20150412, 'y'), 13 + 221);
eq(remain(20150413, 'y'), 13 + 221);
eq(remain(20150414, 'y'), 12 + 221);
eq(remain(20150415, 'y'), 11 + 221);
eq(remain(20150416, 'y'), 10 + 221);
eq(remain(20150417, 'y'), 9 + 221);
eq(remain(20150418, 'y'), 8 + 221);
eq(remain(20150419, 'y'), 8 + 221);
eq(remain(20150420, 'y'), 8 + 221);
eq(remain(20150421, 'y'), 7 + 221);
eq(remain(20150422, 'y'), 6 + 221);
eq(remain(20150423, 'y'), 5 + 221);
eq(remain(20150424, 'y'), 4 + 221);
eq(remain(20150425, 'y'), 3 + 221);
eq(remain(20150426, 'y'), 3 + 221);
eq(remain(20150427, 'y'), 3 + 221);
eq(remain(20150428, 'y'), 2 + 221);
eq(remain(20150429, 'y'), 1 + 221);
eq(remain(20150430, 'y'), 1 + 221);
eq(203, 22 + 22 + 21 + 19 + 21 + 19 + 19 + 18 + 20 + 22);
eq(remain(20150501, 'y'), 18 + 203);
eq(remain(20150502, 'y'), 17 + 203);
eq(remain(20150503, 'y'), 17 + 203);
eq(remain(20150504, 'y'), 17 + 203);
eq(remain(20150505, 'y'), 17 + 203);
eq(remain(20150506, 'y'), 17 + 203);
eq(remain(20150507, 'y'), 17 + 203);
eq(remain(20150508, 'y'), 16 + 203);
eq(remain(20150509, 'y'), 15 + 203);
eq(remain(20150510, 'y'), 15 + 203);
eq(remain(20150511, 'y'), 15 + 203);
eq(remain(20150512, 'y'), 14 + 203);
eq(remain(20150513, 'y'), 13 + 203);
eq(remain(20150514, 'y'), 12 + 203);
eq(remain(20150515, 'y'), 11 + 203);
eq(remain(20150516, 'y'), 10 + 203);
eq(remain(20150517, 'y'), 10 + 203);
eq(remain(20150518, 'y'), 10 + 203);
eq(remain(20150519, 'y'), 9 + 203);
eq(remain(20150520, 'y'), 8 + 203);
eq(remain(20150521, 'y'), 7 + 203);
eq(remain(20150522, 'y'), 6 + 203);
eq(remain(20150523, 'y'), 5 + 203);
eq(remain(20150524, 'y'), 5 + 203);
eq(remain(20150525, 'y'), 5 + 203);
eq(remain(20150526, 'y'), 4 + 203);
eq(remain(20150527, 'y'), 3 + 203);
eq(remain(20150528, 'y'), 2 + 203);
eq(remain(20150529, 'y'), 1 + 203);
eq(remain(20150530, 'y'), 0 + 203);
eq(remain(20150531, 'y'), 0 + 203);
eq(remain(20160301, 'y'), 22);
eq(remain(20160302, 'y'), 21);
eq(remain(20160303, 'y'), 20);
eq(remain(20160304, 'y'), 19);
eq(remain(20160305, 'y'), 18);
eq(remain(20160306, 'y'), 18);
eq(remain(20160307, 'y'), 18);
eq(remain(20160308, 'y'), 17);
eq(remain(20160309, 'y'), 16);
eq(remain(20160310, 'y'), 15);
eq(remain(20160311, 'y'), 14);
eq(remain(20160312, 'y'), 13);
eq(remain(20160313, 'y'), 13);
eq(remain(20160314, 'y'), 13);
eq(remain(20160315, 'y'), 12);
eq(remain(20160316, 'y'), 11);
eq(remain(20160317, 'y'), 10);
eq(remain(20160318, 'y'), 9);
eq(remain(20160319, 'y'), 8);
eq(remain(20160320, 'y'), 8);
eq(remain(20160321, 'y'), 8);
eq(remain(20160322, 'y'), 8);
eq(remain(20160323, 'y'), 7);
eq(remain(20160324, 'y'), 6);
eq(remain(20160325, 'y'), 5);
eq(remain(20160326, 'y'), 4);
eq(remain(20160327, 'y'), 4);
eq(remain(20160328, 'y'), 4);
eq(remain(20160329, 'y'), 3);
eq(remain(20160330, 'y'), 2);
eq(remain(20160331, 'y'), 1);

},{"../..":8,"../../date-extra":1,"assert":34}],157:[function(require,module,exports){
"use strict";

//営業日キャッシュの消去
var koyomi = require('../..').create();

var biz = koyomi.biz.bind(koyomi);
var reset = koyomi.resetBizCache.bind(koyomi);

var eq = require('assert').deepEqual;

var D = require('../../date-extra');

koyomi.startMonth = 1;
koyomi.startWeek = '日';
koyomi.regularHoliday = '土,日';
koyomi.seasonHoliday = '12/29-1/4';
koyomi.openOnHoliday = false;
var cache = {
  '2015': 19 + 19 + 22 + 21 + 18 + 22 + 22 + 21 + 19 + 21 + 19 + 19,
  '2015-1': 19,
  '2015-2': 19,
  '2015-3': 22,
  '2015-4': 21,
  '2015-5': 18,
  '2015-6': 22,
  '2015-7': 22,
  '2015-8': 21,
  '2015-9': 19,
  '2015-10': 21,
  '2015-11': 19,
  '2015-12': 19
};
eq(biz(2015, 'y'), cache['2015']);
eq(koyomi.bizCache, cache);
reset(D(2015, 1, 1));
eq(koyomi.bizCache, {
  '2015-2': 19,
  '2015-3': 22,
  '2015-4': 21,
  '2015-5': 18,
  '2015-6': 22,
  '2015-7': 22,
  '2015-8': 21,
  '2015-9': 19,
  '2015-10': 21,
  '2015-11': 19,
  '2015-12': 19
});
biz(2015, 'y');
eq(koyomi.bizCache, cache);
reset();
eq(koyomi.bizCache, {});
biz(2015, 'y');
reset('year');
eq(koyomi.bizCache, {
  '2015-1': 19,
  '2015-2': 19,
  '2015-3': 22,
  '2015-4': 21,
  '2015-5': 18,
  '2015-6': 22,
  '2015-7': 22,
  '2015-8': 21,
  '2015-9': 19,
  '2015-10': 21,
  '2015-11': 19,
  '2015-12': 19
});

},{"../..":8,"../../date-extra":1,"assert":34}],158:[function(require,module,exports){
"use strict";

// 日計算
var koyomi = require('../..').create();

var add = koyomi.add.bind(koyomi);

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

eq(add('2015-1-1', '5年'), D(2020, 1, 1));
eq(add('2015-1-2', '5日'), D(2015, 1, 7));
eq(add('2015-1-1 00:00:00', '1年'), D(2016, 1, 1));
eq(add('2015-1-1 00:00:00', '1ヶ月'), D(2015, 2, 1));
eq(add('2015-1-1 00:00:00', '1週間'), D(2015, 1, 8));
eq(add('2015-1-1 00:00:00', '1日'), D(2015, 1, 2));
eq(add('2015-1-1 00:00:00', '1時間'), D(2015, 1, 1, 1, 0, 0));
eq(add('2015-1-1 00:00:00', '1分'), D(2015, 1, 1, 0, 1, 0));
eq(add('2015-1-1 00:00:00', '1秒'), D(2015, 1, 1, 0, 0, 1));
eq(add('2015-1-1 00:00:00', '1ミリ秒'), D(2015, 1, 1, 0, 0, 0, 1));
eq(add('2015-2-28', '1年'), D(2016, 2, 28));
eq(add('2016-2-29', '1年'), D(2017, 2, 28));
eq(add('2016-2-29', '4年'), D(2020, 2, 29));
eq(add('2015-1-31', '0ケ月'), D(2015, 1, 31));
eq(add('2015-1-31', '1ケ月'), D(2015, 2, 28));
eq(add('2015-1-31', '2ケ月'), D(2015, 3, 31));
eq(add('2015-1-31', '3ケ月'), D(2015, 4, 30));
eq(add('2015-1-31', '3ケ月前'), D(2014, 10, 31));
eq(add('2015-1-1', '1年3ヶ月'), D(2016, 4, 1));
eq(add('2015-1-1', '１年３ヶ月'), D(2016, 4, 1));
eq(add('2015-1-1', '一年三ヶ月'), D(2016, 4, 1));
eq(add('2015-1-1', '一年三ヶ月前'), D(2013, 10, 1));
eq(add('2016-1-1', '春まで'), null);
eq(add('2016-1-1', 'あと1日'), null);

},{"../..":8,"../../date-extra.js":1,"assert":34}],159:[function(require,module,exports){
"use strict";

require('./add');

require('./is-leap');

require('./get-range');

require('./from');

require('./to');

require('./diff');

require('./days');

require('./pass-days');

require('./remain-days');

require('./separate');

require('./get-age');

require('./kind');

},{"./add":158,"./days":160,"./diff":161,"./from":162,"./get-age":163,"./get-range":164,"./is-leap":165,"./kind":166,"./pass-days":167,"./remain-days":168,"./separate":169,"./to":170}],160:[function(require,module,exports){
"use strict";

// 期間
var koyomi = require('../..').create();

var days = koyomi.days.bind(koyomi);

var eq = require('assert').equal; // (yyyymm)


koyomi.startMonth = 1;
eq(days(1999), 365);
eq(days(2000), 366);
eq(days('2000年'), 366);
koyomi.startMonth = 4;
eq(days(1999), 366);
eq(days(2000), 365);
eq(days('2000年'), 365);
eq(days(200008), 31);
eq(days('2000-08'), 31);
eq(days('2000-8'), 31);
eq(days('2000年8月'), 31); // (date, term)

koyomi.startMonth = 1;
eq(days(1999, 'y'), 365);
eq(days(2000, 'y'), 366);
eq(days('2000年', 'y'), 366);
koyomi.startMonth = 4;
eq(days(1999, 'y'), 366);
eq(days(2000, 'y'), 365);
eq(days('2000年', 'y'), 365);
eq(days(200008, 'm'), 31);
eq(days('2000-08', 'm'), 31);
eq(days('2000-8', 'm'), 31);
eq(days('2000年8月', 'm'), 31); // (from, to)

eq(days('2015-1-1', '2015-1-15'), 15);
eq(days('2015-1-1', '2015-12-31'), 365);
eq(days('2015-10-10', '2016-1-15'), 22 + 30 + 31 + 15);

},{"../..":8,"assert":34}],161:[function(require,module,exports){
"use strict";

// 差
var koyomi = require('../..').create();

var diff = koyomi.diff.bind(koyomi);

var eq = require('assert').equal; // 日


eq(diff('2015-1-1', '2015-1-1'), 0);
eq(diff('2015-1-1', '2015-1-2'), 1);
eq(diff('2015-1-2', '2015-1-1'), -1);
eq(diff('2015-1-1', '2016-1-1'), 365); // 分

eq(diff('2015-01-01 00:00:00.000', '2015-01-01 00:10:00.000', '分'), 10);
eq(diff('2015-01-01 00:00:00.000', '2015-01-01 00:00:10.000', '分'), 0);
eq(diff('2015-01-01 00:00:00.000', '2015-01-01 00:00:00.000', '分'), 0);
eq(diff('2015-01-01 00:00:00.999', '2015-01-01 00:00:00.000', '分'), 0);
eq(diff('2015-01-01 00:00:59.000', '2015-01-01 00:00:00.000', '分'), 0);
eq(diff('2015-1-1', '2015-1-1', '分'), 0);
eq(diff('2015-1-1', '2015-1-2', '分'), 60 * 24);
eq(diff('0:00', '1:00', '分'), 60);
eq(diff('6時', '7時', '分'), 60);
eq(diff('6時30分', '7時30分', '分'), 60);
eq(diff('6時30分5秒', '7時30分10秒', '分'), 60); // 秒

eq(diff('2015-01-01 00:00:00.000', '2015-01-01 00:00:10.000', '秒'), 10);
eq(diff('2015-01-01 00:00:00.000', '2015-01-01 00:00:00.000', '秒'), 0);
eq(diff('2015-01-01 00:00:00.999', '2015-01-01 00:00:00.000', '秒'), 0);
eq(diff('2015-1-1', '2015-1-1', '秒'), 0);
eq(diff('2015-1-1', '2015-1-2', '秒'), 86400);
eq(diff('0:00', '1:00', '秒'), 3600);
eq(diff('6時', '7時', '秒'), 3600);
eq(diff('6時30分', '7時30分', '秒'), 3600);
eq(diff('6時30分5秒', '7時30分10秒', '秒'), 3605);

},{"../..":8,"assert":34}],162:[function(require,module,exports){
"use strict";

// 開始
var koyomi = require('../..').create();

var from = koyomi.from.bind(koyomi);

var eq = require('assert').deepEqual;

koyomi.startMonth = 1;
koyomi.startWeek = '月';
eq(from('2015-01-01 00:00:00.000', '年'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-12-31 23:59:59.999', '年'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:00.000', '月'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-31 23:59:59.999', '月'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-05 00:00:00.000', '週'), new Date(2015, 0, 5, 0, 0, 0, 0));
eq(from('2015-01-11 23:59:59.999', '週'), new Date(2015, 0, 5, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:00.000', '日'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 23:59:59.999', '日'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:00.000', '時'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:59:59.999', '時'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:00.000', '分'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:59.999', '分'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:00.000', '秒'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:00.999', '秒'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-02-05 12:34:56.789', '年'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-02-05 12:34:56.789', '月'), new Date(2015, 1, 1, 0, 0, 0, 0));
eq(from('2015-02-05 12:34:56.789', '週'), new Date(2015, 1, 2, 0, 0, 0, 0));
eq(from('2015-02-05 12:34:56.789', '日'), new Date(2015, 1, 5, 0, 0, 0, 0));
eq(from('2015-02-05 12:34:56.789', '時'), new Date(2015, 1, 5, 12, 0, 0, 0));
eq(from('2015-02-05 12:34:56.789', '分'), new Date(2015, 1, 5, 12, 34, 0, 0));
eq(from('2015-02-05 12:34:56.789', '秒'), new Date(2015, 1, 5, 12, 34, 56, 0));
koyomi.startMonth = 4;
koyomi.startWeek = '日';
eq(from('2015-01-01 00:00:00.000', '年'), new Date(2014, 3, 1, 0, 0, 0, 0));
eq(from('2015-12-31 23:59:59.999', '年'), new Date(2015, 3, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:00.000', '月'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-31 23:59:59.999', '月'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-05 00:00:00.000', '週'), new Date(2015, 0, 4, 0, 0, 0, 0));
eq(from('2015-01-11 23:59:59.999', '週'), new Date(2015, 0, 11, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:00.000', '日'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 23:59:59.999', '日'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:00.000', '時'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:59:59.999', '時'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:00.000', '分'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:59.999', '分'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:00.000', '秒'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-01-01 00:00:00.999', '秒'), new Date(2015, 0, 1, 0, 0, 0, 0));
eq(from('2015-02-05 12:34:56.789', '年'), new Date(2014, 3, 1, 0, 0, 0, 0));
eq(from('2015-02-05 12:34:56.789', '月'), new Date(2015, 1, 1, 0, 0, 0, 0));
eq(from('2015-02-05 12:34:56.789', '週'), new Date(2015, 1, 1, 0, 0, 0, 0));
eq(from('2015-02-05 12:34:56.789', '日'), new Date(2015, 1, 5, 0, 0, 0, 0));
eq(from('2015-02-05 12:34:56.789', '時'), new Date(2015, 1, 5, 12, 0, 0, 0));
eq(from('2015-02-05 12:34:56.789', '分'), new Date(2015, 1, 5, 12, 34, 0, 0));
eq(from('2015-02-05 12:34:56.789', '秒'), new Date(2015, 1, 5, 12, 34, 56, 0));
eq(from('2015-01-04 00:00:00.000', '週'), new Date(2015, 0, 4, 0, 0, 0, 0));
eq(from('2015-01-10 23:59:59.999', '週'), new Date(2015, 0, 4, 0, 0, 0, 0));

},{"../..":8,"assert":34}],163:[function(require,module,exports){
"use strict";

// 年齢計算
var koyomi = require('../..').create();

var get = koyomi.getAge.bind(koyomi);

var eq = require('assert').equal;

eq(get('1974-2-18', '2015-9-4'), 41);
eq(get('1974-2-18'), get('1974-2-18', new Date()));

},{"../..":8,"assert":34}],164:[function(require,module,exports){
"use strict";

// 期間
var koyomi = require('../..').create();

var get = koyomi.getRange.bind(koyomi);

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

koyomi.startMonth = 4;
koyomi.startWeek = '月';
eq(get(2000), {
  from: D(2000, 4, 1),
  to: D(2001, 3, 31, 23, 59, 59, 999)
});
eq(get('2000年'), {
  from: D(2000, 4, 1),
  to: D(2001, 3, 31, 23, 59, 59, 999)
});
eq(get('2000年', 'y'), {
  from: D(2000, 4, 1),
  to: D(2001, 3, 31, 23, 59, 59, 999)
});
eq(get(200010), {
  from: D(2000, 10, 1),
  to: D(2000, 10, 31, 23, 59, 59, 999)
});
eq(get('2000-10'), {
  from: D(2000, 10, 1),
  to: D(2000, 10, 31, 23, 59, 59, 999)
});
eq(get('2000-10', 'm'), {
  from: D(2000, 10, 1),
  to: D(2000, 10, 31, 23, 59, 59, 999)
});
eq(get('2000年10月'), {
  from: D(2000, 10, 1),
  to: D(2000, 10, 31, 23, 59, 59, 999)
});
eq(get('2000年10月', 'm'), {
  from: D(2000, 10, 1),
  to: D(2000, 10, 31, 23, 59, 59, 999)
});
eq(get('2015-10-1', 'w'), {
  from: D(2015, 9, 28),
  to: D(2015, 10, 4, 23, 59, 59, 999)
});
eq(get('2015-10-1', 'd'), {
  from: D(2015, 10, 1),
  to: D(2015, 10, 1, 23, 59, 59, 999)
});
eq(get('2015-10-1 12:34:56.789', 'h'), {
  from: D(2015, 10, 1, 12, 0, 0, 0),
  to: D(2015, 10, 1, 12, 59, 59, 999)
});
eq(get('2015-10-1 12:34:56.789', 'i'), {
  from: D(2015, 10, 1, 12, 34, 0, 0),
  to: D(2015, 10, 1, 12, 34, 59, 999)
});
eq(get('2015-10-1 12:34:56.789', 's'), {
  from: D(2015, 10, 1, 12, 34, 56, 0),
  to: D(2015, 10, 1, 12, 34, 56, 999)
});
eq(get('2015-10-1 12:34:56.789', 'ms'), {
  from: D(2015, 10, 1, 12, 34, 56, 789),
  to: D(2015, 10, 1, 12, 34, 56, 789)
});

},{"../..":8,"../../date-extra.js":1,"assert":34}],165:[function(require,module,exports){
"use strict";

// 差
var koyomi = require('../..').create();

var isLeap = koyomi.isLeap.bind(koyomi);

var eq = require('assert').equal;

eq(isLeap(1600), true);
eq(isLeap(1700), false);
eq(isLeap(1800), false);
eq(isLeap(1900), false);
eq(isLeap(1996), true);
eq(isLeap(1997), false);
eq(isLeap(1998), false);
eq(isLeap(1999), false);
eq(isLeap(2000), true);
eq(isLeap(2001), false);
eq(isLeap(2002), false);
eq(isLeap(2003), false);
eq(isLeap(2004), true);
koyomi.startMonth = 4;
eq(isLeap('1999'), false);
eq(isLeap('2000'), true);
eq(isLeap('2001'), false);
eq(isLeap('2002'), false);

},{"../..":8,"assert":34}],166:[function(require,module,exports){
"use strict";

// 口語表現
var koyomi = require('../..').create();

var kind = koyomi.kind.bind(koyomi);

var eq = require('assert').equal;

eq(kind(new Date()), 'たった今');
eq(kind('2:00', '1:55'), '5分後');
eq(kind('2:00', '10:00'), '8時間前');
eq(kind('10:00', '2:00'), '8時間後');
eq(kind('2015-10-1', '2015-10-4'), '3日前');
eq(kind('2015-10-4', '2015-10-1'), '3日後');
eq(kind('2015-10-5', '2015-12-1'), '1ヶ月前');
eq(kind('2015-10-4', '2015-12-1'), '2ヶ月前');
eq(kind('2015-10-1', '2015-12-1'), '2ヶ月前');
eq(kind('2015-9-30', '2015-12-1'), '2ヶ月前');
eq(kind('2015-9-4', '2015-12-1'), '2ヶ月前');
eq(kind('2015-9-3', '2015-12-1'), '3ヶ月前');

},{"../..":8,"assert":34}],167:[function(require,module,exports){
"use strict";

// 経過日数
var koyomi = require('../..').create();

var pass = koyomi.passDays.bind(koyomi);

var eq = require('assert').equal;

koyomi.startMonth = 1;
eq(pass('2015-3-14', 'y'), 31 + 28 + 14);
koyomi.startMonth = 4;
eq(pass('2015-6-20', 'y'), 30 + 31 + 20);
eq(pass('2015-6-20', 'm'), 20);
koyomi.startWeek = '日';
eq(pass('2015-6-18', 'w'), 5);

},{"../..":8,"assert":34}],168:[function(require,module,exports){
"use strict";

// 経過日数
var koyomi = require('../..').create();

var remain = koyomi.remainDays.bind(koyomi);

var eq = require('assert').equal;

koyomi.startMonth = 1;
eq(remain('2015-10-14', 'y'), 18 + 30 + 31);
koyomi.startMonth = 4;
eq(remain('2015-1-20', 'y'), 12 + 28 + 31);
eq(remain('2015-6-20', 'm'), 11);
koyomi.startWeek = '日';
eq(remain('2015-6-18', 'w'), 3);

},{"../..":8,"assert":34}],169:[function(require,module,exports){
"use strict";

// 期間の分割
var koyomi = require('../..').create();

var sp = koyomi.separate.bind(koyomi);

var eq = require('assert').deepEqual;

koyomi.startMonth = 1; // 2015-1-1 .. 2015/12/31

var r = sp(new Date(2015, 0, 1), new Date(2015, 11, 31));
eq(r, {
  years: [new Date(2015, 0, 1)],
  months: [],
  days: []
}); // ここのテストはutils/separate.jsで細かく行います

},{"../..":8,"assert":34}],170:[function(require,module,exports){
"use strict";

// 終了
var koyomi = require('../..').create();

var to = koyomi.to.bind(koyomi);

var eq = require('assert').deepEqual;

koyomi.startMonth = 1;
koyomi.startWeek = '月';
eq(to('2015-01-01 00:00:00.000', '年'), new Date(2015, 11, 31, 23, 59, 59, 999));
eq(to('2015-12-31 23:59:59.999', '年'), new Date(2015, 11, 31, 23, 59, 59, 999));
eq(to('2015-01-01 00:00:00.000', '月'), new Date(2015, 0, 31, 23, 59, 59, 999));
eq(to('2015-01-31 23:59:59.999', '月'), new Date(2015, 0, 31, 23, 59, 59, 999));
eq(to('2015-01-05 00:00:00.000', '週'), new Date(2015, 0, 11, 23, 59, 59, 999));
eq(to('2015-01-11 23:59:59.999', '週'), new Date(2015, 0, 11, 23, 59, 59, 999));
eq(to('2015-01-01 00:00:00.000', '日'), new Date(2015, 0, 1, 23, 59, 59, 999));
eq(to('2015-01-01 23:59:59.999', '日'), new Date(2015, 0, 1, 23, 59, 59, 999));
eq(to('2015-01-01 00:00:00.000', '時'), new Date(2015, 0, 1, 0, 59, 59, 999));
eq(to('2015-01-01 00:59:59.999', '時'), new Date(2015, 0, 1, 0, 59, 59, 999));
eq(to('2015-01-01 00:00:00.000', '分'), new Date(2015, 0, 1, 0, 0, 59, 999));
eq(to('2015-01-01 00:00:59.999', '分'), new Date(2015, 0, 1, 0, 0, 59, 999));
eq(to('2015-01-01 00:00:00.000', '秒'), new Date(2015, 0, 1, 0, 0, 0, 999));
eq(to('2015-01-01 00:00:00.999', '秒'), new Date(2015, 0, 1, 0, 0, 0, 999));
eq(to('2015-02-05 12:34:56.789', '年'), new Date(2015, 11, 31, 23, 59, 59, 999));
eq(to('2015-02-05 12:34:56.789', '月'), new Date(2015, 1, 28, 23, 59, 59, 999));
eq(to('2015-02-05 12:34:56.789', '週'), new Date(2015, 1, 8, 23, 59, 59, 999));
eq(to('2015-02-05 12:34:56.789', '日'), new Date(2015, 1, 5, 23, 59, 59, 999));
eq(to('2015-02-05 12:34:56.789', '時'), new Date(2015, 1, 5, 12, 59, 59, 999));
eq(to('2015-02-05 12:34:56.789', '分'), new Date(2015, 1, 5, 12, 34, 59, 999));
eq(to('2015-02-05 12:34:56.789', '秒'), new Date(2015, 1, 5, 12, 34, 56, 999));
koyomi.startMonth = 4;
koyomi.startWeek = '日';
eq(to('2015-01-01 00:00:00.000', '年'), new Date(2015, 2, 31, 23, 59, 59, 999));
eq(to('2015-12-31 23:59:59.999', '年'), new Date(2016, 2, 31, 23, 59, 59, 999));
eq(to('2015-01-01 00:00:00.000', '月'), new Date(2015, 0, 31, 23, 59, 59, 999));
eq(to('2015-01-31 23:59:59.999', '月'), new Date(2015, 0, 31, 23, 59, 59, 999));
eq(to('2015-01-05 00:00:00.000', '週'), new Date(2015, 0, 10, 23, 59, 59, 999));
eq(to('2015-01-11 23:59:59.999', '週'), new Date(2015, 0, 17, 23, 59, 59, 999));
eq(to('2015-01-01 00:00:00.000', '日'), new Date(2015, 0, 1, 23, 59, 59, 999));
eq(to('2015-01-01 23:59:59.999', '日'), new Date(2015, 0, 1, 23, 59, 59, 999));
eq(to('2015-01-01 00:00:00.000', '時'), new Date(2015, 0, 1, 0, 59, 59, 999));
eq(to('2015-01-01 00:59:59.999', '時'), new Date(2015, 0, 1, 0, 59, 59, 999));
eq(to('2015-01-01 00:00:00.000', '分'), new Date(2015, 0, 1, 0, 0, 59, 999));
eq(to('2015-01-01 00:00:59.999', '分'), new Date(2015, 0, 1, 0, 0, 59, 999));
eq(to('2015-01-01 00:00:00.000', '秒'), new Date(2015, 0, 1, 0, 0, 0, 999));
eq(to('2015-01-01 00:00:00.999', '秒'), new Date(2015, 0, 1, 0, 0, 0, 999));
eq(to('2015-02-05 12:34:56.789', '年'), new Date(2015, 2, 31, 23, 59, 59, 999));
eq(to('2015-02-05 12:34:56.789', '月'), new Date(2015, 1, 28, 23, 59, 59, 999));
eq(to('2015-02-05 12:34:56.789', '週'), new Date(2015, 1, 7, 23, 59, 59, 999));
eq(to('2015-02-05 12:34:56.789', '日'), new Date(2015, 1, 5, 23, 59, 59, 999));
eq(to('2015-02-05 12:34:56.789', '時'), new Date(2015, 1, 5, 12, 59, 59, 999));
eq(to('2015-02-05 12:34:56.789', '分'), new Date(2015, 1, 5, 12, 34, 59, 999));
eq(to('2015-02-05 12:34:56.789', '秒'), new Date(2015, 1, 5, 12, 34, 56, 999));
eq(to('2015-01-04 00:00:00.000', '週'), new Date(2015, 0, 10, 23, 59, 59, 999));
eq(to('2015-01-10 23:59:59.999', '週'), new Date(2015, 0, 10, 23, 59, 59, 999));

},{"../..":8,"assert":34}],171:[function(require,module,exports){
"use strict";

require('./events');

require('./get-cal-data');

require('./get-cal-data2');

},{"./events":172,"./get-cal-data":173,"./get-cal-data2":174}],172:[function(require,module,exports){
"use strict";

//イベント
var koyomi = require('../..').create();

var get = koyomi.getEvents.bind(koyomi);
var add = koyomi.addEvent.bind(koyomi);
var remove = koyomi.removeEvent.bind(koyomi);

var eq = require('assert').deepEqual;

koyomi.startWeek = '日';
eq(get('2015-1-1'), []);
eq(add('2015-1-1', 'イベント0'), 0);
eq(get('2015-1-1'), ['イベント0']);
eq(add('2015-1-1', 'イベント1'), 1);
eq(get('2015-1-1'), ['イベント0', 'イベント1']);
eq(remove('2015-1-1', 0), true);
eq(get('2015-1-1'), ['イベント1']);
eq(remove('2015-1-1', 5), false);
eq(get('2015-1-1'), ['イベント1']);
var day = koyomi.getCalendarData('2015/1')[4];
eq(day.events, ['イベント1']);

},{"../..":8,"assert":34}],173:[function(require,module,exports){
"use strict";

/*jshint maxlen:500 */
// カレンダーデータの取得
var koyomi = require('../..').create();

koyomi.startWeek = '日';
koyomi.startMonth = 1;

var eq = require('assert').deepEqual;

var data = koyomi.getCalendarData('2015/1');
var result = [{
  som: true,
  eom: false,
  sow: true,
  eow: false,
  ghost: true,
  block: '2015/01',
  year: 2014,
  month: 12,
  day: 28,
  week: 0,
  open: false,
  close: '定休日',
  holiday: '',
  weekNumber: 1,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: true,
  block: '2015/01',
  year: 2014,
  month: 12,
  day: 29,
  week: 1,
  open: false,
  close: '年末年始のお休み',
  holiday: '',
  weekNumber: 1,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: true,
  block: '2015/01',
  year: 2014,
  month: 12,
  day: 30,
  week: 2,
  open: false,
  close: '年末年始のお休み',
  holiday: '',
  weekNumber: 1,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: true,
  block: '2015/01',
  year: 2014,
  month: 12,
  day: 31,
  week: 3,
  open: false,
  close: '年末年始のお休み',
  holiday: '',
  weekNumber: 1,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 1,
  week: 4,
  open: false,
  close: '年末年始のお休み',
  holiday: '元日',
  weekNumber: 1,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 2,
  week: 5,
  open: false,
  close: '年末年始のお休み',
  holiday: '',
  weekNumber: 1,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: true,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 3,
  week: 6,
  open: false,
  close: '年末年始のお休み',
  holiday: '',
  weekNumber: 1,
  events: []
}, {
  som: false,
  eom: false,
  sow: true,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 4,
  week: 0,
  open: false,
  close: '定休日',
  holiday: '',
  weekNumber: 2,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 5,
  week: 1,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 2,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 6,
  week: 2,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 2,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 7,
  week: 3,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 2,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 8,
  week: 4,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 2,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 9,
  week: 5,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 2,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: true,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 10,
  week: 6,
  open: false,
  close: '定休日',
  holiday: '',
  weekNumber: 2,
  events: []
}, {
  som: false,
  eom: false,
  sow: true,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 11,
  week: 0,
  open: false,
  close: '定休日',
  holiday: '',
  weekNumber: 3,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 12,
  week: 1,
  open: false,
  close: '成人の日',
  holiday: '成人の日',
  weekNumber: 3,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 13,
  week: 2,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 3,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 14,
  week: 3,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 3,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 15,
  week: 4,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 3,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 16,
  week: 5,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 3,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: true,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 17,
  week: 6,
  open: false,
  close: '定休日',
  holiday: '',
  weekNumber: 3,
  events: []
}, {
  som: false,
  eom: false,
  sow: true,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 18,
  week: 0,
  open: false,
  close: '定休日',
  holiday: '',
  weekNumber: 4,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 19,
  week: 1,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 4,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 20,
  week: 2,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 4,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 21,
  week: 3,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 4,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 22,
  week: 4,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 4,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 23,
  week: 5,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 4,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: true,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 24,
  week: 6,
  open: false,
  close: '定休日',
  holiday: '',
  weekNumber: 4,
  events: []
}, {
  som: false,
  eom: false,
  sow: true,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 25,
  week: 0,
  open: false,
  close: '定休日',
  holiday: '',
  weekNumber: 5,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 26,
  week: 1,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 5,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 27,
  week: 2,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 5,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 28,
  week: 3,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 5,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 29,
  week: 4,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 5,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 30,
  week: 5,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 5,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: true,
  ghost: false,
  block: '2015/01',
  year: 2015,
  month: 1,
  day: 31,
  week: 6,
  open: false,
  close: '定休日',
  holiday: '',
  weekNumber: 5,
  events: []
}, {
  som: false,
  eom: false,
  sow: true,
  eow: false,
  ghost: true,
  block: '2015/01',
  year: 2015,
  month: 2,
  day: 1,
  week: 0,
  open: false,
  close: '定休日',
  holiday: '',
  weekNumber: 6,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: true,
  block: '2015/01',
  year: 2015,
  month: 2,
  day: 2,
  week: 1,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 6,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: true,
  block: '2015/01',
  year: 2015,
  month: 2,
  day: 3,
  week: 2,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 6,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: true,
  block: '2015/01',
  year: 2015,
  month: 2,
  day: 4,
  week: 3,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 6,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: true,
  block: '2015/01',
  year: 2015,
  month: 2,
  day: 5,
  week: 4,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 6,
  events: []
}, {
  som: false,
  eom: false,
  sow: false,
  eow: false,
  ghost: true,
  block: '2015/01',
  year: 2015,
  month: 2,
  day: 6,
  week: 5,
  open: true,
  close: '',
  holiday: '',
  weekNumber: 6,
  events: []
}, {
  som: false,
  eom: true,
  sow: false,
  eow: true,
  ghost: true,
  block: '2015/01',
  year: 2015,
  month: 2,
  day: 7,
  week: 6,
  open: false,
  close: '定休日',
  holiday: '',
  weekNumber: 6,
  events: []
}]; // data.forEach((x,i)=>{console.log(i);eq(x, result[i]);});

eq(data, result);

},{"../..":8,"assert":34}],174:[function(require,module,exports){
"use strict";

/*jshint maxlen:500 */
// カレンダーデータの取得
var koyomi = require('../..').create();

koyomi.startMonth = 1;
koyomi.startWeek = '月';

var eq = require('assert').deepEqual;

var data = koyomi.getCalendarData('2015/4-2015/6');
var result = [{
  block: '2015/04',
  som: true,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 3,
  day: 30,
  week: 1,
  weekNumber: 1,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 3,
  day: 31,
  week: 2,
  weekNumber: 1,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 1,
  week: 3,
  weekNumber: 1,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 2,
  week: 4,
  weekNumber: 1,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 3,
  week: 5,
  weekNumber: 1,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 4,
  week: 6,
  weekNumber: 1,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 4,
  day: 5,
  week: 0,
  weekNumber: 1,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 4,
  day: 6,
  week: 1,
  weekNumber: 2,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 7,
  week: 2,
  weekNumber: 2,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 8,
  week: 3,
  weekNumber: 2,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 9,
  week: 4,
  weekNumber: 2,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 10,
  week: 5,
  weekNumber: 2,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 11,
  week: 6,
  weekNumber: 2,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 4,
  day: 12,
  week: 0,
  weekNumber: 2,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 4,
  day: 13,
  week: 1,
  weekNumber: 3,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 14,
  week: 2,
  weekNumber: 3,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 15,
  week: 3,
  weekNumber: 3,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 16,
  week: 4,
  weekNumber: 3,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 17,
  week: 5,
  weekNumber: 3,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 18,
  week: 6,
  weekNumber: 3,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 4,
  day: 19,
  week: 0,
  weekNumber: 3,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 4,
  day: 20,
  week: 1,
  weekNumber: 4,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 21,
  week: 2,
  weekNumber: 4,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 22,
  week: 3,
  weekNumber: 4,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 23,
  week: 4,
  weekNumber: 4,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 24,
  week: 5,
  weekNumber: 4,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 25,
  week: 6,
  weekNumber: 4,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 4,
  day: 26,
  week: 0,
  weekNumber: 4,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 4,
  day: 27,
  week: 1,
  weekNumber: 5,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 28,
  week: 2,
  weekNumber: 5,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 29,
  week: 3,
  weekNumber: 5,
  open: false,
  close: '昭和の日',
  holiday: '昭和の日',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 30,
  week: 4,
  weekNumber: 5,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 1,
  week: 5,
  weekNumber: 5,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 2,
  week: 6,
  weekNumber: 5,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 5,
  day: 3,
  week: 0,
  weekNumber: 5,
  open: false,
  close: '定休日',
  holiday: '憲法記念日',
  events: [],
  ghost: true
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 5,
  day: 4,
  week: 1,
  weekNumber: 6,
  open: false,
  close: 'みどりの日',
  holiday: 'みどりの日',
  events: [],
  ghost: true
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 5,
  week: 2,
  weekNumber: 6,
  open: false,
  close: 'こどもの日',
  holiday: 'こどもの日',
  events: [],
  ghost: true
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 6,
  week: 3,
  weekNumber: 6,
  open: false,
  close: '振替休日',
  holiday: '振替休日',
  events: [],
  ghost: true
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 7,
  week: 4,
  weekNumber: 6,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 8,
  week: 5,
  weekNumber: 6,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/04',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 9,
  week: 6,
  weekNumber: 6,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/04',
  som: false,
  eom: true,
  sow: false,
  eow: true,
  year: 2015,
  month: 5,
  day: 10,
  week: 0,
  weekNumber: 6,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/05',
  som: true,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 4,
  day: 27,
  week: 1,
  weekNumber: 5,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 28,
  week: 2,
  weekNumber: 5,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 29,
  week: 3,
  weekNumber: 5,
  open: false,
  close: '昭和の日',
  holiday: '昭和の日',
  events: [],
  ghost: true
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 4,
  day: 30,
  week: 4,
  weekNumber: 5,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 1,
  week: 5,
  weekNumber: 5,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 2,
  week: 6,
  weekNumber: 5,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 5,
  day: 3,
  week: 0,
  weekNumber: 5,
  open: false,
  close: '定休日',
  holiday: '憲法記念日',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 5,
  day: 4,
  week: 1,
  weekNumber: 6,
  open: false,
  close: 'みどりの日',
  holiday: 'みどりの日',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 5,
  week: 2,
  weekNumber: 6,
  open: false,
  close: 'こどもの日',
  holiday: 'こどもの日',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 6,
  week: 3,
  weekNumber: 6,
  open: false,
  close: '振替休日',
  holiday: '振替休日',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 7,
  week: 4,
  weekNumber: 6,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 8,
  week: 5,
  weekNumber: 6,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 9,
  week: 6,
  weekNumber: 6,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 5,
  day: 10,
  week: 0,
  weekNumber: 6,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 5,
  day: 11,
  week: 1,
  weekNumber: 7,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 12,
  week: 2,
  weekNumber: 7,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 13,
  week: 3,
  weekNumber: 7,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 14,
  week: 4,
  weekNumber: 7,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 15,
  week: 5,
  weekNumber: 7,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 16,
  week: 6,
  weekNumber: 7,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 5,
  day: 17,
  week: 0,
  weekNumber: 7,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 5,
  day: 18,
  week: 1,
  weekNumber: 8,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 19,
  week: 2,
  weekNumber: 8,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 20,
  week: 3,
  weekNumber: 8,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 21,
  week: 4,
  weekNumber: 8,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 22,
  week: 5,
  weekNumber: 8,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 23,
  week: 6,
  weekNumber: 8,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 5,
  day: 24,
  week: 0,
  weekNumber: 8,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 5,
  day: 25,
  week: 1,
  weekNumber: 9,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 26,
  week: 2,
  weekNumber: 9,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 27,
  week: 3,
  weekNumber: 9,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 28,
  week: 4,
  weekNumber: 9,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 29,
  week: 5,
  weekNumber: 9,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 5,
  day: 30,
  week: 6,
  weekNumber: 9,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 5,
  day: 31,
  week: 0,
  weekNumber: 9,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 6,
  day: 1,
  week: 1,
  weekNumber: 10,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 2,
  week: 2,
  weekNumber: 10,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 3,
  week: 3,
  weekNumber: 10,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 4,
  week: 4,
  weekNumber: 10,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 5,
  week: 5,
  weekNumber: 10,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/05',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 6,
  week: 6,
  weekNumber: 10,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/05',
  som: false,
  eom: true,
  sow: false,
  eow: true,
  year: 2015,
  month: 6,
  day: 7,
  week: 0,
  weekNumber: 10,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/06',
  som: true,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 6,
  day: 1,
  week: 1,
  weekNumber: 10,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 2,
  week: 2,
  weekNumber: 10,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 3,
  week: 3,
  weekNumber: 10,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 4,
  week: 4,
  weekNumber: 10,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 5,
  week: 5,
  weekNumber: 10,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 6,
  week: 6,
  weekNumber: 10,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 6,
  day: 7,
  week: 0,
  weekNumber: 10,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 6,
  day: 8,
  week: 1,
  weekNumber: 11,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 9,
  week: 2,
  weekNumber: 11,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 10,
  week: 3,
  weekNumber: 11,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 11,
  week: 4,
  weekNumber: 11,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 12,
  week: 5,
  weekNumber: 11,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 13,
  week: 6,
  weekNumber: 11,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 6,
  day: 14,
  week: 0,
  weekNumber: 11,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 6,
  day: 15,
  week: 1,
  weekNumber: 12,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 16,
  week: 2,
  weekNumber: 12,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 17,
  week: 3,
  weekNumber: 12,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 18,
  week: 4,
  weekNumber: 12,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 19,
  week: 5,
  weekNumber: 12,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 20,
  week: 6,
  weekNumber: 12,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 6,
  day: 21,
  week: 0,
  weekNumber: 12,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 6,
  day: 22,
  week: 1,
  weekNumber: 13,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 23,
  week: 2,
  weekNumber: 13,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 24,
  week: 3,
  weekNumber: 13,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 25,
  week: 4,
  weekNumber: 13,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 26,
  week: 5,
  weekNumber: 13,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 27,
  week: 6,
  weekNumber: 13,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 6,
  day: 28,
  week: 0,
  weekNumber: 13,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 6,
  day: 29,
  week: 1,
  weekNumber: 14,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 6,
  day: 30,
  week: 2,
  weekNumber: 14,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: false
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 7,
  day: 1,
  week: 3,
  weekNumber: 14,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 7,
  day: 2,
  week: 4,
  weekNumber: 14,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 7,
  day: 3,
  week: 5,
  weekNumber: 14,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 7,
  day: 4,
  week: 6,
  weekNumber: 14,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: true,
  year: 2015,
  month: 7,
  day: 5,
  week: 0,
  weekNumber: 14,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: true,
  eow: false,
  year: 2015,
  month: 7,
  day: 6,
  week: 1,
  weekNumber: 15,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 7,
  day: 7,
  week: 2,
  weekNumber: 15,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 7,
  day: 8,
  week: 3,
  weekNumber: 15,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 7,
  day: 9,
  week: 4,
  weekNumber: 15,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 7,
  day: 10,
  week: 5,
  weekNumber: 15,
  open: true,
  close: '',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/06',
  som: false,
  eom: false,
  sow: false,
  eow: false,
  year: 2015,
  month: 7,
  day: 11,
  week: 6,
  weekNumber: 15,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: true
}, {
  block: '2015/06',
  som: false,
  eom: true,
  sow: false,
  eow: true,
  year: 2015,
  month: 7,
  day: 12,
  week: 0,
  weekNumber: 15,
  open: false,
  close: '定休日',
  holiday: '',
  events: [],
  ghost: true
}]; // data.forEach((x,i)=>{console.log(i);eq(x, result[i]);});

eq(data, result);

},{"../..":8,"assert":34}],175:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 午前午後
// AA, aa, A


eq(format('2015-1-1', 'AA'), 'AM');
eq(format('2015-1-1', 'aa'), 'am');
eq(format('2015-1-1', 'A'), '午前');
eq(format('2015-1-1 12:00', 'AA'), 'PM');
eq(format('2015-1-1 12:00', 'aa'), 'pm');
eq(format('2015-1-1 12:00', 'A'), '午後');
eq(format('2015-1-1 12:00', 'AA'), 'PM');
eq(format('2015-1-1 12:00', 'aa'), 'pm');
eq(format('2015-1-1 12:00', 'A'), '午後');
eq(format('23:59:59', 'AA'), 'PM');
eq(format('23:59:59', 'aa'), 'pm');
eq(format('23:59:59', 'A'), '午後');
eq(format('0:00:00', 'AA'), 'AM');
eq(format('0:00:00', 'aa'), 'am');
eq(format('0:00:00', 'A'), '午前');
eq(format('11:59:59', 'AA'), 'AM');
eq(format('11:59:59', 'aa'), 'am');
eq(format('11:59:59', 'A'), '午前');
eq(format('12:00', 'AA'), 'PM');
eq(format('12:00', 'aa'), 'pm');
eq(format('12:00', 'A'), '午後');

},{"../..":8,"assert":34}],176:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal;

koyomi.startMonth = 1; // 営業日数(年)
// BBB, BB, B

eq(format(201501, 'BBB'), '242');
eq(format(201601, 'BBB'), '243');
eq(format(20150101, 'BB'), '0');
eq(format(20150101, 'B'), '242');
eq(format(20151231, 'B'), '0'); // 営業日数(月)
// bbb, bb, b

eq(format(20150101, 'bbb'), '19');
eq(format(20150301, 'bbb'), '22');
eq(format(20150101, 'bb'), '0');
eq(format(20150101, 'b'), '19');

},{"../..":8,"assert":34}],177:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 年 - 総日数、経過日数、残日数
// CCC CC C


koyomi.startMonth = 4;
eq(format(20150401, 'CCC'), '366');
eq(format(20150401, 'CC'), '1');
eq(format(20150402, 'C'), '365'); // 月 - 総日数、経過日数、残日数
// ccc cc c

eq(format(20150101, 'ccc'), '31');
eq(format(20150101, 'cc'), '1');
eq(format(20150102, 'c'), '30');

},{"../..":8,"assert":34}],178:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 日
// DD D


eq(format('2015-1-1', 'DD'), '01');
eq(format('2015-1-2', 'DD'), '02');
eq(format('2015-1-3', 'DD'), '03');
eq(format('2015-1-4', 'DD'), '04');
eq(format('2015-1-5', 'DD'), '05');
eq(format('2015-1-6', 'DD'), '06');
eq(format('2015-1-7', 'DD'), '07');
eq(format('2015-1-8', 'DD'), '08');
eq(format('2015-1-9', 'DD'), '09');
eq(format('2015-1-10', 'DD'), '10');
eq(format('2015-1-11', 'DD'), '11');
eq(format('2015-1-12', 'DD'), '12');
eq(format('2015-1-13', 'DD'), '13');
eq(format('2015-1-14', 'DD'), '14');
eq(format('2015-1-15', 'DD'), '15');
eq(format('2015-1-16', 'DD'), '16');
eq(format('2015-1-17', 'DD'), '17');
eq(format('2015-1-18', 'DD'), '18');
eq(format('2015-1-19', 'DD'), '19');
eq(format('2015-1-20', 'DD'), '20');
eq(format('2015-1-21', 'DD'), '21');
eq(format('2015-1-22', 'DD'), '22');
eq(format('2015-1-23', 'DD'), '23');
eq(format('2015-1-24', 'DD'), '24');
eq(format('2015-1-25', 'DD'), '25');
eq(format('2015-1-26', 'DD'), '26');
eq(format('2015-1-27', 'DD'), '27');
eq(format('2015-1-28', 'DD'), '28');
eq(format('2015-1-29', 'DD'), '29');
eq(format('2015-1-30', 'DD'), '30');
eq(format('2015-1-31', 'DD'), '31');
eq(format('2015-1-1', 'D>2'), '01');
eq(format('2015-1-2', 'D>2'), '02');
eq(format('2015-1-3', 'D>2'), '03');
eq(format('2015-1-4', 'D>2'), '04');
eq(format('2015-1-5', 'D>2'), '05');
eq(format('2015-1-6', 'D>2'), '06');
eq(format('2015-1-7', 'D>2'), '07');
eq(format('2015-1-8', 'D>2'), '08');
eq(format('2015-1-9', 'D>2'), '09');
eq(format('2015-1-10', 'D>2'), '10');
eq(format('2015-1-11', 'D>2'), '11');
eq(format('2015-1-12', 'D>2'), '12');
eq(format('2015-1-13', 'D>2'), '13');
eq(format('2015-1-14', 'D>2'), '14');
eq(format('2015-1-15', 'D>2'), '15');
eq(format('2015-1-16', 'D>2'), '16');
eq(format('2015-1-17', 'D>2'), '17');
eq(format('2015-1-18', 'D>2'), '18');
eq(format('2015-1-19', 'D>2'), '19');
eq(format('2015-1-20', 'D>2'), '20');
eq(format('2015-1-21', 'D>2'), '21');
eq(format('2015-1-22', 'D>2'), '22');
eq(format('2015-1-23', 'D>2'), '23');
eq(format('2015-1-24', 'D>2'), '24');
eq(format('2015-1-25', 'D>2'), '25');
eq(format('2015-1-26', 'D>2'), '26');
eq(format('2015-1-27', 'D>2'), '27');
eq(format('2015-1-28', 'D>2'), '28');
eq(format('2015-1-29', 'D>2'), '29');
eq(format('2015-1-30', 'D>2'), '30');
eq(format('2015-1-31', 'D>2'), '31'); // D

eq(format('2015-1-1', 'D'), '1');
eq(format('2015-1-2', 'D'), '2');
eq(format('2015-1-3', 'D'), '3');
eq(format('2015-1-4', 'D'), '4');
eq(format('2015-1-5', 'D'), '5');
eq(format('2015-1-6', 'D'), '6');
eq(format('2015-1-7', 'D'), '7');
eq(format('2015-1-8', 'D'), '8');
eq(format('2015-1-9', 'D'), '9');
eq(format('2015-1-10', 'D'), '10');
eq(format('2015-1-11', 'D'), '11');
eq(format('2015-1-12', 'D'), '12');
eq(format('2015-1-13', 'D'), '13');
eq(format('2015-1-14', 'D'), '14');
eq(format('2015-1-15', 'D'), '15');
eq(format('2015-1-16', 'D'), '16');
eq(format('2015-1-17', 'D'), '17');
eq(format('2015-1-18', 'D'), '18');
eq(format('2015-1-19', 'D'), '19');
eq(format('2015-1-20', 'D'), '20');
eq(format('2015-1-21', 'D'), '21');
eq(format('2015-1-22', 'D'), '22');
eq(format('2015-1-23', 'D'), '23');
eq(format('2015-1-24', 'D'), '24');
eq(format('2015-1-25', 'D'), '25');
eq(format('2015-1-26', 'D'), '26');
eq(format('2015-1-27', 'D'), '27');
eq(format('2015-1-28', 'D'), '28');
eq(format('2015-1-29', 'D'), '29');
eq(format('2015-1-30', 'D'), '30');
eq(format('2015-1-31', 'D'), '31'); // D>>漢数字

eq(format('2015-1-1', 'D>>漢数字'), '一');
eq(format('2015-1-2', 'D>>漢数字'), '二');
eq(format('2015-1-3', 'D>>漢数字'), '三');
eq(format('2015-1-4', 'D>>漢数字'), '四');
eq(format('2015-1-5', 'D>>漢数字'), '五');
eq(format('2015-1-6', 'D>>漢数字'), '六');
eq(format('2015-1-7', 'D>>漢数字'), '七');
eq(format('2015-1-8', 'D>>漢数字'), '八');
eq(format('2015-1-9', 'D>>漢数字'), '九');
eq(format('2015-1-10', 'D>>漢数字'), '十');
eq(format('2015-1-11', 'D>>漢数字'), '十一');
eq(format('2015-1-12', 'D>>漢数字'), '十二');
eq(format('2015-1-13', 'D>>漢数字'), '十三');
eq(format('2015-1-14', 'D>>漢数字'), '十四');
eq(format('2015-1-15', 'D>>漢数字'), '十五');
eq(format('2015-1-16', 'D>>漢数字'), '十六');
eq(format('2015-1-17', 'D>>漢数字'), '十七');
eq(format('2015-1-18', 'D>>漢数字'), '十八');
eq(format('2015-1-19', 'D>>漢数字'), '十九');
eq(format('2015-1-20', 'D>>漢数字'), '二十');
eq(format('2015-1-21', 'D>>漢数字'), '二十一');
eq(format('2015-1-22', 'D>>漢数字'), '二十二');
eq(format('2015-1-23', 'D>>漢数字'), '二十三');
eq(format('2015-1-24', 'D>>漢数字'), '二十四');
eq(format('2015-1-25', 'D>>漢数字'), '二十五');
eq(format('2015-1-26', 'D>>漢数字'), '二十六');
eq(format('2015-1-27', 'D>>漢数字'), '二十七');
eq(format('2015-1-28', 'D>>漢数字'), '二十八');
eq(format('2015-1-29', 'D>>漢数字'), '二十九');
eq(format('2015-1-30', 'D>>漢数字'), '三十');
eq(format('2015-1-31', 'D>>漢数字'), '三十一'); // D>>漢字

eq(format('2015-1-1', 'D>>漢字'), '一');
eq(format('2015-1-2', 'D>>漢字'), '二');
eq(format('2015-1-3', 'D>>漢字'), '三');
eq(format('2015-1-4', 'D>>漢字'), '四');
eq(format('2015-1-5', 'D>>漢字'), '五');
eq(format('2015-1-6', 'D>>漢字'), '六');
eq(format('2015-1-7', 'D>>漢字'), '七');
eq(format('2015-1-8', 'D>>漢字'), '八');
eq(format('2015-1-9', 'D>>漢字'), '九');
eq(format('2015-1-10', 'D>>漢字'), '一〇');
eq(format('2015-1-11', 'D>>漢字'), '一一');
eq(format('2015-1-12', 'D>>漢字'), '一二');
eq(format('2015-1-13', 'D>>漢字'), '一三');
eq(format('2015-1-14', 'D>>漢字'), '一四');
eq(format('2015-1-15', 'D>>漢字'), '一五');
eq(format('2015-1-16', 'D>>漢字'), '一六');
eq(format('2015-1-17', 'D>>漢字'), '一七');
eq(format('2015-1-18', 'D>>漢字'), '一八');
eq(format('2015-1-19', 'D>>漢字'), '一九');
eq(format('2015-1-20', 'D>>漢字'), '二〇');
eq(format('2015-1-21', 'D>>漢字'), '二一');
eq(format('2015-1-22', 'D>>漢字'), '二二');
eq(format('2015-1-23', 'D>>漢字'), '二三');
eq(format('2015-1-24', 'D>>漢字'), '二四');
eq(format('2015-1-25', 'D>>漢字'), '二五');
eq(format('2015-1-26', 'D>>漢字'), '二六');
eq(format('2015-1-27', 'D>>漢字'), '二七');
eq(format('2015-1-28', 'D>>漢字'), '二八');
eq(format('2015-1-29', 'D>>漢字'), '二九');
eq(format('2015-1-30', 'D>>漢字'), '三〇');
eq(format('2015-1-31', 'D>>漢字'), '三一');

},{"../..":8,"assert":34}],179:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 営業日・休業日
// EE E e


eq(format('2015-1-1', 'EE'), '休業日');
eq(format('2015-1-1', 'E'), '休業日');
eq(format('2015-1-5', 'EE'), '月曜日');
eq(format('2015-1-5', 'E'), '営業日');
eq(format('2015-1-1', 'e'), '年末年始のお休み');
eq(format('2015-1-2', 'e'), '年末年始のお休み');
eq(format('2015-1-3', 'e'), '年末年始のお休み');
eq(format('2015-1-4', 'e'), '定休日');
eq(format('2015-1-5', 'e'), '');
koyomi.regularHoliday = '月';
eq(format('2015-1-5', 'e'), '定休日');
eq(format('2015-5-3', 'e'), '憲法記念日');
koyomi.openOnHoliday = true;
eq(format('2015-5-3', 'e'), '');

},{"../..":8,"assert":34}],180:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 祝日
// FF F ff f


eq(format('2015-1-1', 'FF'), '元日');
eq(format('2015-1-1', 'F'), '元日');
eq(format('2015-1-1', 'ff'), '祝日');
eq(format('2015-1-1', 'f'), '祝日');
eq(format('2015-1-5', 'FF'), '月曜日');
eq(format('2015-1-5', 'F'), '');
eq(format('2015-1-5', 'ff'), '月曜日');
eq(format('2015-1-5', 'f'), '');

},{"../..":8,"assert":34}],181:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal;

function test(input, GGG, GG, G, gg, g) {
  eq(format(input, 'GGG'), GGG);
  eq(format(input, 'GG'), GG);
  eq(format(input, 'G'), G);
  eq(format(input, 'gg'), gg);
  eq(format(input, 'g'), g);
} // 年号
// GGG GG G gg g


test('1872-01-01', '2532', '西暦', '', '西暦', '');
test('1872-12-31', '2532', '西暦', '', '西暦', '');
test('1873-01-01', '2533', '明治', 'M', '明治', 'M');
test('1911-12-31', '2571', '明治', 'M', '明治', 'M');
test('1912-01-01', '2572', '大正', 'T', '明治', 'M');
test('1912-07-29', '2572', '大正', 'T', '明治', 'M');
test('1912-07-30', '2572', '大正', 'T', '大正', 'T');
test('1925-12-31', '2585', '大正', 'T', '大正', 'T');
test('1926-01-01', '2586', '昭和', 'S', '大正', 'T');
test('1926-12-24', '2586', '昭和', 'S', '大正', 'T');
test('1926-12-25', '2586', '昭和', 'S', '昭和', 'S');
test('1988-12-31', '2648', '昭和', 'S', '昭和', 'S');
test('1989-01-01', '2649', '平成', 'H', '昭和', 'S');
test('1989-01-07', '2649', '平成', 'H', '昭和', 'S');
test('1989-01-08', '2649', '平成', 'H', '平成', 'H');
test('1990-01-01', '2650', '平成', 'H', '平成', 'H');
test('2015-04-27', '2675', '平成', 'H', '平成', 'H');
test('2019-08-01', '2679', '令和', 'R', '令和', 'R');
test('2020-01-01', '2680', '令和', 'R', '令和', 'R');
eq(format('1872-1-1', 'GG>1'), '西');
eq(format('1873-1-1', 'GG>1'), '明');
eq(format('1912-1-1', 'GG>1'), '大');
eq(format('1926-1-1', 'GG>1'), '昭');
eq(format('1989-1-1', 'GG>1'), '平');
eq(format('2019-1-1', 'GG>1'), '令');

},{"../..":8,"assert":34}],182:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 時間
// HH, H, hh, hh


eq(format('2015-1-1', 'HH'), '00');
eq(format('2015-1-1', 'H'), '0');
eq(format('2015-1-1', 'hh'), '00');
eq(format('2015-1-1', 'h'), '0');
eq(format('2015-1-1 8:00', 'HH'), '08');
eq(format('2015-1-1 8:00', 'H'), '8');
eq(format('2015-1-1 8:00', 'hh'), '08');
eq(format('2015-1-1 8:00', 'h'), '8');
eq(format('2015-1-1 12:00', 'HH'), '12');
eq(format('2015-1-1 12:00', 'H'), '12');
eq(format('2015-1-1 12:00', 'hh'), '00');
eq(format('2015-1-1 12:00', 'h'), '0');
eq(format('2015-1-1 23:00', 'HH'), '23');
eq(format('2015-1-1 23:00', 'H'), '23');
eq(format('2015-1-1 23:00', 'hh'), '11');
eq(format('2015-1-1 23:00', 'h'), '11');
eq(format('23:59:59', 'HH'), '23');
eq(format('23:59:59', 'H'), '23');
eq(format('23:59:59', 'hh'), '11');
eq(format('23:59:59', 'h'), '11');
eq(format('0:00:00', 'HH'), '00');
eq(format('0:00:00', 'H'), '0');
eq(format('0:00:00', 'hh'), '00');
eq(format('0:00:00', 'h'), '0');
eq(format('11:59:59', 'HH'), '11');
eq(format('11:59:59', 'H'), '11');
eq(format('11:59:59', 'hh'), '11');
eq(format('11:59:59', 'h'), '11');
eq(format('12:00', 'HH'), '12');
eq(format('12:00', 'H'), '12');
eq(format('12:00', 'hh'), '00');
eq(format('12:00', 'h'), '0'); // 0 padding

eq(format('15:00', 'HH>5'), '15');
eq(format('15:00', 'H>5'), '00015');
eq(format('15:00', 'hh>5'), '03');
eq(format('15:00', 'h>5'), '00003');

},{"../..":8,"assert":34}],183:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 分 II, I


eq(format('2015-1-1', 'II'), '00');
eq(format('2015-1-1', 'I'), '0');
eq(format('00:09:10', 'II'), '09');
eq(format('00:09:10', 'I'), '9');
eq(format('00:12:56', 'II'), '12');
eq(format('00:12:56', 'I'), '12');

},{"../..":8,"assert":34}],184:[function(require,module,exports){
// 未使用
"use strict";

},{}],185:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 現在時刻から計算した日時を返す


function d(ad) {
  return koyomi.add(new Date(), ad);
} // 口語
// K


eq(format(new Date(), 'K'), 'たった今');
eq(format(d('-10分'), 'K'), '10分前');
eq(format(d('10分'), 'K'), '10分後'); // TODO: テストの充実

},{"../..":8,"assert":34}],186:[function(require,module,exports){
// 未使用
"use strict";

},{}],187:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 月
// MMM, MM, M, Mj


eq(format('2015-1-1', 'MMM'), 'January');
eq(format('2015-2-1', 'MMM'), 'February');
eq(format('2015-3-1', 'MMM'), 'March');
eq(format('2015-4-1', 'MMM'), 'April');
eq(format('2015-5-1', 'MMM'), 'May');
eq(format('2015-6-1', 'MMM'), 'June');
eq(format('2015-7-1', 'MMM'), 'July');
eq(format('2015-8-1', 'MMM'), 'August');
eq(format('2015-9-1', 'MMM'), 'September');
eq(format('2015-10-1', 'MMM'), 'October');
eq(format('2015-11-1', 'MMM'), 'November');
eq(format('2015-12-1', 'MMM'), 'December');
eq(format('2015-4-1', 'MM'), '04');
eq(format('2015-12-1', 'MM'), '12');
eq(format('2015-4-1', 'M'), '4');
eq(format('2015-12-1', 'M'), '12');
eq(format('2015-12-1', 'M>>漢数字'), '十二');

},{"../..":8,"assert":34}],188:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal;

function test(input, N, n) {
  eq(format(input, 'N'), N);
  eq(format(input, 'n'), n);
} // N: 平成     n: H     y: 1989     d: 1989-01-08
// N: 昭和     n: S     y: 1926     d: 1926-12-25
// N: 大正     n: T     y: 1912     d: 1912-07-30
// N: 明治     n: M     y: 1868     d: 1868-01-25
// N: 西暦     n: -     y:    1     d: 0001-01-01
// 年(和暦)
// N, n


test('1867-12-31', '1867', '1867');
test('1868-01-01', '1868', '1868');
test('1868-01-24', '1868', '1868');
test('1868-01-25', '1868', '1868');
test('1872-01-01', '1872', '1872');
test('1872-12-31', '1872', '1872');
test('1873-01-01', '6', '6');
test('1911-12-31', '44', '44');
test('1912-01-01', '1', '45');
test('1912-07-29', '1', '45');
test('1912-07-30', '1', '1');
test('1925-12-31', '14', '14');
test('1926-01-01', '1', '15');
test('1926-12-24', '1', '15');
test('1926-12-25', '1', '1');
test('1988-12-31', '63', '63');
test('1989-01-01', '1', '64');
test('1989-01-07', '1', '64');
test('1989-01-08', '1', '1');
test('1990-01-01', '2', '2');
test('2015-04-27', '27', '27');

},{"../..":8,"assert":34}],189:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal;

var D = require('../../date-extra.js');

var today = new Date();
var y = today.getFullYear();
var m = today.getMonth() + 1;
var d = today.getDate(); // 年齢
// O

eq(format(today, 'O'), '0');
eq(format(D(y - 1, m, d), 'O'), '1');
eq(format(D(y - 10, m, d + 1), 'O'), '9');
eq(format(D(y - 10, m, d), 'O'), '10');
eq(format(D(y - 10, m, d - 1), 'O'), '10');

},{"../..":8,"../../date-extra.js":1,"assert":34}],190:[function(require,module,exports){
// 未使用
"use strict";

},{}],191:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal;

koyomi.startMonth = 1; // 四半期
// Q

eq(format(201501, 'Q'), '1');
eq(format(201502, 'Q'), '1');
eq(format(201503, 'Q'), '1');
eq(format(201504, 'Q'), '2');
eq(format(201505, 'Q'), '2');
eq(format(201506, 'Q'), '2');
eq(format(201507, 'Q'), '3');
eq(format(201508, 'Q'), '3');
eq(format(201509, 'Q'), '3');
eq(format(201510, 'Q'), '4');
eq(format(201511, 'Q'), '4');
eq(format(201512, 'Q'), '4');
koyomi.startMonth = 9;
eq(format(201501, 'Q'), '2');
eq(format(201502, 'Q'), '2');
eq(format(201503, 'Q'), '3');
eq(format(201504, 'Q'), '3');
eq(format(201505, 'Q'), '3');
eq(format(201506, 'Q'), '4');
eq(format(201507, 'Q'), '4');
eq(format(201508, 'Q'), '4');
eq(format(201509, 'Q'), '1');
eq(format(201510, 'Q'), '1');
eq(format(201511, 'Q'), '1');
eq(format(201512, 'Q'), '2');
koyomi.startMonth = 5;
eq(format(201501, 'Q'), '3');
eq(format(201502, 'Q'), '4');
eq(format(201503, 'Q'), '4');
eq(format(201504, 'Q'), '4');
eq(format(201505, 'Q'), '1');
eq(format(201506, 'Q'), '1');
eq(format(201507, 'Q'), '1');
eq(format(201508, 'Q'), '2');
eq(format(201509, 'Q'), '2');
eq(format(201510, 'Q'), '2');
eq(format(201511, 'Q'), '3');
eq(format(201512, 'Q'), '3');

},{"../..":8,"assert":34}],192:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal;

koyomi.startMonth = 1;
koyomi.startWeek = '月'; // 週番号
// R r

eq(format(201501, 'R'), '1');
eq(format(201502, 'R'), '5');
eq(format(201503, 'R'), '9');
eq(format(201504, 'R'), '14');
eq(format(201505, 'R'), '18');
eq(format(201506, 'R'), '23');
eq(format(201507, 'R'), '27');
eq(format(201508, 'R'), '31');
eq(format(201509, 'R'), '36');
eq(format(201510, 'R'), '40');
eq(format(201511, 'R'), '44');
eq(format(201512, 'R'), '49');
koyomi.startMonth = 4;
koyomi.startWeek = '日';
eq(format(201501, 'R'), '40');
eq(format(201502, 'R'), '45');
eq(format(201503, 'R'), '49');
eq(format(201504, 'R'), '1');
eq(format(201505, 'R'), '5');
eq(format(201506, 'R'), '10');
eq(format(201507, 'R'), '14');
eq(format(201508, 'R'), '18');
eq(format(201509, 'R'), '23');
eq(format(201510, 'R'), '27');
eq(format(201511, 'R'), '32');
eq(format(201512, 'R'), '36');
eq(format(201501, 'r'), '1');
eq(format(201502, 'r'), '5');
eq(format(201503, 'r'), '9');
eq(format(201504, 'r'), '14');
eq(format(201505, 'r'), '18');
eq(format(201506, 'r'), '23');
eq(format(201507, 'r'), '27');
eq(format(201508, 'r'), '31');
eq(format(201509, 'r'), '36');
eq(format(201510, 'r'), '40');
eq(format(201511, 'r'), '44');
eq(format(201512, 'r'), '49');
koyomi.startMonth = 9;
koyomi.startWeek = '日';
eq(format(201501, 'R'), '18');
eq(format(201502, 'R'), '23');
eq(format(201503, 'R'), '27');
eq(format(201504, 'R'), '31');
eq(format(201505, 'R'), '35');
eq(format(201506, 'R'), '40');
eq(format(201507, 'R'), '44');
eq(format(201508, 'R'), '48');
eq(format(201509, 'R'), '1');
eq(format(201510, 'R'), '5');
eq(format(201511, 'R'), '10');
eq(format(201512, 'R'), '14');

},{"../..":8,"assert":34}],193:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 秒
// SS S


eq(format('2015-01-01 00:00:00', 'SS'), '00');
eq(format('2015-01-01 00:00:01', 'SS'), '01');
eq(format('2015-01-01 00:00:10', 'SS'), '10');
eq(format('2015-01-01 00:00:00', 'S'), '0');
eq(format('2015-01-01 00:00:01', 'S'), '1');
eq(format('2015-01-01 00:00:10', 'S'), '10');

},{"../..":8,"assert":34}],194:[function(require,module,exports){
// 未使用
"use strict";

},{}],195:[function(require,module,exports){
// 未使用
"use strict";

},{}],196:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal;

koyomi.startMonth = 1; // 上半期、下半期
// VV V

eq(format(20150101, 'V'), '上半期');
eq(format(20150201, 'V'), '上半期');
eq(format(20150301, 'V'), '上半期');
eq(format(20150401, 'V'), '上半期');
eq(format(20150501, 'V'), '上半期');
eq(format(20150601, 'V'), '上半期');
eq(format(20150701, 'V'), '下半期');
eq(format(20150801, 'V'), '下半期');
eq(format(20150901, 'V'), '下半期');
eq(format(20151001, 'V'), '下半期');
eq(format(20151101, 'V'), '下半期');
eq(format(20151201, 'V'), '下半期');
eq(format(20150101, 'V>1'), '上');
eq(format(20150201, 'V>1'), '上');
eq(format(20150301, 'V>1'), '上');
eq(format(20150401, 'V>1'), '上');
eq(format(20150501, 'V>1'), '上');
eq(format(20150601, 'V>1'), '上');
eq(format(20150701, 'V>1'), '下');
eq(format(20150801, 'V>1'), '下');
eq(format(20150901, 'V>1'), '下');
eq(format(20151001, 'V>1'), '下');
eq(format(20151101, 'V>1'), '下');
eq(format(20151201, 'V>1'), '下');
koyomi.startMonth = 4;
eq(format(20150101, 'V'), '下半期');
eq(format(20150201, 'V'), '下半期');
eq(format(20150301, 'V'), '下半期');
eq(format(20150401, 'V'), '上半期');
eq(format(20150501, 'V'), '上半期');
eq(format(20150601, 'V'), '上半期');
eq(format(20150701, 'V'), '上半期');
eq(format(20150801, 'V'), '上半期');
eq(format(20150901, 'V'), '上半期');
eq(format(20151001, 'V'), '下半期');
eq(format(20151101, 'V'), '下半期');
eq(format(20151201, 'V'), '下半期');
koyomi.startMonth = 7;
eq(format(20150101, 'V'), '下半期');
eq(format(20150201, 'V'), '下半期');
eq(format(20150301, 'V'), '下半期');
eq(format(20150401, 'V'), '下半期');
eq(format(20150501, 'V'), '下半期');
eq(format(20150601, 'V'), '下半期');
eq(format(20150701, 'V'), '上半期');
eq(format(20150801, 'V'), '上半期');
eq(format(20150901, 'V'), '上半期');
eq(format(20151001, 'V'), '上半期');
eq(format(20151101, 'V'), '上半期');
eq(format(20151201, 'V'), '上半期');
koyomi.startMonth = 9;
eq(format(20150101, 'V'), '上半期');
eq(format(20150201, 'V'), '上半期');
eq(format(20150301, 'V'), '下半期');
eq(format(20150401, 'V'), '下半期');
eq(format(20150501, 'V'), '下半期');
eq(format(20150601, 'V'), '下半期');
eq(format(20150701, 'V'), '下半期');
eq(format(20150801, 'V'), '下半期');
eq(format(20150901, 'V'), '上半期');
eq(format(20151001, 'V'), '上半期');
eq(format(20151101, 'V'), '上半期');
eq(format(20151201, 'V'), '上半期');

},{"../..":8,"assert":34}],197:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 曜日
// WW W w


eq(format('2015-1-1', 'WW'), 'Thursday');
eq(format('2015-1-2', 'WW'), 'Friday');
eq(format('2015-1-3', 'WW'), 'Saturday');
eq(format('2015-1-4', 'WW'), 'Sunday');
eq(format('2015-1-5', 'WW'), 'Monday');
eq(format('2015-1-6', 'WW'), 'Tuesday');
eq(format('2015-1-7', 'WW'), 'Wednesday');
eq(format('2015-1-1', 'WW>3'), 'Thu');
eq(format('2015-1-2', 'WW>3'), 'Fri');
eq(format('2015-1-3', 'WW>3'), 'Sat');
eq(format('2015-1-4', 'WW>3'), 'Sun');
eq(format('2015-1-5', 'WW>3'), 'Mon');
eq(format('2015-1-6', 'WW>3'), 'Tue');
eq(format('2015-1-7', 'WW>3'), 'Wed');
eq(format('2015-1-1', 'W'), '木曜日');
eq(format('2015-1-2', 'W'), '金曜日');
eq(format('2015-1-3', 'W'), '土曜日');
eq(format('2015-1-4', 'W'), '日曜日');
eq(format('2015-1-5', 'W'), '月曜日');
eq(format('2015-1-6', 'W'), '火曜日');
eq(format('2015-1-7', 'W'), '水曜日');
eq(format('2015-1-1', 'W>1'), '木');
eq(format('2015-1-2', 'W>1'), '金');
eq(format('2015-1-3', 'W>1'), '土');
eq(format('2015-1-4', 'W>1'), '日');
eq(format('2015-1-5', 'W>1'), '月');
eq(format('2015-1-6', 'W>1'), '火');
eq(format('2015-1-7', 'W>1'), '水');
eq(format('2015-1-1', 'w'), '4');
eq(format('2015-1-2', 'w'), '5');
eq(format('2015-1-3', 'w'), '6');
eq(format('2015-1-4', 'w'), '0');
eq(format('2015-1-5', 'w'), '1');
eq(format('2015-1-6', 'w'), '2');
eq(format('2015-1-7', 'w'), '3');

},{"../..":8,"assert":34}],198:[function(require,module,exports){
// 未使用
"use strict";

},{}],199:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 年
// YYYY Y y


eq(format('2015-1-1', 'YYYY'), '2015');
eq(format('2015-1-1', 'Y'), '2015');
eq(format('2015-1-1', 'y'), '15');
eq(format('980-1-1', 'YYYY'), '0980');
eq(format('980-1-1', 'Y'), '980');
eq(format('980-1-1', 'y'), '80');
eq(format('2015-1-1', 'Y>9'), '000002015');

},{"../..":8,"assert":34}],200:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // タイムゾーン
// Z


var d = new Date();

if (d.getTimezoneOffset() === -540) {
  // Asia/Tokyo
  eq(format(d, 'Z'), '+9:00');
} else {
  console.log('skip timezone(Z)');
}

},{"../..":8,"assert":34}],201:[function(require,module,exports){
"use strict";

require('./A'); // 午前午後


require('./B'); // 営業日数


require('./C'); // 日数


require('./D'); // 日


require('./E'); // 営業・休業


require('./F'); // 祝日


require('./G'); // 元号


require('./H'); // 時


require('./I'); // 分


require('./J'); // (未使用)


require('./K'); // 口語


require('./L'); // (未使用)


require('./M'); // 月


require('./N'); // 和暦の年


require('./O'); // 年齢


require('./P'); // (未使用)


require('./Q'); // 四半期


require('./R'); // 週番号


require('./S'); // 秒・ミリ秒


require('./T'); // (未使用)


require('./U'); // (未使用)


require('./V'); // 上半期・下半期


require('./W'); // 曜日


require('./X'); // (未使用)


require('./Y'); // 年


require('./Z'); // タイムゾーン


require('./custom');

require('./combi');

require('./escape');

require('./josu');

require('./options');

require('./padding');

require('./etc');

},{"./A":175,"./B":176,"./C":177,"./D":178,"./E":179,"./F":180,"./G":181,"./H":182,"./I":183,"./J":184,"./K":185,"./L":186,"./M":187,"./N":188,"./O":189,"./P":190,"./Q":191,"./R":192,"./S":193,"./T":194,"./U":195,"./V":196,"./W":197,"./X":198,"./Y":199,"./Z":200,"./combi":202,"./custom":203,"./escape":204,"./etc":205,"./josu":206,"./options":207,"./padding":208}],202:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 混合


eq(format('2015-4-10', 'YMMDD'), '20150410');
eq(format('2015-4-10', 'GGGggg'), '2675平成H');
eq(format('1989-1-7', 'WAREKI'), format('1989-1-7', 'GGN年M月D日>>漢数字'));
eq(format('1989-1-7', 'wareki'), format('1989-1-7', 'ggn年M月D日>>漢数字'));

},{"../..":8,"assert":34}],203:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // WAREKI wareki


eq(format('2015-4-10', 'WAREKI'), '平成二十七年四月十日');
eq(format('2015-4-10', 'wareki'), '平成二十七年四月十日');
eq(format('1989-1-7', 'WAREKI'), '平成元年一月七日');
eq(format('1989-1-7', 'wareki'), '昭和六十四年一月七日'); // BIZ3

koyomi.regularHoliday = '土,日';
koyomi.seasonHoliday = null;
koyomi.openOnHoliday = false;
eq(format('2015-4-24', 'BIZ3'), '2015-04-30');

},{"../..":8,"assert":34}],204:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal;

eq(format('2015-4-10', '{Y}/{MM}/{DD} updated'), '2015/04/10 updated');
eq(format('2015-4-10', 'Y{MM}DD'), 'Y04DD');
eq(format('2015-4-10', '{M}'), '4');
eq(format('2015-4-10', '{M>2}'), '04');

},{"../..":8,"assert":34}],205:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 存在しないパラメータ文字列


eq(format('2015-4-10', '{Ymd}'), '{Ymd}');
eq(format('2015-4-10', '{YYYY}{m}{d}'), '2015{m}{d}'); // 和暦入力

eq(format('S50-1-2', 'YMMDD'), '19750102');
eq(format('昭和50年1月2日', 'YMMDD'), '19750102');

},{"../..":8,"assert":34}],206:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal;

koyomi.startMonth = 1; // 序数  (CC:経過日数)

eq(format(20150101, 'CC'), '1');
eq(format(20150101, 'CC>0'), '1st');
eq(format(20150102, 'CC>0'), '2nd');
eq(format(20150103, 'CC>0'), '3rd');
eq(format(20150104, 'CC>0'), '4th');
eq(format(20150105, 'CC>0'), '5th');
eq(format(20150106, 'CC>0'), '6th');
eq(format(20150107, 'CC>0'), '7th');
eq(format(20150108, 'CC>0'), '8th');
eq(format(20150109, 'CC>0'), '9th');
eq(format(20150110, 'CC>0'), '10th');
eq(format(20150111, 'CC>0'), '11th');
eq(format(20150112, 'CC>0'), '12th');
eq(format(20150113, 'CC>0'), '13th');
eq(format(20150114, 'CC>0'), '14th');
eq(format(20150115, 'CC>0'), '15th');
eq(format(20150116, 'CC>0'), '16th');
eq(format(20150117, 'CC>0'), '17th');
eq(format(20150118, 'CC>0'), '18th');
eq(format(20150119, 'CC>0'), '19th');
eq(format(20150120, 'CC>0'), '20th');
eq(format(20150121, 'CC>0'), '21st');
eq(format(20150122, 'CC>0'), '22nd');
eq(format(20150123, 'CC>0'), '23rd');
eq(format(20150124, 'CC>0'), '24th');
eq(format(20150125, 'CC>0'), '25th');
eq(format(20150126, 'CC>0'), '26th');
eq(format(20150127, 'CC>0'), '27th');
eq(format(20150128, 'CC>0'), '28th');
eq(format(20150129, 'CC>0'), '29th');
eq(format(20150130, 'CC>0'), '30th');
eq(format(20150131, 'CC>0'), '31st');
eq(format(20150201, 'CC>0'), '32nd');
eq(format(20150202, 'CC>0'), '33rd');
eq(format(20150203, 'CC>0'), '34th');
eq(format(20150204, 'CC>0'), '35th');
eq(format(20150205, 'CC>0'), '36th');
eq(format(20150206, 'CC>0'), '37th');
eq(format(20150207, 'CC>0'), '38th');
eq(format(20150208, 'CC>0'), '39th');
eq(format(20150209, 'CC>0'), '40th');
eq(format(20150210, 'CC>0'), '41st');
eq(format(20150211, 'CC>0'), '42nd');
eq(format(20150212, 'CC>0'), '43rd');
eq(format(20150213, 'CC>0'), '44th');
eq(format(20150214, 'CC>0'), '45th');
eq(format(20150215, 'CC>0'), '46th');
eq(format(20150216, 'CC>0'), '47th');
eq(format(20150217, 'CC>0'), '48th');
eq(format(20150218, 'CC>0'), '49th');
eq(format(20150219, 'CC>0'), '50th');
eq(format(20150220, 'CC>0'), '51st');
eq(format(20150221, 'CC>0'), '52nd');
eq(format(20150222, 'CC>0'), '53rd');
eq(format(20150223, 'CC>0'), '54th');
eq(format(20150224, 'CC>0'), '55th');
eq(format(20150225, 'CC>0'), '56th');
eq(format(20150226, 'CC>0'), '57th');
eq(format(20150227, 'CC>0'), '58th');
eq(format(20150228, 'CC>0'), '59th');
eq(format(20150301, 'CC>0'), '60th');
eq(format(20150302, 'CC>0'), '61st');
eq(format(20150303, 'CC>0'), '62nd');
eq(format(20150304, 'CC>0'), '63rd');
eq(format(20150305, 'CC>0'), '64th');
eq(format(20150306, 'CC>0'), '65th');
eq(format(20150307, 'CC>0'), '66th');
eq(format(20150308, 'CC>0'), '67th');
eq(format(20150309, 'CC>0'), '68th');
eq(format(20150310, 'CC>0'), '69th');
eq(format(20150311, 'CC>0'), '70th');
eq(format(20150312, 'CC>0'), '71st');
eq(format(20150313, 'CC>0'), '72nd');
eq(format(20150314, 'CC>0'), '73rd');
eq(format(20150315, 'CC>0'), '74th');
eq(format(20150316, 'CC>0'), '75th');
eq(format(20150317, 'CC>0'), '76th');
eq(format(20150318, 'CC>0'), '77th');
eq(format(20150319, 'CC>0'), '78th');
eq(format(20150320, 'CC>0'), '79th');
eq(format(20150321, 'CC>0'), '80th');
eq(format(20150322, 'CC>0'), '81st');
eq(format(20150323, 'CC>0'), '82nd');
eq(format(20150324, 'CC>0'), '83rd');
eq(format(20150325, 'CC>0'), '84th');
eq(format(20150326, 'CC>0'), '85th');
eq(format(20150327, 'CC>0'), '86th');
eq(format(20150328, 'CC>0'), '87th');
eq(format(20150329, 'CC>0'), '88th');
eq(format(20150330, 'CC>0'), '89th');
eq(format(20150331, 'CC>0'), '90th');
eq(format(20150401, 'CC>0'), '91st');
eq(format(20150402, 'CC>0'), '92nd');
eq(format(20150403, 'CC>0'), '93rd');
eq(format(20150404, 'CC>0'), '94th');
eq(format(20150405, 'CC>0'), '95th');
eq(format(20150406, 'CC>0'), '96th');
eq(format(20150407, 'CC>0'), '97th');
eq(format(20150408, 'CC>0'), '98th');
eq(format(20150409, 'CC>0'), '99th');
eq(format(20150410, 'CC>0'), '100th');
eq(format(20150411, 'CC>0'), '101st');
eq(format(20150412, 'CC>0'), '102nd');
eq(format(20150413, 'CC>0'), '103rd');
eq(format(20150414, 'CC>0'), '104th');
eq(format(20150415, 'CC>0'), '105th');
eq(format(20150416, 'CC>0'), '106th');
eq(format(20150417, 'CC>0'), '107th');
eq(format(20150418, 'CC>0'), '108th');
eq(format(20150419, 'CC>0'), '109th');
eq(format(20150420, 'CC>0'), '110th');
eq(format(20150421, 'CC>0'), '111th');
eq(format(20150422, 'CC>0'), '112th');
eq(format(20150423, 'CC>0'), '113th');
eq(format(20150424, 'CC>0'), '114th');
eq(format(20150425, 'CC>0'), '115th');
eq(format(20150426, 'CC>0'), '116th');
eq(format(20150427, 'CC>0'), '117th');
eq(format(20150428, 'CC>0'), '118th');
eq(format(20150429, 'CC>0'), '119th');
eq(format(20150430, 'CC>0'), '120th');
eq(format(20150501, 'CC>0'), '121st');
eq(format(20150502, 'CC>0'), '122nd');
eq(format(20150503, 'CC>0'), '123rd');
eq(format(20150504, 'CC>0'), '124th');
eq(format(20150505, 'CC>0'), '125th');
eq(format(20150506, 'CC>0'), '126th');
eq(format(20150507, 'CC>0'), '127th');
eq(format(20150508, 'CC>0'), '128th');
eq(format(20150509, 'CC>0'), '129th');
eq(format(20150510, 'CC>0'), '130th');
eq(format(20150511, 'CC>0'), '131st');
eq(format(20150512, 'CC>0'), '132nd');
eq(format(20150513, 'CC>0'), '133rd');
eq(format(20150514, 'CC>0'), '134th');
eq(format(20150515, 'CC>0'), '135th');
eq(format(20150516, 'CC>0'), '136th');
eq(format(20150517, 'CC>0'), '137th');
eq(format(20150518, 'CC>0'), '138th');
eq(format(20150519, 'CC>0'), '139th');
eq(format(20150520, 'CC>0'), '140th');
eq(format(20150521, 'CC>0'), '141st');
eq(format(20150522, 'CC>0'), '142nd');
eq(format(20150523, 'CC>0'), '143rd');
eq(format(20150524, 'CC>0'), '144th');
eq(format(20150525, 'CC>0'), '145th');
eq(format(20150526, 'CC>0'), '146th');
eq(format(20150527, 'CC>0'), '147th');
eq(format(20150528, 'CC>0'), '148th');
eq(format(20150529, 'CC>0'), '149th');
eq(format(20150530, 'CC>0'), '150th');
eq(format(20150531, 'CC>0'), '151st');
eq(format(20150601, 'CC>0'), '152nd');
eq(format(20150602, 'CC>0'), '153rd');
eq(format(20150603, 'CC>0'), '154th');
eq(format(20150604, 'CC>0'), '155th');
eq(format(20150605, 'CC>0'), '156th');
eq(format(20150606, 'CC>0'), '157th');
eq(format(20150607, 'CC>0'), '158th');
eq(format(20150608, 'CC>0'), '159th');
eq(format(20150609, 'CC>0'), '160th');
eq(format(20150610, 'CC>0'), '161st');
eq(format(20150611, 'CC>0'), '162nd');
eq(format(20150612, 'CC>0'), '163rd');
eq(format(20150613, 'CC>0'), '164th');
eq(format(20150614, 'CC>0'), '165th');
eq(format(20150615, 'CC>0'), '166th');
eq(format(20150616, 'CC>0'), '167th');
eq(format(20150617, 'CC>0'), '168th');
eq(format(20150618, 'CC>0'), '169th');
eq(format(20150619, 'CC>0'), '170th');
eq(format(20150620, 'CC>0'), '171st');
eq(format(20150621, 'CC>0'), '172nd');
eq(format(20150622, 'CC>0'), '173rd');
eq(format(20150623, 'CC>0'), '174th');
eq(format(20150624, 'CC>0'), '175th');
eq(format(20150625, 'CC>0'), '176th');
eq(format(20150626, 'CC>0'), '177th');
eq(format(20150627, 'CC>0'), '178th');
eq(format(20150628, 'CC>0'), '179th');
eq(format(20150629, 'CC>0'), '180th');
eq(format(20150630, 'CC>0'), '181st');
eq(format(20150701, 'CC>0'), '182nd');
eq(format(20150702, 'CC>0'), '183rd');
eq(format(20150703, 'CC>0'), '184th');
eq(format(20150704, 'CC>0'), '185th');
eq(format(20150705, 'CC>0'), '186th');
eq(format(20150706, 'CC>0'), '187th');
eq(format(20150707, 'CC>0'), '188th');
eq(format(20150708, 'CC>0'), '189th');
eq(format(20150709, 'CC>0'), '190th');
eq(format(20150710, 'CC>0'), '191st');
eq(format(20150711, 'CC>0'), '192nd');
eq(format(20150712, 'CC>0'), '193rd');
eq(format(20150713, 'CC>0'), '194th');
eq(format(20150714, 'CC>0'), '195th');
eq(format(20150715, 'CC>0'), '196th');
eq(format(20150716, 'CC>0'), '197th');
eq(format(20150717, 'CC>0'), '198th');
eq(format(20150718, 'CC>0'), '199th');
eq(format(20150719, 'CC>0'), '200th');
eq(format(20150720, 'CC>0'), '201st');
eq(format(20150721, 'CC>0'), '202nd');
eq(format(20150722, 'CC>0'), '203rd');
eq(format(20150723, 'CC>0'), '204th');
eq(format(20150724, 'CC>0'), '205th');
eq(format(20150725, 'CC>0'), '206th');
eq(format(20150726, 'CC>0'), '207th');
eq(format(20150727, 'CC>0'), '208th');
eq(format(20150728, 'CC>0'), '209th');
eq(format(20150729, 'CC>0'), '210th');
eq(format(20150730, 'CC>0'), '211th');
eq(format(20150731, 'CC>0'), '212th');
eq(format(20150801, 'CC>0'), '213th');
eq(format(20150802, 'CC>0'), '214th');
eq(format(20150803, 'CC>0'), '215th');
eq(format(20150804, 'CC>0'), '216th');
eq(format(20150805, 'CC>0'), '217th');
eq(format(20150806, 'CC>0'), '218th');
eq(format(20150807, 'CC>0'), '219th');
eq(format(20150808, 'CC>0'), '220th');
eq(format(20150809, 'CC>0'), '221st');
eq(format(20150810, 'CC>0'), '222nd');
eq(format(20150811, 'CC>0'), '223rd');
eq(format(20150812, 'CC>0'), '224th');
eq(format(20150813, 'CC>0'), '225th');
eq(format(20150814, 'CC>0'), '226th');
eq(format(20150815, 'CC>0'), '227th');
eq(format(20150816, 'CC>0'), '228th');
eq(format(20150817, 'CC>0'), '229th');
eq(format(20150818, 'CC>0'), '230th');
eq(format(20150819, 'CC>0'), '231st');
eq(format(20150820, 'CC>0'), '232nd');
eq(format(20150821, 'CC>0'), '233rd');
eq(format(20150822, 'CC>0'), '234th');
eq(format(20150823, 'CC>0'), '235th');
eq(format(20150824, 'CC>0'), '236th');
eq(format(20150825, 'CC>0'), '237th');
eq(format(20150826, 'CC>0'), '238th');
eq(format(20150827, 'CC>0'), '239th');
eq(format(20150828, 'CC>0'), '240th');
eq(format(20150829, 'CC>0'), '241st');
eq(format(20150830, 'CC>0'), '242nd');
eq(format(20150831, 'CC>0'), '243rd');
eq(format(20150901, 'CC>0'), '244th');
eq(format(20150902, 'CC>0'), '245th');
eq(format(20150903, 'CC>0'), '246th');
eq(format(20150904, 'CC>0'), '247th');
eq(format(20150905, 'CC>0'), '248th');
eq(format(20150906, 'CC>0'), '249th');
eq(format(20150907, 'CC>0'), '250th');
eq(format(20150908, 'CC>0'), '251st');
eq(format(20150909, 'CC>0'), '252nd');
eq(format(20150910, 'CC>0'), '253rd');
eq(format(20150911, 'CC>0'), '254th');
eq(format(20150912, 'CC>0'), '255th');
eq(format(20150913, 'CC>0'), '256th');
eq(format(20150914, 'CC>0'), '257th');
eq(format(20150915, 'CC>0'), '258th');
eq(format(20150916, 'CC>0'), '259th');
eq(format(20150917, 'CC>0'), '260th');
eq(format(20150918, 'CC>0'), '261st');
eq(format(20150919, 'CC>0'), '262nd');
eq(format(20150920, 'CC>0'), '263rd');
eq(format(20150921, 'CC>0'), '264th');
eq(format(20150922, 'CC>0'), '265th');
eq(format(20150923, 'CC>0'), '266th');
eq(format(20150924, 'CC>0'), '267th');
eq(format(20150925, 'CC>0'), '268th');
eq(format(20150926, 'CC>0'), '269th');
eq(format(20150927, 'CC>0'), '270th');
eq(format(20150928, 'CC>0'), '271st');
eq(format(20150929, 'CC>0'), '272nd');
eq(format(20150930, 'CC>0'), '273rd');
eq(format(20151001, 'CC>0'), '274th');
eq(format(20151002, 'CC>0'), '275th');
eq(format(20151003, 'CC>0'), '276th');
eq(format(20151004, 'CC>0'), '277th');
eq(format(20151005, 'CC>0'), '278th');
eq(format(20151006, 'CC>0'), '279th');
eq(format(20151007, 'CC>0'), '280th');
eq(format(20151008, 'CC>0'), '281st');
eq(format(20151009, 'CC>0'), '282nd');
eq(format(20151010, 'CC>0'), '283rd');
eq(format(20151011, 'CC>0'), '284th');
eq(format(20151012, 'CC>0'), '285th');
eq(format(20151013, 'CC>0'), '286th');
eq(format(20151014, 'CC>0'), '287th');
eq(format(20151015, 'CC>0'), '288th');
eq(format(20151016, 'CC>0'), '289th');
eq(format(20151017, 'CC>0'), '290th');
eq(format(20151018, 'CC>0'), '291st');
eq(format(20151019, 'CC>0'), '292nd');
eq(format(20151020, 'CC>0'), '293rd');
eq(format(20151021, 'CC>0'), '294th');
eq(format(20151022, 'CC>0'), '295th');
eq(format(20151023, 'CC>0'), '296th');
eq(format(20151024, 'CC>0'), '297th');
eq(format(20151025, 'CC>0'), '298th');
eq(format(20151026, 'CC>0'), '299th');
eq(format(20151027, 'CC>0'), '300th');
eq(format(20151028, 'CC>0'), '301st');
eq(format(20151029, 'CC>0'), '302nd');
eq(format(20151030, 'CC>0'), '303rd');
eq(format(20151031, 'CC>0'), '304th');
eq(format(20151101, 'CC>0'), '305th');
eq(format(20151102, 'CC>0'), '306th');
eq(format(20151103, 'CC>0'), '307th');
eq(format(20151104, 'CC>0'), '308th');
eq(format(20151105, 'CC>0'), '309th');
eq(format(20151106, 'CC>0'), '310th');
eq(format(20151107, 'CC>0'), '311th');
eq(format(20151108, 'CC>0'), '312th');
eq(format(20151109, 'CC>0'), '313th');
eq(format(20151110, 'CC>0'), '314th');
eq(format(20151111, 'CC>0'), '315th');
eq(format(20151112, 'CC>0'), '316th');
eq(format(20151113, 'CC>0'), '317th');
eq(format(20151114, 'CC>0'), '318th');
eq(format(20151115, 'CC>0'), '319th');
eq(format(20151116, 'CC>0'), '320th');
eq(format(20151117, 'CC>0'), '321st');
eq(format(20151118, 'CC>0'), '322nd');
eq(format(20151119, 'CC>0'), '323rd');
eq(format(20151120, 'CC>0'), '324th');
eq(format(20151121, 'CC>0'), '325th');
eq(format(20151122, 'CC>0'), '326th');
eq(format(20151123, 'CC>0'), '327th');
eq(format(20151124, 'CC>0'), '328th');
eq(format(20151125, 'CC>0'), '329th');
eq(format(20151126, 'CC>0'), '330th');
eq(format(20151127, 'CC>0'), '331st');
eq(format(20151128, 'CC>0'), '332nd');
eq(format(20151129, 'CC>0'), '333rd');
eq(format(20151130, 'CC>0'), '334th');
eq(format(20151201, 'CC>0'), '335th');
eq(format(20151202, 'CC>0'), '336th');
eq(format(20151203, 'CC>0'), '337th');
eq(format(20151204, 'CC>0'), '338th');
eq(format(20151205, 'CC>0'), '339th');
eq(format(20151206, 'CC>0'), '340th');
eq(format(20151207, 'CC>0'), '341st');
eq(format(20151208, 'CC>0'), '342nd');
eq(format(20151209, 'CC>0'), '343rd');
eq(format(20151210, 'CC>0'), '344th');
eq(format(20151211, 'CC>0'), '345th');
eq(format(20151212, 'CC>0'), '346th');
eq(format(20151213, 'CC>0'), '347th');
eq(format(20151214, 'CC>0'), '348th');
eq(format(20151215, 'CC>0'), '349th');
eq(format(20151216, 'CC>0'), '350th');
eq(format(20151217, 'CC>0'), '351st');
eq(format(20151218, 'CC>0'), '352nd');
eq(format(20151219, 'CC>0'), '353rd');
eq(format(20151220, 'CC>0'), '354th');
eq(format(20151221, 'CC>0'), '355th');
eq(format(20151222, 'CC>0'), '356th');
eq(format(20151223, 'CC>0'), '357th');
eq(format(20151224, 'CC>0'), '358th');
eq(format(20151225, 'CC>0'), '359th');
eq(format(20151226, 'CC>0'), '360th');
eq(format(20151227, 'CC>0'), '361st');
eq(format(20151228, 'CC>0'), '362nd');
eq(format(20151229, 'CC>0'), '363rd');
eq(format(20151230, 'CC>0'), '364th');
eq(format(20151231, 'CC>0'), '365th'); // 文字列の序数

eq(format(20150101, 'GG>0'), '平成');
eq(format(20000101, 'y>0'), '00th');
eq(format(20010101, 'y>0'), '01st');

},{"../..":8,"assert":34}],207:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 短縮


eq(format('2015-2-3 12:34:56', 'H時I分S秒'), '12時34分56秒');
eq(format('2015-2-3 12:34:00', 'H時I分S秒'), '12時34分0秒');
eq(format('2015-2-3 12:00:56', 'H時I分S秒'), '12時0分56秒');
eq(format('2015-2-3 12:00:00', 'H時I分S秒'), '12時0分0秒');
eq(format('2015-2-3 12:34:56', 'H時I分S秒>>短縮'), '12時34分56秒');
eq(format('2015-2-3 12:34:00', 'H時I分S秒>>短縮'), '12時34分');
eq(format('2015-2-3 12:00:56', 'H時I分S秒>>短縮'), '12時0分56秒');
eq(format('2015-2-3 12:00:00', 'H時I分S秒>>短縮'), '12時'); // 元年

eq(format('2015-2-3', 'Y年M月D日'), '2015年2月3日');
eq(format('2015-2-3', 'GGN年M月D日'), '平成27年2月3日');
eq(format('2015-2-3', 'GGN年M月D日>>元年'), '平成27年2月3日');
eq(format('1989-2-3', 'GGN年M月D日>>元年'), '平成元年2月3日'); // 漢数字、漢字

eq(format('2015-12-23', 'GGN年M月D日>>漢数字'), '平成二十七年十二月二十三日');
eq(format('2015-12-23', 'GGN年M月D日>>漢字'), '平成二七年一二月二三日');
eq(format('1989-12-23', 'GGN年M月D日>>漢数字'), '平成元年十二月二十三日'); // 元年を指定せずとも適用

eq(format('1989-12-23', 'GGN年M月D日>>漢字'), '平成元年一二月二三日'); // 元年を指定せずとも適用

eq(format('1989-12-23', 'GGN年M月D日>>元年漢数字'), '平成元年十二月二十三日'); // 全角

eq(format('2015-2-3 12:34:56', 'Y年M月D日H時I分S秒>>全角'), '２０１５年２月３日１２時３４分５６秒');
eq(format('1989-2-3 12:34:56', 'Y年M月D日H時I分S秒>>全角'), '１９８９年２月３日１２時３４分５６秒');
eq(format('1989-2-3 12:34:56', 'GGN年M月D日H時I分S秒>>全角元年'), '平成元年２月３日１２時３４分５６秒');

},{"../..":8,"assert":34}],208:[function(require,module,exports){
"use strict";

// フォーマット
var koyomi = require('../..').create();

var format = koyomi.format.bind(koyomi);

var eq = require('assert').equal; // 0埋め


eq(format(20150101, 'D'), '1');
eq(format(20150101, 'D>0'), '1st'); // 序数になる

eq(format(20150101, 'DD>0'), '01st'); // 序数になる

eq(format(20150101, 'D>1'), '1');
eq(format(20150101, 'D>2'), '01');
eq(format(20150101, 'D>3'), '001');
eq(format(20150101, 'D>4'), '0001');
eq(format(20150101, 'D>5'), '00001');
eq(format(20150101, 'D>6'), '000001');
eq(format(20150101, 'D>7'), '0000001');
eq(format(20150101, 'D>8'), '00000001');
eq(format(20150101, 'D>9'), '000000001');
eq(format(20150101, 'D>10'), '10'); // 意味としては '{D>1}0'です

eq(format(20150101, 'D>11'), '11');

},{"../..":8,"assert":34}],209:[function(require,module,exports){
"use strict";

require('./get-holiday-name');

require('./get-holidays');

},{"./get-holiday-name":210,"./get-holidays":211}],210:[function(require,module,exports){
"use strict";

// 祝日名
var koyomi = require('../..').create();

var get = koyomi.getHolidayName.bind(koyomi);

var test = require('assert').equal;

test(get('2015-1-1'), '元日');
test(get('2015-1-12'), '成人の日');
test(get('2015-1-2'), null);
test(get('2015-1-4'), null);
test(get('2015-5-5'), 'こどもの日');
test(get('2015-5-6'), '振替休日');
test(get('2015-3-21'), '春分の日');
test(get('2015-9-23'), '秋分の日');

},{"../..":8,"assert":34}],211:[function(require,module,exports){
"use strict";

// 祝日
var get = require('../..').getHolidays;

var test = require('assert').deepEqual;

test(get(1947), {});
test(get(1948), {
  '923': '秋分の日',
  '1103': '文化の日',
  '1123': '勤労感謝の日'
});
test(get(1949), {
  '101': '元日',
  '115': '成人の日',
  '321': '春分の日',
  '429': '天皇誕生日',
  '503': '憲法記念日',
  '505': 'こどもの日',
  '923': '秋分の日',
  '1103': '文化の日',
  '1123': '勤労感謝の日'
});
test(get(1973), {
  '101': '元日',
  '115': '成人の日',
  '211': '建国記念の日',
  '321': '春分の日',
  '429': '天皇誕生日',
  '430': '振替休日',
  '503': '憲法記念日',
  '505': 'こどもの日',
  '915': '敬老の日',
  '923': '秋分の日',
  '924': '振替休日',
  '1010': '体育の日',
  '1103': '文化の日',
  '1123': '勤労感謝の日'
});
test(get(1988), {
  '101': '元日',
  '115': '成人の日',
  '211': '建国記念の日',
  '320': '春分の日',
  '321': '振替休日',
  '429': '天皇誕生日',
  '503': '憲法記念日',
  '504': '国民の休日',
  '505': 'こどもの日',
  '915': '敬老の日',
  '923': '秋分の日',
  '1010': '体育の日',
  '1103': '文化の日',
  '1123': '勤労感謝の日'
});
test(get(1996), {
  '101': '元日',
  '115': '成人の日',
  '211': '建国記念の日',
  '212': '振替休日',
  '320': '春分の日',
  '429': 'みどりの日',
  '503': '憲法記念日',
  '504': '国民の休日',
  '505': 'こどもの日',
  '506': '振替休日',
  '720': '海の日',
  '915': '敬老の日',
  '916': '振替休日',
  '923': '秋分の日',
  '1010': '体育の日',
  '1103': '文化の日',
  '1104': '振替休日',
  '1123': '勤労感謝の日',
  '1223': '天皇誕生日'
});
test(get(2005), {
  '101': '元日',
  '110': '成人の日',
  '211': '建国記念の日',
  '320': '春分の日',
  '321': '振替休日',
  '429': 'みどりの日',
  '503': '憲法記念日',
  '504': '国民の休日',
  '505': 'こどもの日',
  '718': '海の日',
  '919': '敬老の日',
  '923': '秋分の日',
  '1010': '体育の日',
  '1103': '文化の日',
  '1123': '勤労感謝の日',
  '1223': '天皇誕生日'
});
test(get(2009), {
  '101': '元日',
  '112': '成人の日',
  '211': '建国記念の日',
  '320': '春分の日',
  '429': '昭和の日',
  '503': '憲法記念日',
  '504': 'みどりの日',
  '505': 'こどもの日',
  '506': '振替休日',
  '720': '海の日',
  '921': '敬老の日',
  '922': '国民の休日',
  '923': '秋分の日',
  '1012': '体育の日',
  '1103': '文化の日',
  '1123': '勤労感謝の日',
  '1223': '天皇誕生日'
});
test(get(2010), {
  '101': '元日',
  '111': '成人の日',
  '211': '建国記念の日',
  '321': '春分の日',
  '322': '振替休日',
  '429': '昭和の日',
  '503': '憲法記念日',
  '504': 'みどりの日',
  '505': 'こどもの日',
  '719': '海の日',
  '920': '敬老の日',
  '923': '秋分の日',
  '1011': '体育の日',
  '1103': '文化の日',
  '1123': '勤労感謝の日',
  '1223': '天皇誕生日'
});
test(get(2011), {
  '101': '元日',
  '110': '成人の日',
  '211': '建国記念の日',
  '321': '春分の日',
  '429': '昭和の日',
  '503': '憲法記念日',
  '504': 'みどりの日',
  '505': 'こどもの日',
  '718': '海の日',
  '919': '敬老の日',
  '923': '秋分の日',
  '1010': '体育の日',
  '1103': '文化の日',
  '1123': '勤労感謝の日',
  '1223': '天皇誕生日'
});
test(get(2015), {
  '101': '元日',
  '112': '成人の日',
  '211': '建国記念の日',
  '321': '春分の日',
  '429': '昭和の日',
  '503': '憲法記念日',
  '504': 'みどりの日',
  '505': 'こどもの日',
  '506': '振替休日',
  '720': '海の日',
  '921': '敬老の日',
  '922': '国民の休日',
  '923': '秋分の日',
  '1012': '体育の日',
  '1103': '文化の日',
  '1123': '勤労感謝の日',
  '1223': '天皇誕生日'
});
test(get(2019), {
  '101': '元日',
  '114': '成人の日',
  '211': '建国記念の日',
  '321': '春分の日',
  '429': '昭和の日',
  '503': '憲法記念日',
  '504': 'みどりの日',
  '505': 'こどもの日',
  '506': '振替休日',
  '715': '海の日',
  '811': '山の日',
  '812': '振替休日',
  '916': '敬老の日',
  '923': '秋分の日',
  '1014': '体育の日',
  '1103': '文化の日',
  '1104': '振替休日',
  '1123': '勤労感謝の日',
  '1223': '天皇誕生日'
});

},{"../..":8,"assert":34}],212:[function(require,module,exports){
"use strict";

require('./open-close-reset'); // & is-set-open, is-set-close


require('./is-open');

require('./is-close');

require('./is-regular-holiday');

require('./is-season-holiday');

require('./is-holiday-close');

require('./close-cause');

},{"./close-cause":213,"./is-close":214,"./is-holiday-close":215,"./is-open":216,"./is-regular-holiday":217,"./is-season-holiday":218,"./open-close-reset":219}],213:[function(require,module,exports){
"use strict";

// 休業判別
var koyomi = require('../..').create();

var cause = koyomi.closeCause.bind(koyomi);
var close = koyomi.close.bind(koyomi);

var eq = require('assert').equal;

koyomi.regularHoliday = '土,日';
koyomi.seasonHoliday = '年末年始のお休み 12/29-1/3';
koyomi.openOnHoliday = false;
eq(cause('2015-1-1'), '年末年始のお休み');
close('2015-10-10');
eq(cause('2015-10-10'), '臨時休業');
close('2015-1-1');
eq(cause('2015-1-1'), '臨時休業');
eq(cause('2015-1-4'), '定休日');

},{"../..":8,"assert":34}],214:[function(require,module,exports){
"use strict";

// 個別営業・休業設定
var koyomi = require('../..').create();

var open = koyomi.open.bind(koyomi);
var close = koyomi.close.bind(koyomi);
var reset = koyomi.reset.bind(koyomi);
var isOpen = koyomi.isOpen.bind(koyomi);
var isClose = koyomi.isClose.bind(koyomi);

var eq = require('assert').deepEqual;

koyomi.regularHoliday = '土,日';
koyomi.seasonHoliday = '12/29-1/3';
koyomi.openOnHoliday = false;
eq(open('2015-5-1'), true);
eq(isOpen('2015-5-1'), true);
eq(isClose('2015-5-1'), false);
eq(close('2015-5-1'), true);
eq(isOpen('2015-5-1'), false);
eq(isClose('2015-5-1'), true);
eq(reset('2015-5-1'), true);
eq(isOpen('2015-5-1'), true);
eq(isClose('2015-5-1'), false);

},{"../..":8,"assert":34}],215:[function(require,module,exports){
"use strict";

// 祝日休業判別
var koyomi = require('../..').create();

var isClose = koyomi.isHolidayClose.bind(koyomi);

var eq = require('assert').equal;

eq(isClose('2014-12-26'), false);
eq(isClose('2014-12-27'), false);
eq(isClose('2014-12-28'), false);
eq(isClose('2014-12-29'), false);
eq(isClose('2014-12-30'), false);
eq(isClose('2014-12-31'), false);
eq(isClose('2015-1-1'), true);
eq(isClose('2015-1-2'), false);
eq(isClose('2015-1-3'), false);
eq(isClose('2015-1-4'), false);
eq(isClose('2015-1-5'), false);
eq(isClose('2015-1-6'), false);
eq(isClose('2015-5-1'), false);
eq(isClose('2015-5-2'), false);
eq(isClose('2015-5-3'), true);
eq(isClose('2015-5-4'), true);
eq(isClose('2015-5-5'), true);
eq(isClose('2015-5-6'), true);
eq(isClose('2015-5-7'), false);
eq(isClose('2015-5-8'), false);
eq(isClose('2015-5-9'), false);
eq(isClose('2015-5-10'), false);
eq(isClose('2015-5-11'), false);
koyomi.openOnHoliday = true;
eq(isClose('2014-12-26'), false);
eq(isClose('2014-12-27'), false);
eq(isClose('2014-12-28'), false);
eq(isClose('2014-12-29'), false);
eq(isClose('2014-12-30'), false);
eq(isClose('2014-12-31'), false);
eq(isClose('2015-1-1'), false);
eq(isClose('2015-1-2'), false);
eq(isClose('2015-1-3'), false);
eq(isClose('2015-1-4'), false);
eq(isClose('2015-1-5'), false);
eq(isClose('2015-1-6'), false);
eq(isClose('2015-5-1'), false);
eq(isClose('2015-5-2'), false);
eq(isClose('2015-5-3'), false);
eq(isClose('2015-5-4'), false);
eq(isClose('2015-5-5'), false);
eq(isClose('2015-5-6'), false);
eq(isClose('2015-5-7'), false);
eq(isClose('2015-5-8'), false);
eq(isClose('2015-5-9'), false);
eq(isClose('2015-5-10'), false);
eq(isClose('2015-5-11'), false);

},{"../..":8,"assert":34}],216:[function(require,module,exports){
"use strict";

// 営業判別
var koyomi = require('../..').create();

var isOpen = koyomi.isOpen.bind(koyomi);

var test = require('assert').equal;

koyomi.regularHoliday = '土,日';
koyomi.seasonHoliday = '12/29-1/3';
koyomi.openOnHoliday = false;
test(isOpen('2015-1-1'), false);
test(isOpen('2015-1-2'), false);
test(isOpen('2015-1-4'), false);
test(isOpen('2015-1-5'), true);
test(isOpen('2015-5-1'), true);
test(isOpen('2015-5-2'), false);

},{"../..":8,"assert":34}],217:[function(require,module,exports){
"use strict";

// 定休日判別
var koyomi = require('../..').create();

var regular = koyomi.isRegularHoliday.bind(koyomi);

var eq = require('assert').equal;

eq(regular('2014-12-26'), false);
eq(regular('2014-12-27'), true);
eq(regular('2014-12-28'), true);
eq(regular('2014-12-29'), false);
eq(regular('2014-12-30'), false);
eq(regular('2014-12-31'), false);
eq(regular('2015-1-1'), false);
eq(regular('2015-1-2'), false);
eq(regular('2015-1-3'), true);
eq(regular('2015-1-4'), true);
eq(regular('2015-1-5'), false);
eq(regular('2015-1-6'), false);
eq(regular('2015-5-1'), false);
eq(regular('2015-5-2'), true);
eq(regular('2015-5-3'), true);
eq(regular('2015-5-4'), false);
eq(regular('2015-5-5'), false);
eq(regular('2015-5-6'), false);
eq(regular('2015-5-7'), false);
eq(regular('2015-5-8'), false);
eq(regular('2015-5-9'), true);
eq(regular('2015-5-10'), true);
eq(regular('2015-5-11'), false);
koyomi.regularHoliday = '';
eq(regular('2015-5-1'), false);
eq(regular('2015-5-2'), false);
eq(regular('2015-5-3'), false);
eq(regular('2015-5-4'), false);
eq(regular('2015-5-5'), false);
eq(regular('2015-5-6'), false);
eq(regular('2015-5-7'), false);
koyomi.regularHoliday = '木';
eq(regular('2015-5-1'), false);
eq(regular('2015-5-2'), false);
eq(regular('2015-5-3'), false);
eq(regular('2015-5-4'), false);
eq(regular('2015-5-5'), false);
eq(regular('2015-5-6'), false);
eq(regular('2015-5-7'), true);
eq(regular('2015-5-8'), false);
eq(regular('2015-5-9'), false);
eq(regular('2015-5-10'), false);
eq(regular('2015-5-11'), false);
koyomi.regularHoliday = null;
eq(regular('2015-5-1'), false);
eq(regular('2015-5-2'), false);
eq(regular('2015-5-3'), false);
eq(regular('2015-5-4'), false);
eq(regular('2015-5-5'), false);
eq(regular('2015-5-6'), false);
eq(regular('2015-5-7'), false);
koyomi.regularHoliday = '3,6,9';
eq(regular('2015-5-1'), false);
eq(regular('2015-5-2'), false);
eq(regular('2015-5-3'), true);
eq(regular('2015-5-4'), false);
eq(regular('2015-5-5'), false);
eq(regular('2015-5-6'), true);
eq(regular('2015-5-7'), false);
eq(regular('2015-5-8'), false);
eq(regular('2015-5-9'), true);
eq(regular('2015-5-10'), false);
eq(regular('2015-5-11'), false);
koyomi.regularHoliday = '1木,3木';
eq(regular('2015-5-1'), false);
eq(regular('2015-5-2'), false);
eq(regular('2015-5-3'), false);
eq(regular('2015-5-4'), false);
eq(regular('2015-5-5'), false);
eq(regular('2015-5-6'), false);
eq(regular('2015-5-7'), true);
eq(regular('2015-5-8'), false);
eq(regular('2015-5-14'), false);
eq(regular('2015-5-15'), false);
eq(regular('2015-5-21'), true);

koyomi.regularHoliday = function (d) {
  return d.getDate() % 10 === 0;
};

eq(regular('2015-5-1'), false);
eq(regular('2015-5-2'), false);
eq(regular('2015-5-10'), true);
eq(regular('2015-5-11'), false);
eq(regular('2015-5-20'), true);
eq(regular('2015-5-21'), false);
eq(regular('2015-5-30'), true);

},{"../..":8,"assert":34}],218:[function(require,module,exports){
"use strict";

// 年末年始・お盆の休み判別
var koyomi = require('../..').create();

var season = koyomi.isSeasonHoliday.bind(koyomi);

var eq = require('assert').equal;

koyomi.seasonHoliday = '年末年始のお休み 12/29-1/3';
eq(season('2014-12-26'), false);
eq(season('2014-12-27'), false);
eq(season('2014-12-28'), false);
eq(season('2014-12-29'), '年末年始のお休み');
eq(season('2014-12-30'), '年末年始のお休み');
eq(season('2014-12-31'), '年末年始のお休み');
eq(season('2015-1-1'), '年末年始のお休み');
eq(season('2015-1-2'), '年末年始のお休み');
eq(season('2015-1-3'), '年末年始のお休み');
eq(season('2015-1-4'), false);
eq(season('2015-1-5'), false);
eq(season('2015-1-6'), false);
eq(season('2015-5-1'), false);
eq(season('2015-5-2'), false);
eq(season('2015-5-3'), false);
eq(season('2015-5-4'), false);
eq(season('2015-5-5'), false);
eq(season('2015-5-6'), false);
eq(season('2015-5-7'), false);
eq(season('2015-5-8'), false);
eq(season('2015-5-9'), false);
eq(season('2015-5-10'), false);
eq(season('2015-5-11'), false);
koyomi.seasonHoliday = '12/30-1/2, 8/16-8/18';
eq(season('2014-12-28'), false);
eq(season('2014-12-29'), false);
eq(season('2014-12-30'), '休業期間');
eq(season('2014-12-31'), '休業期間');
eq(season('2015-1-1'), '休業期間');
eq(season('2015-1-2'), '休業期間');
eq(season('2015-1-3'), false);
eq(season('2015-1-4'), false);
eq(season('2015-1-5'), false);
eq(season('2015-8-14'), false);
eq(season('2015-8-15'), false);
eq(season('2015-8-16'), '休業期間');
eq(season('2015-8-17'), '休業期間');
eq(season('2015-8-18'), '休業期間');
eq(season('2015-8-19'), false);
eq(season('2015-8-20'), false);
koyomi.seasonHoliday = '';
eq(season('2014-12-28'), false);
eq(season('2014-12-29'), false);
eq(season('2014-12-30'), false);
eq(season('2014-12-31'), false);
eq(season('2015-1-1'), false);
eq(season('2015-1-2'), false);
eq(season('2015-1-3'), false);
eq(season('2015-1-4'), false);
eq(season('2015-1-5'), false);
koyomi.seasonHoliday = '8/8-8/7'; // 同月での範囲不正はnullと同じ

eq(season('2014-12-28'), false);
eq(season('2014-12-29'), false);
eq(season('2014-12-30'), false);
eq(season('2014-12-31'), false);
eq(season('2015-1-1'), false);
eq(season('2015-1-2'), false);
eq(season('2015-1-3'), false);
eq(season('2015-1-4'), false);
eq(season('2015-1-5'), false);

koyomi.seasonHoliday = function (d) {
  return d.getFullYear() === 2015 && d.getMonth() === 8 - 1 ? '休業期間' : false;
};

eq(season('2015-1-1'), false);
eq(season('2015-1-2'), false);
eq(season('2015-1-3'), false);
eq(season('2015-1-4'), false);
eq(season('2015-1-5'), false);
eq(season('2015-8-14'), '休業期間');
eq(season('2015-8-15'), '休業期間');
eq(season('2015-8-16'), '休業期間');
eq(season('2015-8-17'), '休業期間');
eq(season('2015-8-18'), '休業期間');
eq(season('2015-8-19'), '休業期間');
eq(season('2015-8-20'), '休業期間');

},{"../..":8,"assert":34}],219:[function(require,module,exports){
"use strict";

// 休業判別
var koyomi = require('../..').create();

var open = koyomi.open.bind(koyomi);
var close = koyomi.close.bind(koyomi);
var reset = koyomi.reset.bind(koyomi);
var isSetOpen = koyomi.isSetOpen.bind(koyomi);
var isSetClose = koyomi.isSetClose.bind(koyomi);

var eq = require('assert').deepEqual;

koyomi.openOnHoliday = false; // open

eq(open('2015-5-6'), true);
eq(koyomi.dayInfo['2015-5-6'], {
  events: [],
  open: true
});
eq(isSetOpen('2015-5-5'), false);
eq(isSetOpen('2015-5-6'), true); // close

eq(close('2015-10-14'), true);
eq(koyomi.dayInfo['2015-10-14'], {
  events: [],
  close: true
});
eq(isSetClose('2015-10-13'), false);
eq(isSetClose('2015-10-14'), true);
eq(koyomi.dayInfo['2015-10-15'], undefined);
eq(open('2015-10-15'), true);
eq(koyomi.dayInfo['2015-10-15'], {
  events: [],
  open: true
});
eq(close('2015-10-15'), true);
eq(koyomi.dayInfo['2015-10-15'], {
  events: [],
  close: true
});
eq(reset('2015-10-15'), true);
eq(koyomi.dayInfo['2015-10-15'], {
  events: []
});

},{"../..":8,"assert":34}],220:[function(require,module,exports){
"use strict";

// test all
require('./calc-date/all');

require('./calc-biz/all');

require('./calendar/all');

require('./format/all');

require('./holiday/all');

require('./open-close/all');

require('./util/all');

require('./utils/all');

console.log('test ok');

},{"./calc-biz/all":151,"./calc-date/all":159,"./calendar/all":171,"./format/all":201,"./holiday/all":209,"./open-close/all":212,"./util/all":221,"./utils/all":233}],221:[function(require,module,exports){
"use strict";

require('./parse');

require('./to-datetime');

require('./to-date');

require('./get-era');

require('./get-week-number');

require('./get-iso-week-number');

require('./get-x-day');

require('./create');

require('./clone');

require('./config');

},{"./clone":222,"./config":223,"./create":224,"./get-era":225,"./get-iso-week-number":226,"./get-week-number":227,"./get-x-day":228,"./parse":229,"./to-date":230,"./to-datetime":231}],222:[function(require,module,exports){
"use strict";

var koyomi = require('../..');

var as = require('assert');

koyomi.startMonth = 10;
koyomi.startWeek = '木';
koyomi.regularHoliday = '3水,4水';
koyomi.seasonHoliday = '7/1-7/4';
koyomi.openOnHoliday = true;
var original = {
  startMonth: koyomi.startMonth,
  startWeek: koyomi.startWeek,
  regularHoliday: koyomi.regularHoliday,
  seasonHoliday: koyomi.seasonHoliday,
  openOnHoliday: koyomi.openOnHoliday
};
var created = koyomi.clone();
as(koyomi !== created);
as(created.startMonth === original.startMonth);
as(created.startWeek === original.startWeek);
as(created.regularHoliday === original.regularHoliday);
as(created.seasonHoliday === original.seasonHoliday);
as(created.openOnHoliday === original.openOnHoliday);
created.startMonth = 8;
created.startWeek = '火';
created.regularHoliday = '10,20,30';
created.seasonHoliday = '11/5-11/10';
created.openOnHoliday = false;
var cloned = {
  startMonth: created.startMonth,
  startWeek: created.startWeek,
  regularHoliday: created.regularHoliday,
  seasonHoliday: created.seasonHoliday,
  openOnHoliday: created.openOnHoliday
};
as(koyomi.startMonth === original.startMonth);
as(koyomi.startWeek === original.startWeek);
as(koyomi.regularHoliday === original.regularHoliday);
as(koyomi.seasonHoliday === original.seasonHoliday);
as(koyomi.openOnHoliday === original.openOnHoliday);

},{"../..":8,"assert":34}],223:[function(require,module,exports){
"use strict";

var koyomi = require('../..').create();

var eq = require('assert').deepEqual;

koyomi.startMonth = 2;
eq(koyomi.startMonth, 2);
koyomi.startMonth = 3.14;
eq(koyomi.startMonth, 2);
koyomi.startMonth = null;
eq(koyomi.startMonth, 2);
koyomi.startMonth = 0;
eq(koyomi.startMonth, 2);
koyomi.startMonth = 13;
eq(koyomi.startMonth, 2);
koyomi.startWeek = '水';
eq(koyomi.startWeek, '水');
koyomi.startWeek = 'thu';
eq(koyomi.startWeek, '木');
koyomi.startWeek = '月,火';
eq(koyomi.startWeek, '木');
koyomi.startWeek = null;
eq(koyomi.startWeek, '木');
koyomi.defaultFormat = 'Y/M/D H:II';
eq(koyomi.defaultFormat, '{Y}/{M}/{D} {H}:{II}');
koyomi.defaultFormat = null;
eq(koyomi.defaultFormat, '{Y}/{M}/{D} {H}:{II}');
koyomi.regularHoliday = '土,日';
eq(koyomi.regularHoliday, '日, 土');
koyomi.regularHoliday = '10,20';
eq(koyomi.regularHoliday, '10, 20');
koyomi.regularHoliday = null;
eq(koyomi.regularHoliday, null);
koyomi.seasonHoliday = '12/30-1/2';
eq(koyomi.seasonHoliday, '休業期間 1/1, 1/2, 12/30, 12/31');
koyomi.seasonHoliday = '年末年始の休み12/30-1/2';
eq(koyomi.seasonHoliday, '年末年始の休み 1/1, 1/2, 12/30, 12/31');
koyomi.seasonHoliday = null;
eq(koyomi.seasonHoliday, null);

},{"../..":8,"assert":34}],224:[function(require,module,exports){
"use strict";

var koyomi = require('../..');

var as = require('assert');

var init = {
  startMonth: koyomi.startMonth,
  startWeek: koyomi.startWeek,
  regularHoliday: koyomi.regularHoliday,
  seasonHoliday: koyomi.seasonHoliday,
  openOnHoliday: koyomi.openOnHoliday
};
koyomi.startMonth = 10;
koyomi.startWeek = '木';
koyomi.regularHoliday = '3水,4水';
koyomi.seasonHoliday = '7/1-7/4';
koyomi.openOnHoliday = true;
var original = {
  startMonth: koyomi.startMonth,
  startWeek: koyomi.startWeek,
  regularHoliday: koyomi.regularHoliday,
  seasonHoliday: koyomi.seasonHoliday,
  openOnHoliday: koyomi.openOnHoliday
};
var created = koyomi.create();
as(koyomi !== created);
as(created.startMonth === init.startMonth);
as(created.startWeek === init.startWeek);
as(created.regularHoliday === init.regularHoliday);
as(created.seasonHoliday === init.seasonHoliday);
as(created.openOnHoliday === init.openOnHoliday);
created.startMonth = 8;
created.startWeek = '火';
created.regularHoliday = '10,20,30';
created.seasonHoliday = '11/5-11/10';
created.openOnHoliday = false;
as(koyomi.startMonth === original.startMonth);
as(koyomi.startWeek === original.startWeek);
as(koyomi.regularHoliday === original.regularHoliday);
as(koyomi.seasonHoliday === original.seasonHoliday);
as(koyomi.openOnHoliday === original.openOnHoliday);
created.openOnHoliday = true;
as(created.startMonth !== init.startMonth);
as(created.startWeek !== init.startWeek);
as(created.regularHoliday !== init.regularHoliday);
as(created.seasonHoliday !== init.seasonHoliday);
as(created.openOnHoliday !== init.openOnHoliday);

},{"../..":8,"assert":34}],225:[function(require,module,exports){
"use strict";

// 年号取得
var koyomi = require('../..').create();

var get = koyomi.getEra.bind(koyomi);

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

var reiwa = {
  N: '令和',
  n: 'R',
  y: 2019,
  d: D(2019, 5, 1)
};
var heisei = {
  N: '平成',
  n: 'H',
  y: 1989,
  d: D(1989, 1, 8)
};
var showa = {
  N: '昭和',
  n: 'S',
  y: 1926,
  d: D(1926, 12, 25)
};
eq(get('2019-5-1', true), reiwa);
eq(get('1989-1-1'), heisei);
eq(get('1989-1-1', true), showa); // さらに詳細なテストはutils/get-era.jsで

},{"../..":8,"../../date-extra.js":1,"assert":34}],226:[function(require,module,exports){
"use strict";

// ISO週番号の取得
var koyomi = require('../..').create();

var get = koyomi.getISOWeekNumber.bind(koyomi);

var eq = require('assert').deepEqual;

eq(get('2015-1-1'), 1); // さらに詳細なテストはutils/get-iso-week-number.jsで

},{"../..":8,"assert":34}],227:[function(require,module,exports){
"use strict";

// 週番号の取得
var koyomi = require('../..').create();

var get = koyomi.getWeekNumber.bind(koyomi);

var eq = require('assert').deepEqual;

koyomi.startMonth = 1;
koyomi.startWeek = '日';
eq(get('2015-1-1'), 1); // さらに詳細なテストはutils/get-week-number.jsで

},{"../..":8,"assert":34}],228:[function(require,module,exports){
"use strict";

// 第x w曜日 計算
var koyomi = require('../..').create();

var get = koyomi.getXDay.bind(koyomi);

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

eq(get(1, '月', '2015-1-1'), D(2015, 1, 5)); // さらに詳細なテストはutils/get-x-day.jsで

},{"../..":8,"../../date-extra.js":1,"assert":34}],229:[function(require,module,exports){
"use strict";

// 口語を日時に
var koyomi = require('../..').create();

var parse = koyomi.parse.bind(koyomi);

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

var now = new Date();
var y = now.getFullYear();
var m = now.getMonth() + 1;
var d = now.getDate();
koyomi.startMonth = 1;
koyomi.startWeek = '日';
koyomi.regularHoliday = null;
koyomi.seasonHoliday = null;
koyomi.openOnHoliday = true; // 口語

eq(parse('今日'), D(y, m, d)); // さらに詳細なテストはutils/parse.jsで
// 営業日

eq(parse('３営業日'), D(y, m, d + 3)); // さらに詳細なテストはcalc-biz/add-biz.jsで
// toDatetimeに委譲

eq(parse('２０１５年１０月８日 ８時１５分'), D(2015, 10, 8, 8, 15)); // さらに詳細なテストはutils/to-datetime.jsで

},{"../..":8,"../../date-extra.js":1,"assert":34}],230:[function(require,module,exports){
"use strict";

// 日にち取得
var koyomi = require('../..').create();

var to = koyomi.toDate.bind(koyomi);

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

koyomi.startMonth = 1;
koyomi.startWeek = '日';
eq(to('２０１５年１０月８日 ８時１５分'), D(2015, 10, 8)); // さらに詳細なテストはutils/to-date.jsで

},{"../..":8,"../../date-extra.js":1,"assert":34}],231:[function(require,module,exports){
"use strict";

// 日時取得
var koyomi = require('../..').create();

var to = koyomi.toDatetime.bind(koyomi);

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

koyomi.startMonth = 1;
koyomi.startWeek = '日';
eq(to('２０１５年１０月８日 ８時１５分'), D(2015, 10, 8, 8, 15)); // さらに詳細なテストはutils/to-datetime.jsで

},{"../..":8,"../../date-extra.js":1,"assert":34}],232:[function(require,module,exports){
"use strict";

// 指定した位の加減
var add = require('../../lib/utils/addTerm');

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

eq(add(D(2015, 10, 8), {
  d: 1
}), D(2015, 10, 9));
eq(add(D(2015, 1, 31), {
  m: 1
}), D(2015, 2, 28));
eq(add(D(2015, 2, 28), {
  m: -1
}), D(2015, 1, 28));

},{"../../date-extra.js":1,"../../lib/utils/addTerm":12,"assert":34}],233:[function(require,module,exports){
"use strict";

require('./add-term');

require('./compile-tostring-format');

require('./compile-tostring-regular-holiday');

require('./compile-tostring-season-holiday');

require('./count-biz');

require('./format-array');

require('./format-options');

require('./get-day-info');

require('./get-era');

require('./get-iso-week-number');

require('./get-week-index');

require('./get-week-number');

require('./get-x-day');

require('./parse');

require('./replace-term');

require('./separate');

require('./to-date');

require('./to-datetime');

},{"./add-term":232,"./compile-tostring-format":234,"./compile-tostring-regular-holiday":235,"./compile-tostring-season-holiday":236,"./count-biz":237,"./format-array":238,"./format-options":239,"./get-day-info":240,"./get-era":241,"./get-iso-week-number":242,"./get-week-index":243,"./get-week-number":244,"./get-x-day":245,"./parse":246,"./replace-term":247,"./separate":248,"./to-date":249,"./to-datetime":250}],234:[function(require,module,exports){
"use strict";

// フォーマットのコンパイル
var format = require('../../lib/utils/compileFormat');

var toString = require('../../lib/utils/toStringFormat');

var eq = require('assert').deepEqual;

eq(format('A'), {
  v: [{
    p: 'A'
  }]
});
eq(toString({
  v: [{
    p: 'A'
  }]
}), '{A}');
eq(format('YYYY年MM月DD日(W>1)>>漢数字'), {
  v: [{
    p: 'YYYY'
  }, '年', {
    p: 'MM'
  }, '月', {
    p: 'DD'
  }, '日(', {
    p: 'W',
    o: 1
  }, ')'],
  o: {
    kansuji: true
  }
});
eq(toString({
  v: [{
    p: 'YYYY'
  }, '年', {
    p: 'MM'
  }, '月', {
    p: 'DD'
  }, '日(', {
    p: 'W',
    o: 1
  }, ')'],
  o: {
    kansuji: true
  }
}), '{YYYY}年{MM}月{DD}日({W>1})>>漢数字');

},{"../../lib/utils/compileFormat":13,"../../lib/utils/toStringFormat":31,"assert":34}],235:[function(require,module,exports){
"use strict";

// 週インデックス
var compile = require('../../lib/utils/compileRegularHoliday');

var toString = require('../../lib/utils/toStringRegularHoliday');

var eq = require('assert').deepEqual; // 曜日


eq(compile('日'), {
  week: {
    '0': true
  },
  day: {},
  xweek: {}
});
eq(toString({
  week: {
    '0': true
  },
  day: {},
  xweek: {}
}), '日');
eq(compile('Mon'), {
  week: {
    '1': true
  },
  day: {},
  xweek: {}
});
eq(compile('tue'), {
  week: {
    '2': true
  },
  day: {},
  xweek: {}
});
eq(compile('wednesday'), {
  week: {
    '3': true
  },
  day: {},
  xweek: {}
});
eq(compile('THURSDAY'), {
  week: {
    '4': true
  },
  day: {},
  xweek: {}
});
eq(toString({
  week: {
    '4': true
  },
  day: {},
  xweek: {}
}), '木');
eq(compile('土  ,   日'), {
  week: {
    '6': true,
    '0': true
  },
  day: {},
  xweek: {}
});
eq(compile('月, 火, 休'), {
  week: {
    '1': true,
    '2': true
  },
  day: {},
  xweek: {}
});
eq(toString({
  week: {
    '1': true,
    '2': true
  },
  day: {},
  xweek: {}
}), '月, 火'); // 日

eq(compile('20'), {
  week: {},
  day: {
    '20': true
  },
  xweek: {}
});
eq(toString({
  week: {},
  day: {
    '20': true
  },
  xweek: {}
}), '20');
eq(compile('10,20'), {
  week: {},
  day: {
    '10': true,
    '20': true
  },
  xweek: {}
});
eq(toString({
  week: {},
  day: {
    '10': true,
    '20': true
  },
  xweek: {}
}), '10, 20'); // 第x week曜日

eq(compile('2水'), {
  week: {},
  day: {},
  xweek: {
    '2-3': true
  }
});
eq(compile('4木,6木'), {
  week: {},
  day: {},
  xweek: {
    '4-4': true,
    '5-4': true
  }
});
eq(toString({
  week: {},
  day: {},
  xweek: {
    '4-4': true,
    '5-4': true
  }
}), '4木, 5木'); // 混合

eq(compile('土,日,2水,20'), {
  week: {
    '0': true,
    '6': true
  },
  day: {
    '20': true
  },
  xweek: {
    '2-3': true
  }
});
eq(toString({
  week: {
    '6': true,
    '0': true
  },
  day: {
    '20': true
  },
  xweek: {
    '2-3': true
  }
}), '日, 土, 20, 2水'); // 関数

function d(date) {
  return date.getDate() !== 1;
}

eq(compile(d), d);
eq(toString(d), d);

},{"../../lib/utils/compileRegularHoliday":14,"../../lib/utils/toStringRegularHoliday":32,"assert":34}],236:[function(require,module,exports){
"use strict";

// 日付リストの取得
var compile = require('../../lib/utils/compileSeasonHoliday');

var toString = require('../../lib/utils/toStringSeasonHoliday');

var eq = require('assert').deepEqual;

eq(compile('12/29-1/3'), {
  1229: '休業期間',
  1230: '休業期間',
  1231: '休業期間',
  101: '休業期間',
  102: '休業期間',
  103: '休業期間'
});
eq(toString({
  1229: '休業期間',
  1230: '休業期間',
  1231: '休業期間',
  101: '休業期間',
  102: '休業期間',
  103: '休業期間'
}), '休業期間 1/1, 1/2, 1/3, 12/29, 12/30, 12/31');
eq(compile('12/29-1/3, 8/16-8/19'), {
  1229: '休業期間',
  1230: '休業期間',
  1231: '休業期間',
  101: '休業期間',
  102: '休業期間',
  103: '休業期間',
  816: '休業期間',
  817: '休業期間',
  818: '休業期間',
  819: '休業期間'
});
eq(compile('4/29-5/2'), {
  429: '休業期間',
  430: '休業期間',
  501: '休業期間',
  502: '休業期間'
});
eq(compile('2/29-3/1'), {
  229: '休業期間',
  301: '休業期間'
});
eq(compile('1/2, 1/5, 1/10'), {
  102: '休業期間',
  105: '休業期間',
  110: '休業期間'
});
eq(compile('夏の間'), null);
eq(compile('夏の間, 10/10-10/12'), {
  1010: '休業期間',
  1011: '休業期間',
  1012: '休業期間'
});
eq(compile('夏の間 10/10-10/12'), {
  1010: '夏の間',
  1011: '夏の間',
  1012: '夏の間'
});
eq(compile('夏の間 10/10-10/12, 10/20'), {
  1010: '夏の間',
  1011: '夏の間',
  1012: '夏の間',
  1020: '夏の間'
});
eq(compile('年末年始のお休み 12/29-1/3, お盆のお休み 8/16-8/19'), {
  1229: '年末年始のお休み',
  1230: '年末年始のお休み',
  1231: '年末年始のお休み',
  101: '年末年始のお休み',
  102: '年末年始のお休み',
  103: '年末年始のお休み',
  816: 'お盆のお休み',
  817: 'お盆のお休み',
  818: 'お盆のお休み',
  819: 'お盆のお休み'
});

function d() {}

eq(compile(d), d);
eq(toString(d), d);

},{"../../lib/utils/compileSeasonHoliday":15,"../../lib/utils/toStringSeasonHoliday":33,"assert":34}],237:[function(require,module,exports){
"use strict";

// 営業日の計算
var koyomi = require('../..').create();

var count = require('../../lib/utils/countBiz');

var eq = require('assert').equal;

var fromTo = count.countFromTo;
var term = count.countTerm;

var D = require('../../date-extra.js');

koyomi.regularHoliday = '土,日';
koyomi.seasonHoliday = '12/29-1/3';
koyomi.openOnHoliday = false; // from to

eq(fromTo(koyomi, D(2015, 1, 1), D(2015, 1, 5)), 1); // term

eq(term(koyomi, D(2015, 1, 1), 'm'), 19); // いろんなパターンをcalc-bizのbiz-from-to,biz-term,biz-yyyymmでテスト済み

},{"../..":8,"../../date-extra.js":1,"../../lib/utils/countBiz":16,"assert":34}],238:[function(require,module,exports){
// テストはformat/allで行っています
"use strict";

},{}],239:[function(require,module,exports){
// テストはformat/allで行っています
"use strict";

},{}],240:[function(require,module,exports){
"use strict";

// 日情報取得
var get = require('../../lib/utils/getDayInfo');

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

var days = {
  '2015-12-24': {
    events: ['クリスマスパーティー']
  }
};
eq(get(days, D(2015, 12, 24)), {
  events: ['クリスマスパーティー']
});
eq(get(days, D(2015, 1, 1)), null);
eq(days, {
  '2015-12-24': {
    events: ['クリスマスパーティー']
  }
});
eq(get(days, D(2015, 1, 1), true), {
  events: []
});
eq(days, {
  '2015-12-24': {
    events: ['クリスマスパーティー']
  },
  '2015-1-1': {
    events: []
  }
});

},{"../../date-extra.js":1,"../../lib/utils/getDayInfo":19,"assert":34}],241:[function(require,module,exports){
"use strict";

// 年号取得
var get = require('../../lib/utils/getEra');

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

var reiwa = {
  N: '令和',
  n: 'R',
  y: 2019,
  d: D(2019, 5, 1)
};
var heisei = {
  N: '平成',
  n: 'H',
  y: 1989,
  d: D(1989, 1, 8)
};
var showa = {
  N: '昭和',
  n: 'S',
  y: 1926,
  d: D(1926, 12, 25)
};
var taisho = {
  N: '大正',
  n: 'T',
  y: 1912,
  d: D(1912, 7, 30)
};
var meiji = {
  N: '明治',
  n: 'M',
  y: 1868,
  d: D(1868, 1, 25)
};
var seireki = {
  N: '西暦',
  n: '',
  y: 1,
  d: new Date(-62135629200000)
}; // D(1,1,1)

eq(get(D(2019, 5, 1)), reiwa);
eq(get(D(2019, 4, 1)), reiwa);
eq(get(D(2015, 5, 5)), heisei);
eq(get(D(1989, 1, 1)), heisei);
eq(get(D(1989, 1, 1), true), showa);
eq(get(D(1926, 1, 1)), showa);
eq(get(D(1926, 1, 1), true), taisho);
eq(get(D(1926, 12, 26)), showa);
eq(get(D(1926, 12, 26), true), showa);
eq(get(D(1868, 1, 1)), seireki);
eq(get(D(1872, 12, 31)), seireki);
eq(get(D(1873, 1, 1)), meiji);

},{"../../date-extra.js":1,"../../lib/utils/getEra":20,"assert":34}],242:[function(require,module,exports){
"use strict";

// ISO週番号の取得
var get = require('../../lib/utils/getISOWeekNumber');

var eq = require('assert').equal;

var D = require('../../date-extra.js'); // 2015


eq(get(D(2015, 1, 1)), 1);
eq(get(D(2015, 1, 2)), 1);
eq(get(D(2015, 1, 3)), 1);
eq(get(D(2015, 1, 4)), 1);
eq(get(D(2015, 1, 5)), 2);
eq(get(D(2015, 4, 1)), 14);
eq(get(D(2015, 4, 2)), 14);
eq(get(D(2015, 4, 3)), 14);
eq(get(D(2015, 4, 4)), 14);
eq(get(D(2015, 4, 5)), 14);
eq(get(D(2015, 4, 6)), 15);
eq(get(D(2015, 12, 27)), 52);
eq(get(D(2015, 12, 28)), 53);
eq(get(D(2015, 12, 29)), 53);
eq(get(D(2015, 12, 30)), 53);
eq(get(D(2015, 12, 31)), 53); // 2017

eq(get(D(2017, 1, 1)), 53);
eq(get(D(2017, 1, 2)), 1);
eq(get(D(2017, 1, 3)), 1);
eq(get(D(2017, 1, 4)), 1);
eq(get(D(2017, 1, 5)), 1);
eq(get(D(2017, 1, 6)), 1);
eq(get(D(2017, 1, 7)), 1);
eq(get(D(2017, 12, 25)), 52);
eq(get(D(2017, 12, 26)), 52);
eq(get(D(2017, 12, 27)), 52);
eq(get(D(2017, 12, 28)), 52);
eq(get(D(2017, 12, 29)), 52);
eq(get(D(2017, 12, 30)), 52);
eq(get(D(2017, 12, 31)), 52); // 2016

eq(get(D(2016, 1, 1)), 53);
eq(get(D(2016, 1, 2)), 53);
eq(get(D(2016, 1, 3)), 53);
eq(get(D(2016, 1, 4)), 1);
eq(get(D(2016, 1, 5)), 1);
eq(get(D(2016, 1, 6)), 1);
eq(get(D(2016, 1, 7)), 1);
eq(get(D(2016, 12, 25)), 51);
eq(get(D(2016, 12, 26)), 52);
eq(get(D(2016, 12, 27)), 52);
eq(get(D(2016, 12, 28)), 52);
eq(get(D(2016, 12, 29)), 52);
eq(get(D(2016, 12, 30)), 52);
eq(get(D(2016, 12, 31)), 52); // 2014

eq(get(D(2014, 1, 1)), 1);
eq(get(D(2014, 1, 2)), 1);
eq(get(D(2014, 1, 3)), 1);
eq(get(D(2014, 1, 4)), 1);
eq(get(D(2014, 1, 5)), 1);
eq(get(D(2014, 1, 6)), 2);
eq(get(D(2014, 1, 7)), 2);
eq(get(D(2014, 12, 25)), 52);
eq(get(D(2014, 12, 26)), 52);
eq(get(D(2014, 12, 27)), 52);
eq(get(D(2014, 12, 28)), 52);
eq(get(D(2014, 12, 29)), 1);
eq(get(D(2014, 12, 30)), 1);
eq(get(D(2014, 12, 31)), 1); // 2013

eq(get(D(2013, 1, 1)), 1);
eq(get(D(2013, 1, 2)), 1);
eq(get(D(2013, 1, 3)), 1);
eq(get(D(2013, 1, 4)), 1);
eq(get(D(2013, 1, 5)), 1);
eq(get(D(2013, 1, 6)), 1);
eq(get(D(2013, 1, 7)), 2);
eq(get(D(2013, 12, 25)), 52);
eq(get(D(2013, 12, 26)), 52);
eq(get(D(2013, 12, 27)), 52);
eq(get(D(2013, 12, 28)), 52);
eq(get(D(2013, 12, 29)), 52);
eq(get(D(2013, 12, 30)), 1);
eq(get(D(2013, 12, 31)), 1);

},{"../../date-extra.js":1,"../../lib/utils/getISOWeekNumber":21,"assert":34}],243:[function(require,module,exports){
"use strict";

// 週インデックス
var get = require('../../lib/utils/getWeekIndex');

var eq = require('assert').deepEqual;

eq(get('日'), 0);
eq(get('月'), 1);
eq(get('火'), 2);
eq(get('水'), 3);
eq(get('木'), 4);
eq(get('金'), 5);
eq(get('土'), 6);
eq(get('Sun'), 0);
eq(get('Mon'), 1);
eq(get('Tue'), 2);
eq(get('Wed'), 3);
eq(get('Thu'), 4);
eq(get('Fri'), 5);
eq(get('Sat'), 6);
eq(get('sun'), 0);
eq(get('mon'), 1);
eq(get('tue'), 2);
eq(get('wed'), 3);
eq(get('thu'), 4);
eq(get('fri'), 5);
eq(get('sat'), 6);
eq(get('sunday'), 0);
eq(get('monday'), 1);
eq(get('tuesday'), 2);
eq(get('wednesday'), 3);
eq(get('thursday'), 4);
eq(get('friday'), 5);
eq(get('saturday'), 6);
eq(get('SUNDAY'), 0);
eq(get('MONDAY'), 1);
eq(get('TUESDAY'), 2);
eq(get('WEDNESDAY'), 3);
eq(get('THURSDAY'), 4);
eq(get('FRIDAY'), 5);
eq(get('SATURDAY'), 6);
eq(get('休'), null);
eq(get('土,日'), [6, 0]);
eq(get('休,祝'), null);
eq(get('月,火,休'), [1, 2]);

},{"../../lib/utils/getWeekIndex":22,"assert":34}],244:[function(require,module,exports){
"use strict";

// 週番号の取得
var get = require('../../lib/utils/getWeekNumber');

var eq = require('assert').equal;

var D = require('../../date-extra.js');

var SUN = 0;
var MON = 1;
var THU = 4;
eq(get(D(2015, 1, 1), SUN, 1), 1);
eq(get(D(2015, 4, 1), SUN, 4), 1);
eq(get(D(2015, 4, 2), SUN, 4), 1);
eq(get(D(2015, 4, 3), SUN, 4), 1);
eq(get(D(2015, 4, 4), SUN, 4), 1);
eq(get(D(2015, 4, 5), SUN, 4), 2);
eq(get(D(2015, 6, 1), THU, 4), 10);
eq(get(D(2015, 6, 2), THU, 4), 10);
eq(get(D(2015, 6, 3), THU, 4), 10);
eq(get(D(2015, 6, 4), THU, 4), 11);
eq(get(D(2015, 6, 5), THU, 4), 11);
eq(get(D(2015, 4, 1), MON, 4), 1);
eq(get(D(2015, 4, 1), MON, 4), 1);
eq(get(D(2015, 4, 1), SUN, 4), 1);
eq(get(D(2015, 4, 2), SUN, 4), 1);
eq(get(D(2015, 4, 3), SUN, 4), 1);
eq(get(D(2015, 4, 4), SUN, 4), 1);
eq(get(D(2015, 4, 5), SUN, 4), 2);
eq(get(D(2015, 6, 1), THU, 4), 10);
eq(get(D(2015, 6, 2), THU, 4), 10);
eq(get(D(2015, 6, 3), THU, 4), 10);
eq(get(D(2015, 6, 4), THU, 4), 11);
eq(get(D(2015, 6, 5), THU, 4), 11);

},{"../../date-extra.js":1,"../../lib/utils/getWeekNumber":23,"assert":34}],245:[function(require,module,exports){
"use strict";

// 第x w曜日 計算
var get = require('../../lib/utils/getXDay');

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

var SUN = 0;
var MON = 1;
var TUE = 2;
var WED = 3;
var THU = 4;
var FRI = 5;
var SAT = 6;
eq(get(2015, 1, 1, MON), D(2015, 1, 5));
eq(get(2015, 1, 2, MON), D(2015, 1, 12));
eq(get(2015, 1, 3, MON), D(2015, 1, 19));
eq(get(2015, 1, 4, MON), D(2015, 1, 26));
eq(get(2015, 1, 1, SAT), D(2015, 1, 3));
eq(get(2015, 1, 4, SAT), D(2015, 1, 24));
eq(get(2015, 1, 5, SUN), D(2015, 1, 25));
eq(get(2015, 1, 5, MON), D(2015, 1, 26));
eq(get(2015, 1, 5, TUE), D(2015, 1, 27));
eq(get(2015, 1, 5, WED), D(2015, 1, 28));
eq(get(2015, 1, 5, THU), D(2015, 1, 29));
eq(get(2015, 1, 5, FRI), D(2015, 1, 30));
eq(get(2015, 1, 5, SAT), D(2015, 1, 31));
eq(get(2015, 5, 4, SUN), D(2015, 5, 24));
eq(get(2015, 5, 5, SUN), D(2015, 5, 31));
eq(get(2015, 5, 5, MON), D(2015, 5, 25));
eq(get(2015, 5, 5, TUE), D(2015, 5, 26));
eq(get(2015, 5, 5, WED), D(2015, 5, 27));
eq(get(2015, 5, 5, THU), D(2015, 5, 28));
eq(get(2015, 5, 5, FRI), D(2015, 5, 29));
eq(get(2015, 5, 5, SAT), D(2015, 5, 30));

},{"../../date-extra.js":1,"../../lib/utils/getXDay":24,"assert":34}],246:[function(require,module,exports){
"use strict";

var parse = require('../../lib/utils/parse');

var startMonth = 4; // 一月

var startWeek = 1; // 月曜日

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

var now = D(2015, 10, 9, 14, 35, 22, 621);

function create(value, date) {
  return parse(value, startMonth, startWeek, date || now);
} // 現在日時 2015年10月9日 金曜日 14時35分22.621秒


eq(create('今'), D(2015, 10, 9, 14, 35, 22, 621));
eq(create('いま'), D(2015, 10, 9, 14, 35, 22, 621));
eq(create('now'), D(2015, 10, 9, 14, 35, 22, 621));
eq(create('今日'), D(2015, 10, 9));
eq(create('きょう'), D(2015, 10, 9));
eq(create('本日'), D(2015, 10, 9));
eq(create('today'), D(2015, 10, 9));
eq(create('昨日'), D(2015, 10, 8));
eq(create('きのう'), D(2015, 10, 8));
eq(create('yesterday'), D(2015, 10, 8));
eq(create('明日'), D(2015, 10, 10));
eq(create('あす'), D(2015, 10, 10));
eq(create('あした'), D(2015, 10, 10));
eq(create('tomorrow'), D(2015, 10, 10));
eq(create('明後日'), D(2015, 10, 11));
eq(create('あさって'), D(2015, 10, 11));
eq(create('一昨日'), D(2015, 10, 7));
eq(create('おととい'), D(2015, 10, 7));
eq(create('年初'), D(2015, 1, 1));
eq(create('今年初め'), D(2015, 1, 1));
eq(create('年末'), D(2015, 12, 31));
eq(create('今年末'), D(2015, 12, 31));
eq(create('来年初め'), D(2016, 1, 1));
eq(create('来年末'), D(2016, 12, 31));
eq(create('昨年初め'), D(2014, 1, 1));
eq(create('昨年末'), D(2014, 12, 31));
eq(create('年度始め'), D(2015, 4, 1));
eq(create('年度末'), D(2016, 3, 31));
eq(create('月初'), D(2015, 10, 1));
eq(create('月初め'), D(2015, 10, 1));
eq(create('今月初め'), D(2015, 10, 1));
eq(create('月末'), D(2015, 10, 31));
eq(create('月終わり'), D(2015, 10, 31));
eq(create('今月終わり'), D(2015, 10, 31));
eq(create('週初'), D(2015, 10, 5));
eq(create('週初め'), D(2015, 10, 5));
eq(create('今週初め'), D(2015, 10, 5));
eq(create('週開始'), D(2015, 10, 5));
eq(create('週末'), D(2015, 10, 11));
eq(create('今週末'), D(2015, 10, 11));
eq(create('週終わり'), D(2015, 10, 11));
eq(create('二週間前'), D(2015, 9, 25));
eq(create('二週間後'), D(2015, 10, 23));
eq(create('一ヶ月後', D(2015, 1, 31)), D(2015, 2, 28));
eq(create('一ヶ月前', D(2015, 2, 28)), D(2015, 1, 28));
eq(create('今週日曜日'), D(2015, 10, 11));
eq(create('今週月曜日'), D(2015, 10, 5));
eq(create('今週火曜日'), D(2015, 10, 6));
eq(create('今週水曜日'), D(2015, 10, 7));
eq(create('今週木曜日'), D(2015, 10, 8));
eq(create('今週金曜日'), D(2015, 10, 9));
eq(create('今週土曜日'), D(2015, 10, 10));
startWeek = 3; // 水曜日

eq(create('今週日曜日'), D(2015, 10, 11));
eq(create('今週月曜日'), D(2015, 10, 12));
eq(create('今週火曜日'), D(2015, 10, 13));
eq(create('今週水曜日'), D(2015, 10, 7));
eq(create('今週木曜日'), D(2015, 10, 8));
eq(create('今週金曜日'), D(2015, 10, 9));
eq(create('今週土曜日'), D(2015, 10, 10));
startWeek = 0; // 日曜日

eq(create('今週日曜日'), D(2015, 10, 4));
eq(create('今週月曜日'), D(2015, 10, 5));
eq(create('今週火曜日'), D(2015, 10, 6));
eq(create('今週水曜日'), D(2015, 10, 7));
eq(create('今週木曜日'), D(2015, 10, 8));
eq(create('今週金曜日'), D(2015, 10, 9));
eq(create('今週土曜日'), D(2015, 10, 10));
startWeek = 1; // 月曜日

eq(create('先週日曜日'), D(2015, 10, 4));
eq(create('先週月曜日'), D(2015, 9, 28));
eq(create('先週火曜日'), D(2015, 9, 29));
eq(create('先週水曜日'), D(2015, 9, 30));
eq(create('先週木曜日'), D(2015, 10, 1));
eq(create('先週金曜日'), D(2015, 10, 2));
eq(create('先週土曜日'), D(2015, 10, 3));
eq(create('今度の日曜日'), D(2015, 10, 11));
eq(create('今度の月曜日'), D(2015, 10, 12));
eq(create('今度の火曜日'), D(2015, 10, 13));
eq(create('今度の水曜日'), D(2015, 10, 14));
eq(create('今度の木曜日'), D(2015, 10, 15));
eq(create('今度の金曜日'), D(2015, 10, 16));
eq(create('今度の土曜日'), D(2015, 10, 10));
eq(create('前回の日曜日'), D(2015, 10, 4));
eq(create('前回の月曜日'), D(2015, 10, 5));
eq(create('前回の火曜日'), D(2015, 10, 6));
eq(create('前回の水曜日'), D(2015, 10, 7));
eq(create('前回の木曜日'), D(2015, 10, 8));
eq(create('前回の金曜日'), D(2015, 10, 2));
eq(create('前回の土曜日'), D(2015, 10, 3));

},{"../../date-extra.js":1,"../../lib/utils/parse":25,"assert":34}],247:[function(require,module,exports){
"use strict";

// 指定した位の置き換え
var replace = require('../../lib/utils/replaceTerm');

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

eq(replace(D(2015, 10, 8), {
  d: 1
}), D(2015, 10, 1));
eq(replace(D(2015, 2, 28), {
  d: 31
}), D(2015, 3, 3));
eq(replace(D(2015, 1, 31), {
  m: 2
}), D(2015, 2, 28));
eq(replace(D(2016, 2, 29), {
  y: 2015
}), D(2015, 2, 28));

},{"../../date-extra.js":1,"../../lib/utils/replaceTerm":26,"assert":34}],248:[function(require,module,exports){
"use strict";

var sp = require('../../lib/utils/separate');

var eq = require('assert').deepEqual;

var D = require('../../date-extra.js');

var r; // 2015/1/1 .. 2015/12/31

r = sp(D(2015, 1, 1), D(2015, 12, 31), 1);
eq(r, {
  years: [D(2015, 1, 1)],
  months: [],
  days: []
}); // 2015/1/1 .. 2015/1/31

r = sp(D(2015, 1, 1), D(2015, 1, 31), 1);
eq(r, {
  years: [],
  months: [D(2015, 1, 1)],
  days: []
}); // 2015/1/1 .. 2015/2/28

r = sp(D(2015, 1, 1), D(2015, 2, 28), 1);
eq(r, {
  years: [],
  months: [D(2015, 1, 1), D(2015, 2, 1)],
  days: []
}); // 2015/1/1 .. 2015/1/3

r = sp(D(2015, 1, 1), D(2015, 1, 3), 1);
eq(r, {
  years: [],
  months: [],
  days: [D(2015, 1, 1), D(2015, 1, 2), D(2015, 1, 3)]
}); // 2015/1/29 .. 2015/1/31

r = sp(D(2015, 1, 29), D(2015, 1, 31), 1);
eq(r, {
  years: [],
  months: [],
  days: [D(2015, 1, 29), D(2015, 1, 30), D(2015, 1, 31)]
}); // 2015/1/15 .. 2015/1/17

r = sp(D(2015, 1, 15), D(2015, 1, 17), 1);
eq(r, {
  years: [],
  months: [],
  days: [D(2015, 1, 15), D(2015, 1, 16), D(2015, 1, 17)]
}); // 2015/1/29 .. 2015/2/3

r = sp(D(2015, 1, 29), D(2015, 2, 3), 1);
eq(r, {
  years: [],
  months: [],
  days: [D(2015, 1, 29), D(2015, 1, 30), D(2015, 1, 31), D(2015, 2, 1), D(2015, 2, 2), D(2015, 2, 3)]
}); // 2015/1/1 .. 2015/2/1

r = sp(D(2015, 1, 1), D(2015, 2, 1), 1);
eq(r, {
  years: [],
  months: [D(2015, 1, 1)],
  days: [D(2015, 2, 1)]
}); // 2015/11/29 .. 2017/2/3

r = sp(D(2015, 11, 29), D(2017, 2, 3), 1);
eq(r, {
  years: [D(2016, 1, 1)],
  months: [D(2015, 12, 1), D(2017, 1, 1)],
  days: [D(2015, 11, 29), D(2015, 11, 30), D(2017, 2, 1), D(2017, 2, 2), D(2017, 2, 3)]
}); // 2015/1/1 .. 2015/12/31   4

r = sp(D(2015, 1, 1), D(2015, 12, 31), 4);
eq(r, {
  years: [],
  months: [D(2015, 1, 1), D(2015, 2, 1), D(2015, 3, 1), D(2015, 4, 1), D(2015, 5, 1), D(2015, 6, 1), D(2015, 7, 1), D(2015, 8, 1), D(2015, 9, 1), D(2015, 10, 1), D(2015, 11, 1), D(2015, 12, 1)],
  days: []
}); // 2015/4/1 .. 2016/3/31   4

r = sp(D(2015, 4, 1), D(2016, 3, 31), 4);
eq(r, {
  years: [D(2015, 4, 1)],
  months: [],
  days: []
}); // 2015/1/29 .. 2017/7/2

r = sp(D(2015, 1, 29), D(2017, 7, 2), 4);
eq(r, {
  years: [D(2015, 4, 1), D(2016, 4, 1)],
  months: [D(2015, 2, 1), D(2015, 3, 1), D(2017, 4, 1), D(2017, 5, 1), D(2017, 6, 1)],
  days: [D(2015, 1, 29), D(2015, 1, 30), D(2015, 1, 31), D(2017, 7, 1), D(2017, 7, 2)]
}); // 2015/1/2 .. 2015/12/31

r = sp(D(2015, 1, 2), D(2015, 12, 31), 1);
eq(r, {
  years: [],
  months: [D(2015, 2, 1), D(2015, 3, 1), D(2015, 4, 1), D(2015, 5, 1), D(2015, 6, 1), D(2015, 7, 1), D(2015, 8, 1), D(2015, 9, 1), D(2015, 10, 1), D(2015, 11, 1), D(2015, 12, 1)],
  days: [D(2015, 1, 2), D(2015, 1, 3), D(2015, 1, 4), D(2015, 1, 5), D(2015, 1, 6), D(2015, 1, 7), D(2015, 1, 8), D(2015, 1, 9), D(2015, 1, 10), D(2015, 1, 11), D(2015, 1, 12), D(2015, 1, 13), D(2015, 1, 14), D(2015, 1, 15), D(2015, 1, 16), D(2015, 1, 17), D(2015, 1, 18), D(2015, 1, 19), D(2015, 1, 20), D(2015, 1, 21), D(2015, 1, 22), D(2015, 1, 23), D(2015, 1, 24), D(2015, 1, 25), D(2015, 1, 26), D(2015, 1, 27), D(2015, 1, 28), D(2015, 1, 29), D(2015, 1, 30), D(2015, 1, 31)]
}); // 2015/1/1 .. 2015/12/30

r = sp(D(2015, 1, 1), D(2015, 12, 30), 1);
eq(r, {
  years: [],
  months: [D(2015, 1, 1), D(2015, 2, 1), D(2015, 3, 1), D(2015, 4, 1), D(2015, 5, 1), D(2015, 6, 1), D(2015, 7, 1), D(2015, 8, 1), D(2015, 9, 1), D(2015, 10, 1), D(2015, 11, 1)],
  days: [D(2015, 12, 1), D(2015, 12, 2), D(2015, 12, 3), D(2015, 12, 4), D(2015, 12, 5), D(2015, 12, 6), D(2015, 12, 7), D(2015, 12, 8), D(2015, 12, 9), D(2015, 12, 10), D(2015, 12, 11), D(2015, 12, 12), D(2015, 12, 13), D(2015, 12, 14), D(2015, 12, 15), D(2015, 12, 16), D(2015, 12, 17), D(2015, 12, 18), D(2015, 12, 19), D(2015, 12, 20), D(2015, 12, 21), D(2015, 12, 22), D(2015, 12, 23), D(2015, 12, 24), D(2015, 12, 25), D(2015, 12, 26), D(2015, 12, 27), D(2015, 12, 28), D(2015, 12, 29), D(2015, 12, 30)]
});

},{"../../date-extra.js":1,"../../lib/utils/separate":27,"assert":34}],249:[function(require,module,exports){
"use strict";

// 日にち取得
var to = require('../../lib/utils/toDate');

var sm = require('../../lib/config').START_MONTH;

var assert = require('assert');

var eq = assert.deepEqual;

var D = require('../../date-extra.js');

var today = new Date();
var y = today.getFullYear();
var m = today.getMonth() + 1;
var d = today.getDate();
eq(to(), null);
eq(to(D(2015, 5, 1)), D(2015, 5, 1));
eq(to('2015-5-1'), D(2015, 5, 1));
eq(to('2015/5/1'), D(2015, 5, 1));
eq(to('2015.5.1'), D(2015, 5, 1));
eq(to('H27-5-1'), D(2015, 5, 1));
eq(to('H27.5.1'), D(2015, 5, 1));
eq(to(20150501), D(2015, 5, 1));
eq(to([2015, 5, 1]), D(2015, 5, 1));
eq(to({
  y: 2015,
  m: 5,
  d: 1
}), D(2015, 5, 1)); // 参照テスト

var x = D(2015, 1, 1);
eq(to(x) === x, false); // -------- 文字列

eq(to('2015年11月23日午後1時20分'), D(2015, 11, 23)); // 数字(型:文字列)

eq(to('2015'), D(2015, sm, 1));
eq(to('201501'), D(2015, 1, 1));
eq(to('201511'), D(2015, 11, 1));
eq(to('20150101'), D(2015, 1, 1));
eq(to('20151123'), D(2015, 11, 23));
eq(to('2015112301'), D(2015, 11, 23));
eq(to('201511230101'), D(2015, 11, 23));
eq(to('20151123010101'), D(2015, 11, 23)); // 時刻のみ

eq(to('10:00'), D(y, m, d));
eq(to('am10:00'), D(y, m, d));
eq(to('am10'), null);
eq(to('pm10:00'), D(y, m, d));
eq(to('10:00:20'), D(y, m, d));
eq(to('8時50分'), D(y, m, d));
eq(to('十時'), D(y, m, d));
eq(to('午後３時'), D(y, m, d)); // 漢数字

eq(to('二千十五年十月十二日'), D(2015, 10, 12));
eq(to('千九百九十三年十二月二十三日'), D(1993, 12, 23)); // 漢字

eq(to('二〇一五年一〇月一二日'), D(2015, 10, 12));
eq(to('二〇一五年十月十二日'), D(2015, 10, 12)); // 全角

eq(to('２０１５年１０月１２日'), D(2015, 10, 12)); // 和暦

eq(to('昭和50年10月10日'), D(1975, 10, 10));
eq(to('昭和五十年十月十二日'), D(1975, 10, 12));
eq(to('平成元年十月十二日'), D(1989, 10, 12)); // ------------ 数字

eq(to(2015), D(2015, sm, 1));
eq(to(201501), D(2015, 1, 1));
eq(to(201511), D(2015, 11, 1));
eq(to(20150101), D(2015, 1, 1));
eq(to(20151123), D(2015, 11, 23));
eq(to(2015112301), D(2015, 11, 23));
eq(to(201511230101), D(2015, 11, 23));
eq(to(20151123010101), D(2015, 11, 23)); // ------------ 配列

eq(to([2015]), D(2015, sm, 1));
eq(to([2015, 1]), D(2015, 1, 1));
eq(to([2015, 11]), D(2015, 11, 1));
eq(to([2015, 1, 1]), D(2015, 1, 1));
eq(to([2015, 11, 23]), D(2015, 11, 23));
eq(to([2015, 11, 23, 1]), D(2015, 11, 23));
eq(to([2015, 11, 23, 1, 1]), D(2015, 11, 23));
eq(to([2015, 11, 23, 1, 1, 1]), D(2015, 11, 23));
eq(to([2015, 11, 23, 1, 1, 1, 1]), D(2015, 11, 23)); // ------------ オブジェクト

eq(to({
  y: 2015
}), D(2015, sm, 1));
eq(to({
  y: 2015,
  m: 1
}), D(2015, 1, 1));
eq(to({
  y: 2015,
  m: 11
}), D(2015, 11, 1));
eq(to({
  y: 2015,
  m: 1,
  d: 1
}), D(2015, 1, 1));
eq(to({
  y: 2015,
  m: 11,
  d: 23
}), D(2015, 11, 23));
eq(to({
  y: 2015,
  m: 11,
  d: 23,
  h: 1
}), D(2015, 11, 23));
eq(to({
  y: 2015,
  m: 11,
  d: 23,
  h: 1,
  i: 1
}), D(2015, 11, 23));
eq(to({
  y: 2015,
  m: 11,
  d: 23,
  h: 1,
  i: 1,
  s: 1
}), D(2015, 11, 23));
eq(to({
  y: 2015,
  m: 11,
  d: 23,
  h: 1,
  i: 1,
  s: 1,
  ms: 1
}), D(2015, 11, 23));
eq(to({
  year: 2015,
  month: 11,
  day: 23
}), D(2015, 11, 23));
eq(to({}), D(y, m, d));
eq(to({
  hour: 10,
  min: 30,
  seconds: 40
}), D(y, m, d));

},{"../../date-extra.js":1,"../../lib/config":5,"../../lib/utils/toDate":29,"assert":34}],250:[function(require,module,exports){
"use strict";

// 日時取得
var to = require('../../lib/utils/toDatetime');

var sm = require('../../lib/config').START_MONTH;

var assert = require('assert');

var eq = assert.deepEqual;

var D = require('../../date-extra.js');

var today = new Date();
var y = today.getFullYear();
var m = today.getMonth() + 1;
var d = today.getDate();
eq(to(), null);
eq(to(D(2015, 5, 1)), D(2015, 5, 1));
eq(to('2015-5-1'), D(2015, 5, 1));
eq(to('2015/5/1'), D(2015, 5, 1));
eq(to('2015.5.1'), D(2015, 5, 1));
eq(to('H27-5-1'), D(2015, 5, 1));
eq(to('H27.5.1'), D(2015, 5, 1));
eq(to(20150501), D(2015, 5, 1));
eq(to([2015, 5, 1]), D(2015, 5, 1));
eq(to({
  y: 2015,
  m: 5,
  d: 1
}), D(2015, 5, 1)); // 参照テスト

var x = D(2015, 1, 1);
eq(to(x) === x, true); // -------- 文字列

eq(to('2015年11月23日午後1時20分'), D(2015, 11, 23, 13, 20, 0)); // 数字(型:文字列)

eq(to('2015'), D(2015, sm, 1));
eq(to('201501'), D(2015, 1, 1));
eq(to('201511'), D(2015, 11, 1));
eq(to('20150101'), D(2015, 1, 1));
eq(to('20151123'), D(2015, 11, 23));
eq(to('2015112301'), D(2015, 11, 23, 1, 0, 0));
eq(to('201511230101'), D(2015, 11, 23, 1, 1, 0));
eq(to('20151123010101'), D(2015, 11, 23, 1, 1, 1)); // 時刻のみ

eq(to('10:00'), D(y, m, d, 10, 0, 0));
eq(to('am10:00'), D(y, m, d, 10, 0, 0));
eq(to('am10'), null);
eq(to('pm10:00'), D(y, m, d, 22, 0, 0));
eq(to('10:00:20'), D(y, m, d, 10, 0, 20));
eq(to('8時50分'), D(y, m, d, 8, 50, 0));
eq(to('十時'), D(y, m, d, 10, 0, 0));
eq(to('午後３時'), D(y, m, d, 15, 0, 0)); // 漢数字

eq(to('二千十五年十月十二日'), D(2015, 10, 12));
eq(to('千九百九十三年十二月二十三日'), D(1993, 12, 23)); // 漢字

eq(to('二〇一五年一〇月一二日'), D(2015, 10, 12));
eq(to('二〇一五年十月十二日'), D(2015, 10, 12)); // 全角

eq(to('２０１５年１０月１２日'), D(2015, 10, 12)); // 和暦

eq(to('昭和50年10月10日'), D(1975, 10, 10));
eq(to('昭和五十年十月十二日'), D(1975, 10, 12));
eq(to('平成元年十月十二日'), D(1989, 10, 12)); // ------------ 数字

eq(to(2015), D(2015, sm, 1));
eq(to(201501), D(2015, 1, 1));
eq(to(201511), D(2015, 11, 1));
eq(to(20150101), D(2015, 1, 1));
eq(to(20151123), D(2015, 11, 23));
eq(to(2015112301), D(2015, 11, 23, 1, 0, 0));
eq(to(201511230101), D(2015, 11, 23, 1, 1, 0));
eq(to(20151123010101), D(2015, 11, 23, 1, 1, 1)); // ------------ 配列

eq(to([2015]), D(2015, sm, 1));
eq(to([2015, 1]), D(2015, 1, 1));
eq(to([2015, 11]), D(2015, 11, 1));
eq(to([2015, 1, 1]), D(2015, 1, 1));
eq(to([2015, 11, 23]), D(2015, 11, 23));
eq(to([2015, 11, 23, 1]), D(2015, 11, 23, 1, 0, 0));
eq(to([2015, 11, 23, 1, 1]), D(2015, 11, 23, 1, 1, 0));
eq(to([2015, 11, 23, 1, 1, 1]), D(2015, 11, 23, 1, 1, 1));
eq(to([2015, 11, 23, 1, 1, 1, 1]), D(2015, 11, 23, 1, 1, 1, 1)); // ------------ オブジェクト

eq(to({
  y: 2015
}), D(2015, sm, 1));
eq(to({
  y: 2015,
  m: 1
}), D(2015, 1, 1));
eq(to({
  y: 2015,
  m: 11
}), D(2015, 11, 1));
eq(to({
  y: 2015,
  m: 1,
  d: 1
}), D(2015, 1, 1));
eq(to({
  y: 2015,
  m: 11,
  d: 23
}), D(2015, 11, 23));
eq(to({
  y: 2015,
  m: 11,
  d: 23,
  h: 1
}), D(2015, 11, 23, 1, 0, 0));
eq(to({
  y: 2015,
  m: 11,
  d: 23,
  h: 1,
  i: 1
}), D(2015, 11, 23, 1, 1, 0));
eq(to({
  y: 2015,
  m: 11,
  d: 23,
  h: 1,
  i: 1,
  s: 1
}), D(2015, 11, 23, 1, 1, 1));
eq(to({
  y: 2015,
  m: 11,
  d: 23,
  h: 1,
  i: 1,
  s: 1,
  ms: 1
}), D(2015, 11, 23, 1, 1, 1, 1));
eq(to({
  year: 2015,
  month: 11,
  day: 23
}), D(2015, 11, 23, 0, 0, 0));
eq(to({}), D(y, m, d));
eq(to({
  hour: 10,
  min: 30,
  seconds: 40
}), D(y, m, d, 10, 30, 40));

},{"../../date-extra.js":1,"../../lib/config":5,"../../lib/utils/toDatetime":30,"assert":34}]},{},[220]);
