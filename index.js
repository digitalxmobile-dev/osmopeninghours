/**
 * ver. 0.2.0 15/07/2016.
 */

var opening_hours = require('opening_hours');

/**
 * Parsing OSM string usin opening_hours.js, and getting custom informations
 *
 * @param  {String} osmString
 * @param  {int} shippingTime
 * @param {String} locale
 * @return {Object} openingHoursBusiness
 */
exports.getBusinessOpeningHours = function (osmString, shippingTime, locale) {

    //Checking for correct input data
    if ((typeof osmString === 'string' || osmString instanceof String) && isInt(shippingTime) && (typeof locale === 'string' || locale instanceof String ) && locale.length <=2){

        var oh = new opening_hours(osmString);

        var openingHoursBusiness = {};

        //Getting business current status, open or close in this moment (not passing a Date to getState())
        var state = oh.getState(); // we use current date
        openingHoursBusiness.is_now_open = oh.getState(); //Set timer or preorder view

        /**
         * Getting when's the business next change, means when it closes or opens next time
         * */
        var nextchange = oh.getNextChange();

        var businessNextChange;

        if (typeof nextchange === 'undefined') {
            //businessNextChange = "mai";
            businessNextChange = 'Non ' + (state ? 'chiude' : 'apre') + " mai."
        } else {
            //businessNextChange = nextchange.getHours() + ":" + nextchange.getMinutes();
            var tomorrowDayString = "";
            var nowDate = new Date();
            if(nextchange.getDay() == nowDate.getDay()){
                //Business open or close same day
                if("it" === locale) {
                    tomorrowDayString = "oggi";
					//Adding shopping phrases for today
					if(!state) {
						openingHoursBusiness.orderReadyPhrase = 'dalle ' + nextchange.getHours() + ":" + nextchange.getMinutes();
					}
                }
            }else if(nextchange.getDay() > nowDate.getDay() && (nextchange.getDay() - nowDate.getDay() == 1)){
                //In this case means that next business open is "tomorrow"
                if("it" === locale){
                    tomorrowDayString = "domani";
					//Adding shopping phrases for tomorrow
					openingHoursBusiness.orderReadyPhrase = 'domani alle ' + nextchange.getHours() + ":" + nextchange.getMinutes();
                }
            }else {
                //Search wich day business opens, coz is not tomorrow
                tomorrowDayString = getCorrectDayName(nextchange.getDay(),locale);
				//Adding in a custom property of returning obj, with the next open day today and tomorrow is closed
				openingHoursBusiness.preorderDay = tomorrowDayString;
				//Adding shopping phrases for nextday
				if("it" === locale){
					openingHoursBusiness.orderReadyPhrase = tomorrowDayString + ' alle ' + nextchange.getHours() + ":" + nextchange.getMinutes();
				}
            }

            businessNextChange = (state ? 'chiude ' : 'apre ') + tomorrowDayString + ' alle ' + nextchange.getHours() + ":" + nextchange.getMinutes();
        }


        openingHoursBusiness.nextChange = businessNextChange;//Representing chiude/apre alle hh:mm
        //openingHoursBusiness.nextChangeHours = businessNextChangeHoursMinutes(nextchange); //Commented for now, future uses

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

        var todayIntervalsForOpen = oh.getOpenIntervals(todayFromDate, todayToDate);
        var tomorrowIntervalsForOpen = oh.getOpenIntervals(tomorrowFromDate, tomorrowToDate);

        //Setting if today and tomorrow businsess is open (not checking at current time but general day)
        today.is_open = (todayIntervalsForOpen && todayIntervalsForOpen.length > 0);
        tomorrow.is_open = (tomorrowIntervalsForOpen && tomorrowIntervalsForOpen.length > 0);

        /**
         * Checking if today and tomorrow is open or not, and setting respectively it's intervals of open/close per day.
         * */
        //If today is open, need to get today open/close intervals
        if(today.is_open) {
            var todayIntervals = getDayIntervals("today",oh,shippingTime);
            if (todayIntervals && todayIntervals.length > 0) {
                today.intervals = todayIntervals;
                today.intervalsString = getDayIntervalsString(todayIntervals);
            }else {
                today.is_open = false;
            }
        }

        //id tomorrow is open, we need to get today and tomorrow intervals
        if(tomorrow.is_open) {
            var tomorrowIntervals = getDayIntervals("tomorrow",oh,shippingTime);
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
			    if(nextchange){
					openingHoursBusiness.nextPreorder = getCorrectDayName((nextchange.getDay() == 0 ? 6 : nextchange.getDay() -1),"it");
				}else {
					if("it" === locale){
						openingHoursBusiness.nextPreorder = "mai";
					}
				}
            }
        }

        return openingHoursBusiness;

    }else {
        return null;
    }
};

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
 * Getting current given day open close intervals
 *
 * @param  {String} day
 * @param  {Object} oh
 * @param  {int} shippingTime
 * @return {Array} intervalsObjects
 */
function getDayIntervals(day, oh, shippingTime) {

    var from = new Date();
    var to = new Date();

    if("today" === day) {
        from.setHours(from.getHours(), formatNumber(from.getMinutes() + shippingTime), from.getSeconds());
        to.setHours(23, 59, 59);
    }else if("tomorrow" === day){
        from.setDate(from.getDate() + 1);
        from.setHours(0,0,0);
        to.setDate(to.getDate() + 1);
        to.setHours(23, 59, 59);
    }

    return buildDayIntervals(oh.getOpenIntervals(from, to),shippingTime);

}

/**
 *  Getting the list of intervals object, that have open and close params
 *
 * @param  {String} intervalList
 * @param  {int} shippingTime
 * @return {Array} buildedIntervalList
 */
function buildDayIntervals(intervalList,shippingTime) {

    var buildedIntervalList = [];

    if(intervalList && intervalList.length > 0) {
        for(var i=0; i<intervalList.length; i++) {
            var buildedInterval = {};
            var actual = intervalList[i];
            var openMinutes = formatNumber(actual[0].getMinutes());
            actual[1].setHours(actual[1].getHours(),(actual[1].getMinutes() - shippingTime),actual[1].getSeconds());
            var closeMinutes = actual[1].getMinutes();
            var openHours = actual[0].getHours();
            var closeHours = actual[1].getHours();
            buildedInterval.open = (openHours < 10 ? "0"+openHours : openHours) + ":" + (openMinutes < 10 ? "0"+openMinutes : openMinutes); //[i][0] -> Getting open
            buildedInterval.close = (closeHours < 10 ? "0"+closeHours : closeHours) + ":" + (closeMinutes < 10 ? "0"+closeMinutes : closeMinutes); //[i][1] -> Getting close
            buildedIntervalList.push(buildedInterval);
        }
    }

    return buildedIntervalList;
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
 * Getting time difference between 2 dates in format hh:mm
 *
 * @param  {Date} nextChange
 * @return {String} hh:mm
 */
function businessNextChangeHoursMinutes (nextChange) {

    var today = new Date();
    var diffMs = (nextChange - today);
    var diffDays = Math.round(diffMs / 86400000); // days
    var diffHrs = Math.round((diffMs % 86400000) / 3600000); // hours
    var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); // minutes

    return  diffHrs + ":" + diffMins;

    //if(diffHrs > 0) {
    //    return "in " + diffHrs + " ore e " + diffMins;
    //}else {
    //    return "in " + diffMins;
    //}
}

/**
 * Getting current day name given as param from Date().getDay()
 * @param  {integer} dayNum
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