'use strict';

// ===============================================
// Time shifting - blame JTRUK if this goes wrong!
// In HTML, use the format:
// <span class="jtzr-time">08:00</span>

const jtzrInit = (() => {
    // This gets set by init...
    let PARTY_TIMEZONE_UTC = null;

    // getLocalTimezoneUTC takes a guess at our local UTC offset, provided by the browser (or OS?)
    const getLocalTimezoneUTC = () => {
        return -new Date().getTimezoneOffset() / 60;
    }

    // getTimezoneLegend converts our offset into "UTC+/-X"
    const getTimezoneLegend = (offset) => {
        return "UTC" + (offset < 0 ? offset : "+" + offset);
    }

    // getDayString gets the day of the week (0-6) as a string
    const getDayString = (d) => {
        const dayStringsEN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        return dayStringsEN[(7+d)%7];
    }

    // setTimezone takes an offset and a legend, and updates all .jtzr-time elements to reflect the new timezone
    const setTimezone = (utcOffset) => {
        const hourOffset = utcOffset - PARTY_TIMEZONE_UTC;
        const legend = hourOffset ? getTimezoneLegend(utcOffset) : '';
        document.querySelectorAll(".jtzr-time").forEach((el) => {
            const datetime = el.getAttribute("data-jtzr-datetime");
            if (!datetime) {
                return;
            }

            const match = datetime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
            if (!match) {
                return;
            }

            const localMinutes = (Number(match[4]) + hourOffset) * 60 + Number(match[5]);
            const localMinutesWrapped = (1440 + localMinutes) % 1440;
            const localMinute = localMinutesWrapped % 60;
            const localHour = (localMinutesWrapped - localMinute) / 60;

            const partyDateTime = new Date(Date.UTC(match[1], match[2] - 1, match[3], 0, 0, 0));

            let day = '';
            if(localMinutes < 0) {
                day = `(on ${getDayString(partyDateTime.getDay() - 1)})`;
            } else if(localMinutes >= 1440) {
                day = `(on ${getDayString(partyDateTime.getDay() + 1)})`;
            }

            el.textContent = `${localHour.toString().padStart(2, '0')}:${localMinute.toString().padStart(2, '0')} ${legend} ${day}`;
        });
    }


    // timezoneSelectUpdated is a handler for when the <select> element changes
    document.jtzrSelectUpdated = () => {
        setTimezone(parseFloat(document.getElementById("jtzr-timezone-select").value));
    }


    // makeTimezoneUI creates a <select> element and populates it with all the timezones
    const makeTimezoneUI = () => {
        const elTimezoneUI = document.getElementById("jtzr-ui");
        if (!elTimezoneUI) {
            console.warn("No timezone-ui element found, cannot create UI");
            return;
        }

        let html = '';
        html += `<option value="${PARTY_TIMEZONE_UTC}">Party Timezone: ${getTimezoneLegend(PARTY_TIMEZONE_UTC)}</option>`;

        let localOffset = getLocalTimezoneUTC();
        html += `<option value="${localOffset}">Your System Timezone: ${getTimezoneLegend(localOffset)}</option>`;
        html += "<option disabled role=separator>---------</a>";

        const offsets = [-12,-11,-10,-9.5,-9,-8,-7,-6,-5,-4,-3.5,-3,-2,-1,0,1,2,3,3.5,4,4.5,5,5.5,5.75,6,6.5,7,8.75,9,9.5,10,10.5,11,12,12.75,13,14]
        offsets.forEach((offset) => {
            html += `<option value="${offset}">${getTimezoneLegend(offset)}</option>`;
        })

        html = `Timezone: <select id="jtzr-timezone-select" onchange="jtzrSelectUpdated();">${html}</select>`;
        elTimezoneUI.innerHTML = html;
    }


    // Send dates up the tree - populate the parents of each element above our date markers...
    const datesPopulateUpwards = () => {
        document.querySelectorAll(".jtzr-date").forEach((el) => {
            const date = el.getAttribute("data-date");
            if (!date) {
                console.warn(".jtzr-date element should have [data-date] set");
                return;
            }

            // Regex for sanity, but we won't bother checking the date is valid
            if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                console.warn(".jtzr-date [data-date] attribute should be in the format 'YYYY-MM-DD'");
                return;
            }

            let elParent = el;
            while(elParent = elParent.parentNode) {
                if(elParent.setAttribute) { // Set an attribute on this element if we are permitted...
                    elParent.setAttribute("data-jtzr-temp-date", date);
                }
            }
        });
    }


    const timesGrabDates = () => {  
        const dateFindInSelfOrPrevSibling = (el) => {
            do {
                const date = el.getAttribute("data-jtzr-temp-date");
                if(date) {
                    return date;
                }    
            } while(el = el.previousElementSibling)
            return null;    // Not found
        }

        const dateFind = (el) => {
            do {
                const date = dateFindInSelfOrPrevSibling(el);
                if(date) {
                    return date;
                }
            } while(el = el.parentNode)
        
            return null;
        }
        
        document.querySelectorAll(".jtzr-time").forEach((el) => {
            const time = el.textContent;
            const matches = time.match(/(\d{1,2})[\.:](\d{2})/);
            if (!matches) {
                console.warn(`jtzr-time does not match a time format [${time}]`)
                return;
            }

            const date = dateFind(el);
            if(!date) {
                console.warn("Could not find date for time");
                return;
            }

            el.setAttribute("data-jtzr-datetime", `${date}T${time}:00`);
        });
    }


    const datesClear = () => {
        document.querySelectorAll("[data-jtzr-temp-date]").forEach((el) => {
            el.removeAttribute("data-jtzr-temp-date");
        });
    }


    return (config = {}) => {
        PARTY_TIMEZONE_UTC = config.utc ?? 0;

        datesPopulateUpwards();
        timesGrabDates();
        datesClear();

        makeTimezoneUI();
    }
})();