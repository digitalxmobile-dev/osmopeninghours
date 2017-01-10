/**
 * ver. 2.0.0 9/01/2017.
 */


var opening_hours = require('opening_hours');
var moment = require('moment');
var moment_timezone = require('moment-timezone');
var TAG = "OpeningHoursParser";

/**
 * Parsing OSM string using opening_hours.js, and getting custom informations
 *
 * @param  {String} osmString
 * @param  {int} shippingTime
 * @param {String} locale
 * @param {Boolean} forceTodayClose
 * @return {Object} openingHoursBusiness
 */

exports.getBusinessOpeningHours = function (osmString, shippingTime, locale, forceTodayClose) {

  console.log('---- OSM parser ---- ', osmString, shippingTime, locale, forceTodayClose);

  //Checking for correct input data
  if ((typeof osmString === 'string' || osmString instanceof String) && isInt(shippingTime) &&
    (typeof locale === 'string' || locale instanceof String ) && locale.length <=2){

    //Check if we are able to parse the string coming from input
    try {
      var oh = new opening_hours(osmString);
    }catch (e){
      return null;
    }

    //Inistalizing the return object
    var openingHoursBusiness = {};

    //TODO: This must be passed as "locale" to this function
    var actualDate = moment_timezone.tz('Europe/Rome');

    //Building actualDate as Javascript Object
    var actualJSDate = new Date(actualDate.year(), actualDate.month(), actualDate.date(), actualDate.hours(), actualDate.minutes());

    //Setting actual status to returning Object
    openingHoursBusiness.is_now_open = oh.getState(actualJSDate);

    //Adding shippingtime to actual date
    actualJSDate = addMinutes(actualJSDate, shippingTime);

    //Getting business current status, open or close in the actualDate + shippingTime
    var state = oh.getState(actualJSDate);

    /**
     * Getting when's the business next change, means when it closes or opens next time
     * Added try catch for exceptions
     *
     * */
    try {
      //if now is 9:16 and it closes at 9:30 next change will be 9:30 so is WRONG, we must pass here the new offsetDate
      var nextChange = oh.getNextChange(actualJSDate);
      var nextChangeMoment = moment(nextChange);

      setBusinessReadyPhraseAndPreorderDay(locale, nextChangeMoment, shippingTime, openingHoursBusiness, state);

    }catch (e) {
      console.log(TAG + " - " + e);
      return null;
    }

    /**
     * Getting today and tomorrow custom objects
     * */
    var today = {};
    var tomorrow = {};

    today.is_open = false;
    tomorrow.is_open = false;

    //Getting today and domorrow date format using hours and minutes
    var todayFromDate = new Date();
    var todayToDate = new Date();
    todayFromDate.setHours(0,0,0);
    todayToDate.setHours(23,59,59);

    var tomorrowFromDate = new Date();
    tomorrowFromDate.setDate(todayFromDate.getDate() + 1);
    tomorrowFromDate.setHours(0,0,0);
    var tomorrowToDate = new Date();
    tomorrowToDate.setDate(todayToDate.getDate() + 1);
    tomorrowToDate.setHours(23,59,59);

    var todayIntervalsForOpen = oh.getOpenIntervals(actualJSDate, todayToDate);
    var tomorrowIntervalsForOpen = oh.getOpenIntervals(tomorrowFromDate, tomorrowToDate);

    //Forcing today close
    if(forceTodayClose) {
      today.is_open = false;
    }else {
      today.is_open = (todayIntervalsForOpen && todayIntervalsForOpen.length > 0);
    }

    tomorrow.is_open = (tomorrowIntervalsForOpen && tomorrowIntervalsForOpen.length > 0);

    /**
     * Checking if today and tomorrow is open or not, and setting respectively it's intervals of open/close per day.
     * */
    //If today is open, need to get today open/close intervals
    if(today.is_open) {
      var todayIntervals = getDayIntervals("today",oh, shippingTime, state);
      if (todayIntervals && todayIntervals.length > 0) {
        today.intervals = todayIntervals;
        today.intervalsString = getDayIntervalsString(todayIntervals);
      }else {
        today.is_open = false;
      }
    }

    //id tomorrow is open, we need to get today and tomorrow intervals
    if(tomorrow.is_open) {
      var tomorrowIntervals = getDayIntervals("tomorrow",oh, shippingTime, state);
      if (tomorrowIntervals && tomorrowIntervals.length > 0) {
        tomorrow.intervals = tomorrowIntervals;
        tomorrow.intervalsString = getDayIntervalsString(tomorrowIntervals);
      }else {
        tomorrow.is_open = false;
      }
    }

    openingHoursBusiness.today = today;
    openingHoursBusiness.tomorrow = tomorrow;

    //Added telling user when he will be able to preorder
    if(!today.is_open && !tomorrow.is_open) {
      if("it" === locale) {
        if(nextChange){
          openingHoursBusiness.nextPreorder = getCorrectDayName((nextChange.getDay() == 0 ? 6 : nextChange.getDay() -1),"it");
        }else {
          if("it" === locale){
            openingHoursBusiness.nextPreorder = "mai";
          }
        }
      }
    }

    //Adding a check for remove same interval
    if(openingHoursBusiness.today && openingHoursBusiness.today.intervals && openingHoursBusiness.today.intervals.length > 0){
      for (var i=0; i<openingHoursBusiness.today.intervals.length; i++) {
        var actualIntervalToday = openingHoursBusiness.today.intervals[i];
        if(actualIntervalToday.open === actualIntervalToday.close){
          openingHoursBusiness.today.intervals.splice(i,1);
        }
      }
      if(openingHoursBusiness.today.intervals.length === 0){
        openingHoursBusiness.today.is_open = false;
      }
    }

    if(openingHoursBusiness.tomorrow && openingHoursBusiness.tomorrow.intervals && openingHoursBusiness.tomorrow.intervals.length > 0){
      for (var j=0; j<openingHoursBusiness.tomorrow.intervals.length; j++) {
        var actualIntervalTomorrow = openingHoursBusiness.tomorrow.intervals[j];
        if(actualIntervalTomorrow.open === actualIntervalTomorrow.close){
          openingHoursBusiness.tomorrow.intervals.splice(j,1);
        }
      }
      if(openingHoursBusiness.tomorrow.intervals.length === 0){
        openingHoursBusiness.tomorrow.is_open = false;
      }
    }

    return openingHoursBusiness;

  }else {
    //EXCEPTIONS!
    return null;
  }
};

/**
 * Setting up strings for preorder or order with hours etc
 * */
function setBusinessReadyPhraseAndPreorderDay (locale, nextChangeMoment, shippingTime, openingHoursBusiness, isOpen) {

  var nextChangeMomentClone = moment(nextChangeMoment);

  if (!isOpen) {
    //if is close --> get next available window to perform a order
    var todayDay = moment().format('D');
    var nextChangeDay = nextChangeMoment.format('D');
    var diff = nextChangeDay - todayDay;
    var nextPreorderDayString = getNextPreorderDayString(locale, diff, nextChangeMomentClone.day());
    openingHoursBusiness.preorderDay = nextPreorderDayString;
    openingHoursBusiness.orderReadyPhrase = nextPreorderDayString + ' dalle ' + nextChangeMomentClone.add(shippingTime, 'm').format("HH:mm", locale);
    //next open-close
    openingHoursBusiness.nextChange = (isOpen ? 'chiude' : 'apre') + ' ' + nextPreorderDayString  + ' alle ' + nextChangeMoment.format("HH:mm", locale);
  }
  else {
    openingHoursBusiness.preorderDay = "-";
    openingHoursBusiness.orderReadyPhrase = "-";
    //next open-close
    openingHoursBusiness.nextChange = (isOpen ? 'chiude' : 'apre') + ' alle ' + nextChangeMoment.format("HH:mm", locale);
  }
}

/**
 * Returning today or tomorrow based on the diff (difference between 2 dates in days) param, null if is other day
 *
 * @param  {String} locale
 * @param  {int} diff
 * @return {String} today, tomorrow or null
 */
function getNextPreorderDayString (locale, diff, day) {
  if(diff === 0){
    //Is today
    if(locale == 'it'){
      return "oggi";
    }
  }else if(diff === 1){
    //Is tomorrow
    if(locale == 'it'){
      return "domani";
    }
  }else {
    //Is other day
    return getCorrectDayName(day,locale);
  }
}

/**
 * Getting current day name given as param from Date().getDay()
 * @param  {int} dayNum
 * @param  {String} locale
 * @return {String} dayName
 */
function getCorrectDayName(dayNum, locale){
  if("it" === locale){
    var weekday = new Array(7);

    weekday[0]=  "Domenica";
    weekday[1] = "Lunedì";
    weekday[2] = "Martedì";
    weekday[3] = "Mercoledì";
    weekday[4] = "Giovedì";
    weekday[5] = "Venerdì";
    weekday[6] = "Sabato";

    return weekday[dayNum]
  }
}

//Add minutes helper function
function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes*60000);
}

/**
 * Checking if given param is a int type var
 *
 * @param  n
 * @return {boolean}
 */
function isInt(n) {
  return n % 1 === 0;
}

/**
 * Getting current given day open close intervals
 *
 * @param  {String} day
 * @param  {Object} oh
 * @param  {int} shippingTime
 * @return {Array} intervalsObjects
 */
function getDayIntervals(day, oh, shippingTime, state) {

  var offsetDate = moment_timezone.tz('Europe/Rome');
  //The 2 dates below was based on server local time...
  //Fixme was addMinutes (, shippingtime);
  var from = new Date(offsetDate.year(), offsetDate.month(), offsetDate.date(), offsetDate.hours(), offsetDate.minutes());

  if(day === 'today'){
    from = addMinutes(from, shippingTime);
  }

  var to = new Date(from);

  if("today" === day) {
    from.setHours(from.getHours(), from.getMinutes(), from.getSeconds());
    to.setHours(23, 59, 59);
  }else if("tomorrow" === day){
    from.setDate(from.getDate() + 1);
    from.setHours(0,0,0);
    to.setDate(to.getDate() + 1);
    to.setHours(23, 59, 59);
  }

  return buildDayIntervals(oh.getOpenIntervals(from, to), shippingTime, state, day);

}

/**
 *  Getting the list of intervals object, that have open and close params
 *
 * @param  {String} intervalList
 * @param  {int} shippingTime
 * @return {Array} buildedIntervalList
 */
function buildDayIntervals(intervalList, shippingTime, state, day) {

  var buildedIntervalList = [];

  if(intervalList && intervalList.length > 0) {
    for(var i=0; i<intervalList.length; i++) {
      var buildedInterval = {};
      var actual = intervalList[i];
      //Adding shippingTime only if im able to Order now, means im current range of hours that the business is open
      var firstDate = actual [0];
      var secondDate = actual [1];
      var actualDate = new Date();
      if(actualDate > firstDate && actualDate < secondDate){
        //Add
        actual[0].setHours(actual[0].getHours(), day === 'today' && i == 0 ? (actual[0].getMinutes() + shippingTime) : (actual[0].getMinutes()),actual[0].getSeconds());
      }else {
        //Ignore
        actual[0].setHours(actual[0].getHours(),(actual[0].getMinutes()),actual[0].getSeconds());
      }
      /*if(state){
        actual[0].setHours(actual[0].getHours(), day === 'today' && i == 0 ? (actual[0].getMinutes() + shippingTime) : (actual[0].getMinutes()),actual[0].getSeconds());
      }else {
        actual[0].setHours(actual[0].getHours(),(actual[0].getMinutes()),actual[0].getSeconds());
      }*/
      var openMinutes = formatNumber(actual[0].getMinutes());
      //actual[1].setHours(actual[1].getHours(),(actual[1].getMinutes() - shippingTime),actual[1].getSeconds());
      actual[1].setHours(actual[1].getHours(),(actual[1].getMinutes()),actual[1].getSeconds());
      var closeMinutes = actual[1].getMinutes();
      var openHours = actual[0].getHours();
      var closeHours = actual[1].getHours();
      //check for minutes edges
      if (openMinutes == 60) {
        openMinutes = 0;
        openHours++;
        if (openHours == 25)
          openHours = 1;
      }

      buildedInterval.open = (openHours < 10 ? "0"+openHours : openHours) + ":" + (openMinutes < 10 ? "0"+openMinutes : openMinutes); //[i][0] -> Getting open
      buildedInterval.close = (closeHours < 10 ? "0"+closeHours : closeHours) + ":" + (closeMinutes < 10 ? "0"+closeMinutes : closeMinutes); //[i][1] -> Getting close
      //Checking if open is > close
      var checkOpen = moment(buildedInterval.open,"HH:mm");
      var checkClose = moment(buildedInterval.close,"HH:mm");
      if(checkOpen > checkClose){
        buildedInterval.open = buildedInterval.close;
      }

      buildedIntervalList.push(buildedInterval);
    }
  }

  return buildedIntervalList;
}

/**
 *  Getting array of day intervals as a string eg. hh:mm - hh:mm
 *
 * @param  {String} dayIntervals
 * @return {Array} dayIntervalString
 */
function getDayIntervalsString (dayIntervals) {
  if(dayIntervals){
    var dayIntervalString = [];
    for(var i=0; i<dayIntervals.length; i++){
      var singleInterval = {};
      var actualInterval = dayIntervals[i];
      singleInterval = actualInterval.open + " - " + actualInterval.close;
      dayIntervalString.push(singleInterval);
    }
    return dayIntervalString;
  }else {
    return null;
  }
}

/**
 * Formatting minutes of time 10-20-30-40 etc
 *
 * @param  {int} number
 * @return correctNumber
 */
function formatNumber (number) {
  var correctNumber;
  if(number > 0){
    var resto = number%10;
    if(resto >= 5){
      correctNumber = number + (10 - resto);
    }else {
      correctNumber = number - resto;
    }
  }else {
    correctNumber = 0;
  }
  return correctNumber;
}