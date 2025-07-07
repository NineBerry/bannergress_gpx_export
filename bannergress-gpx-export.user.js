// ==UserScript==
// @name         Bannergress GPX Export
// @namespace    https://github.com/NineBerry/bannergress_gpx_export
// @version      2025-07-07
// @description  Export banners to GPX format from Bannergress
// @author       Christian NineBerry Schwarz
// @match        https://bannergress.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bannergress.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const buttonId = 'extExportGPXButton';
    const bannerDetailUrlPrefix = 'https://bannergress.com/banner/';
    const apiUrlPrefix = 'https://api.bannergress.com/bnrs/';

    function addButton() {
        if (window.location.href.startsWith(bannerDetailUrlPrefix)) {

            const zoomControlElement = document.querySelector('.leaflet-control-zoom');
            const existingButton = document.getElementById(buttonId);

            if(zoomControlElement && !existingButton)
            {
                const newDiv = document.createElement('div');
                newDiv.id = buttonId;
                newDiv.className = 'leaflet-bar leaflet-control'
                newDiv.addEventListener('click', exportGPX);
                zoomControlElement.insertAdjacentElement('afterend', newDiv);

                const newA = document.createElement('a');
                newA.className = 'leaflet-bar-part leaflet-bar-part-single';
                newA.textContent = 'GPX';
                newA.title = 'Export as GPX';
                newDiv.appendChild(newA);
            }
        }
    }

    async function exportGPX() {

        const pageUrl = window.location.href;
        const apiUrl = pageUrl.replace(bannerDetailUrlPrefix, apiUrlPrefix);

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const parser = new DOMParser();
        const doc = parser.parseFromString('<?xml version="1.0" encoding="UTF-8"?><gpx></gpx>', 'application/xml');
        const gpxElement = doc.documentElement;

        gpxElement.setAttribute('version', '1.1');
        gpxElement.setAttribute('xmlns', 'http://www.topografix.com/GPX/1/1');
        gpxElement.setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        gpxElement.setAttribute('xsi:schemaLocation', 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd');
        gpxElement.setAttribute('creator', 'Bannergress to GPX Export');

        const metadataElement = doc.createElement('metadata');
        const nameElement = doc.createElement('name');
        nameElement.textContent = data.title + " from Bannergress";
        metadataElement.appendChild(nameElement);
        gpxElement.appendChild(metadataElement);

        const rteElement = doc.createElement('rte');
        gpxElement.appendChild(rteElement);

        const routeNameElement = doc.createElement('name');
        routeNameElement.textContent = data.title + " from Bannergress";
        rteElement.appendChild(routeNameElement);

        const sortedMissionKeys = [...Object.keys(data.missions)].sort((a, b) => {return Number(a) - Number(b);});
        for(const missionKey of sortedMissionKeys){

            const mission = data.missions[missionKey];
            const sortedStepKeys = [...Object.keys(mission.steps)].sort((a, b) => {return Number(a) - Number(b);});

            for(const stepKey of sortedStepKeys){
                const step = mission.steps[stepKey];

                if(step.poi.type === 'unavailable') continue;

                const wptElement = doc.createElement('rtept');
                wptElement.setAttribute('lat', step.poi.latitude);
                wptElement.setAttribute('lon', step.poi.longitude);

                const wptNameElement = doc.createElement('name');
                wptNameElement.textContent = step.poi.title;
                wptElement.appendChild(wptNameElement);

                const wptDescElement = doc.createElement('desc');
                wptDescElement.textContent = step.poi.title;
                wptElement.appendChild(wptDescElement);

                rteElement.appendChild(wptElement);
            }
        }


        const serializer = new XMLSerializer();
        const gpxOutput = serializer.serializeToString(doc);
        const blob = new Blob([gpxOutput], { type: 'application/gpx+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Route_' + cleanStringUnicode(data.title) + '.gpx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }


    function cleanStringUnicode(str) {
        let cleaned = str.replace(/[^\p{L}\p{N}]+/gu, '_');
        cleaned = cleaned.replace(/^_+|_+$|^$/g, '');

        return cleaned;
    }

    const observer = new MutationObserver((mutationsList, observer) => {
        if (document.body) {
            addButton();
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Fallback if MutationObserver doesn't trigger immediately (e.g., for very fast loads)
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        addButton();
    } else {
        window.addEventListener('DOMContentLoaded', addButton);
    }
})();
