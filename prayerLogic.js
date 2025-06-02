// prayerLogic.js
import {
    prayerTimesConfig,
    jumaaConfig,
    sunriseConfig,
    eidPrayerConfig,
} from './config.js';
import {
    parsePrayerTime,
    getAdhanEndTime,
    getIqamaEndTime,
} from './timeUtils.js';
import { initialDataLoaded, prayerTimesData } from './main.js';

/**
 * Erstellt eine Liste der für den aktuellen Tag und die aktuelle Zeit relevanten Gebetskonfigurationen.
 * Ersetzt Dhuhr durch Jumaa an Freitagen und Shuruk durch Eid, wenn konfiguriert.
 * @param {Date} now - Das aktuelle Datum und die aktuelle Uhrzeit (wird für Jumaa-Prüfung benötigt).
 * @param {object} currentPrayerTimes - Die aktuell geladenen Gebetszeiten.
 * @returns {Array<object>} Eine Liste von effektiven Gebetskonfigurationsobjekten.
 */
export function getEffectivePrayerConfigs(now, currentPrayerTimes) {
    if (!currentPrayerTimes) {
        console.warn("Logic: getEffectivePrayerConfigs - currentPrayerTimes nicht verfügbar");
        return [];
    }
    console.log("Logic: getEffectivePrayerConfigs aufgerufen.");
    console.log("Logic: eidPrayerConfig.showEidPrayer:", eidPrayerConfig.showEidPrayer);

    const effectiveConfigs = [];
    const isFriday = now.getDay() === 5;
    // todayDateString wird hier nicht mehr für die Eid-Entscheidung benötigt,
    // aber die Logik für Jumaa bleibt.

    // Hauptgebete
    prayerTimesConfig.forEach((config) => {
        if (
            isFriday &&
            config.name === 'Dhuhr' &&
            currentPrayerTimes.Jumaa
        ) {
            return;
        }
        if (currentPrayerTimes[config.name]) { // Nur hinzufügen, wenn Zeit vorhanden
            effectiveConfigs.push({
                ...config,
                time: currentPrayerTimes[config.name],
            });
        } else {
            console.warn(`Logic: Fehlende Zeit für ${config.name} in currentPrayerTimes`);
        }
    });

    // Jumaa
    if (isFriday && currentPrayerTimes.Jumaa) {
        effectiveConfigs.push({
            ...jumaaConfig,
            time: currentPrayerTimes.Jumaa,
        });
    }

    // Eid oder Shuruk
    if (eidPrayerConfig.showEidPrayer) {
        console.log("Logic: showEidPrayer ist true. Füge Eid-Konfiguration hinzu.");
        effectiveConfigs.push({
            ...sunriseConfig, // Basis für UI-Elemente
            name: eidPrayerConfig.name,
            displayName: eidPrayerConfig.displayName,
            time: eidPrayerConfig.timeOfEid, // Direkte Zeit von eidPrayerConfig
            adhanDurationMinutes: eidPrayerConfig.adhanDurationMinutes,
            iqamaDurationMinutes: eidPrayerConfig.iqamaDurationMinutes,
            isEidActive: true, // Flag, dass es sich um Eid handelt
            // Wichtig: Das Datum für parsePrayerTime in findPrayerToHighlight/findNextPrayer
            // muss das *tatsächliche* Datum sein, an dem Eid stattfindet (aus eidPrayerConfig.dayOfEid),
            // nicht unbedingt 'now', wenn Eid im Voraus angezeigt wird.
            // Wir fügen hier das Zieldatum für Eid hinzu, damit die Logikfunktionen es verwenden können.
            targetDateString: eidPrayerConfig.dayOfEid,
        });
    } else {
        console.log("Logic: showEidPrayer ist false. Füge Shuruk-Konfiguration hinzu (falls Zeit vorhanden).");
        if (currentPrayerTimes.Sunrise) {
            effectiveConfigs.push({
                ...sunriseConfig,
                time: currentPrayerTimes.Sunrise,
            });
        } else {
            // Fallback, falls Sunrise-Zeit fehlt, aber Config existiert
            console.warn("Logic: Keine Sunrise-Zeit in currentPrayerTimes, füge Shuruk mit '--:--' hinzu.");
            effectiveConfigs.push({ ...sunriseConfig, time: '--:--' });
        }
    }
    // Filtern ist hier nicht mehr nötig, da wir sicherstellen, dass Zeiten vorhanden sind oder Fallbacks existieren.
    return effectiveConfigs;
}

/**
 * Findet das Gebet, das aktuell hervorgehoben werden soll (inkl. Adhan- und Iqama-Zeit).
 * @param {Date} now - Die aktuelle Zeit.
 * @returns {object|null} Das Konfigurationsobjekt des hervorzuhebenden Gebets.
 */
export function findPrayerToHighlight(now) {
    if (!initialDataLoaded || !prayerTimesData) return null;

    const prayersWithTimes = [];
    const allEffectiveConfigs = getEffectivePrayerConfigs(now, prayerTimesData);
    console.log("Logic: findPrayerToHighlight - allEffectiveConfigs:", JSON.parse(JSON.stringify(allEffectiveConfigs)));


    const processPrayer = (config, prayerTimeStr, contextDate) => {
        let dateForParsing = contextDate;
        // Wenn es Eid ist und ein targetDateString hat, parse die Zeit für dieses spezifische Datum
        if (config.isEidActive && config.targetDateString) {
            const parts = config.targetDateString.split('-');
            if (parts.length === 3) {
                dateForParsing = new Date(
                    parseInt(parts[0]),
                    parseInt(parts[1]) - 1,
                    parseInt(parts[2])
                );
                if (isNaN(dateForParsing.getTime())) {
                    console.warn("Logic: Ungültiges targetDateString für Eid, verwende contextDate:", config.targetDateString);
                    dateForParsing = contextDate; // Fallback
                } else {
                     console.log("Logic: Parse Eid-Zeit für Zieldatum:", dateForParsing.toDateString(), "mit Zeit:", prayerTimeStr);
                }
            } else {
                 console.warn("Logic: Ungültiges Format für targetDateString, verwende contextDate:", config.targetDateString);
                 dateForParsing = contextDate; // Fallback
            }
        }


        const prayerDate = parsePrayerTime(prayerTimeStr, dateForParsing);
        if (prayerDate) {
            const adhanEndTime = getAdhanEndTime(config, prayerDate);
            const iqamaEndTimeValue = getIqamaEndTime(config, adhanEndTime);
            prayersWithTimes.push({
                ...config,
                date: prayerDate,
                adhanEndTime: adhanEndTime,
                iqamaEndTime: iqamaEndTimeValue,
            });
        } else {
            console.warn(`Logic: Konnte Gebetszeit nicht parsen für ${config.name} mit Zeit ${prayerTimeStr} und Datum ${dateForParsing.toDateString()}`);
        }
    };

    allEffectiveConfigs.forEach((effConfig) => {
        // effConfig.time sollte hier immer definiert sein durch getEffectivePrayerConfigs
        if (effConfig.time) {
            processPrayer(effConfig, effConfig.time, now);
        } else {
            console.warn("Logic: findPrayerToHighlight - effConfig ohne .time Feld:", effConfig.name);
        }
    });

    prayersWithTimes.sort((a, b) => a.date - b.date);
    console.log("Logic: findPrayerToHighlight - prayersWithTimes (sortiert):", JSON.parse(JSON.stringify(prayersWithTimes.map(p => ({name: p.name, date: p.date?.toISOString(), time: p.time})))));


    let prayerToHighlight = null;

    for (const prayer of prayersWithTimes) {
        // Ein Gebet ist "aktiv" für Hervorhebung, wenn 'now' zwischen seinem Start (prayer.date)
        // und dem Ende seiner Iqama-Zeit liegt.
        // Wichtig: Für Eid, das im Voraus angezeigt wird, ist prayer.date das Datum von eidPrayerConfig.dayOfEid.
        // 'now' muss also an diesem Tag sein, damit es aktiv wird.
        if (now >= prayer.date && now < prayer.iqamaEndTime) {
            prayerToHighlight = {
                ...prayer,
                isAdhanTime: now >= prayer.date && now < prayer.adhanEndTime,
            };
            console.log("Logic: Aktives Gebet zum Hervorheben gefunden:", prayerToHighlight.name, "Adhan:", prayerToHighlight.isAdhanTime);
            return prayerToHighlight;
        }
    }

    // Wenn kein Gebet aktiv ist, finde das nächste anstehende Gebet
    let nextUpcomingPrayer = null;
    for (const prayer of prayersWithTimes) {
        if (prayer.date > now) {
            nextUpcomingPrayer = prayer;
            break;
        }
    }

    if (nextUpcomingPrayer) {
        prayerToHighlight = {
            ...nextUpcomingPrayer,
            isAdhanTime: false,
        };
        console.log("Logic: Nächstes anstehendes Gebet (nicht aktiv):", prayerToHighlight.name);
    } else if (prayersWithTimes.length > 0) {
        // Alle Gebete für heute/Eid-Tag sind vorbei. Nimm das erste Gebet des nächsten Zyklus.
        console.log("Logic: Alle Gebete für heute/Eid-Tag vorbei. Suche Fajr von morgen.");
        const fajrConfig = prayerTimesConfig.find(p => p.name === 'Fajr');
        if (fajrConfig && prayerTimesData[fajrConfig.name]) {
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            const fajrTimeTomorrow = prayerTimesData[fajrConfig.name];
            const fajrDateTomorrow = parsePrayerTime(fajrTimeTomorrow, tomorrow);

            if (fajrDateTomorrow) {
                const adhanEndTomorrow = getAdhanEndTime(fajrConfig, fajrDateTomorrow);
                const iqamaEndTomorrow = getIqamaEndTime(fajrConfig, adhanEndTomorrow);
                prayerToHighlight = {
                    ...fajrConfig,
                    date: fajrDateTomorrow,
                    adhanEndTime: adhanEndTomorrow,
                    iqamaEndTime: iqamaEndTomorrow,
                    isAdhanTime: false,
                    time: fajrTimeTomorrow,
                };
                console.log("Logic: Fallback auf Fajr von morgen:", prayerToHighlight.name);
            }
        }
    }
    if (!prayerToHighlight) {
        console.warn("Logic: Konnte kein Gebet zum Hervorheben finden.");
    }
    return prayerToHighlight;
}


/**
 * Findet das Gebet, dessen Name als "nächstes Gebet" angezeigt werden soll.
 * Berücksichtigt Adhan- und Iqama-Phasen.
 * @param {Date} now - Die aktuelle Zeit.
 * @returns {object|null} Das Konfigurationsobjekt des nächsten Gebets oder null.
 */
export function findNextPrayer(now) {
    if (!initialDataLoaded || !prayerTimesData) return null;

    const prayersToCheck = [];
    const allEffectiveConfigs = getEffectivePrayerConfigs(now, prayerTimesData);
    console.log("Logic: findNextPrayer - allEffectiveConfigs:", JSON.parse(JSON.stringify(allEffectiveConfigs)));


    const processPrayerForNext = (config, prayerTimeStr, contextDate) => {
        let dateForParsing = contextDate;
        if (config.isEidActive && config.targetDateString) {
            const parts = config.targetDateString.split('-');
            if (parts.length === 3) {
                dateForParsing = new Date(
                    parseInt(parts[0]),
                    parseInt(parts[1]) - 1,
                    parseInt(parts[2])
                );
                 if (isNaN(dateForParsing.getTime())) dateForParsing = contextDate;
            } else {
                dateForParsing = contextDate;
            }
        }

        const prayerDate = parsePrayerTime(prayerTimeStr, dateForParsing);
        if (prayerDate) {
            const adhanEndTime = getAdhanEndTime(config, prayerDate);
            const iqamaEndTimeValue = getIqamaEndTime(config, adhanEndTime);
            prayersToCheck.push({
                ...config,
                date: prayerDate,
                adhanEndTime: adhanEndTime,
                iqamaEndTime: iqamaEndTimeValue,
            });
        }
    };

    allEffectiveConfigs.forEach((effConfig) => {
        if (effConfig.time) {
            processPrayerForNext(effConfig, effConfig.time, now);
        }
    });

    prayersToCheck.sort((a, b) => a.date - b.date);
    console.log("Logic: findNextPrayer - prayersToCheck (sortiert):", JSON.parse(JSON.stringify(prayersToCheck.map(p => ({name: p.name, date: p.date?.toISOString(), time: p.time})))));


    for (const prayer of prayersToCheck) {
        if (now >= prayer.date && now < prayer.iqamaEndTime) {
            console.log("Logic: Aktives Gebet für 'Nächstes Gebet'-Text gefunden:", prayer.name);
            return { ...prayer };
        }
    }

    let chronologicallyNextPrayer = null;
    for (const prayer of prayersToCheck) {
        if (prayer.date && prayer.date > now) {
            chronologicallyNextPrayer = prayer;
            break;
        }
    }

    if (chronologicallyNextPrayer) {
        console.log("Logic: Chronologisch nächstes Gebet für Text:", chronologicallyNextPrayer.name);
    } else if (prayersToCheck.length > 0) {
        console.log("Logic: Kein nächstes Gebet für heute/Eid-Tag, nehme Fajr von morgen für Text.");
        const fajrConfig = prayerTimesConfig.find(p => p.name === 'Fajr');
        if (fajrConfig && prayerTimesData[fajrConfig.name]) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const fajrTimeTomorrow = prayerTimesData[fajrConfig.name];
            const fajrDateTomorrow = parsePrayerTime(fajrTimeTomorrow, tomorrow);
            if (fajrDateTomorrow) {
                chronologicallyNextPrayer = {
                    ...fajrConfig,
                    date: fajrDateTomorrow,
                    time: fajrTimeTomorrow,
                };
                console.log("Logic: Fallback auf Fajr von morgen für Text:", chronologicallyNextPrayer.name);
            }
        }
    }
     if (!chronologicallyNextPrayer) {
        console.warn("Logic: Konnte kein nächstes Gebet für Text finden.");
    }
    return chronologicallyNextPrayer;
}
