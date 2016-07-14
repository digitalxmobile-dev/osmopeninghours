# OSM Opening Hours custom parser
OSM opening hours custom parser
#Usage
`var openinghours = require(..);`

Only availlable getBusinessOpeningHours, call it passing the current OSM Opening hours string you want to handle, the current business handling time and the locale.

Second param is used to subtract that value to the close timing and to add it to the open timing.

Eg. 8:30-12:30 will be 8:(30+businessHandlingTime)-12:(30-businessHandlingTime)

 `var responseObj = openinghours.getBusinessOpeningHours('Mo-Fr 8:30-12:30, 13:30-15:30, 16:00-18:00', 10, 'it');  `

Resposne Obj: https://github.com/digitalxmobile-dev/osmopeninghours/blob/master/example/example.json

Intervals array inside "today" and "tomorrow" objects could not be availlable if the user checks it when business is closed.

If tomorrow._is_open = true, intervals are always present, it length depends on the amount of rules the OSM starting string has.

Intervals are based on actual hour, so in the morning before business opens it contains all the open-close intervals... 
