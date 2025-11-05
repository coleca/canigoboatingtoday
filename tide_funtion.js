
async function getTideData(lat, lon) {
    try {
        // Using a CORS proxy to bypass browser restrictions on direct API calls.
        const stationsApiUrl = 'https://api.tidesandcurrents.noaa.gov/mdapi/v1/webapi/stations.json?type=tidepredictions&units=english';
        const stationsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(stationsApiUrl)}`;

        const stationsResponse = await fetch(stationsUrl);
        if (!stationsResponse.ok) throw new Error(`Failed to fetch stations: ${stationsResponse.statusText}`);

        const stationsJson = await stationsResponse.json();
        if (!stationsJson.contents) throw new Error('Proxy response for stations is missing "contents" field.');

        let stationsData;
        try {
            stationsData = JSON.parse(stationsJson.contents);
        } catch (e) {
            console.error("Failed to parse station data JSON from proxy.", stationsJson.contents);
            throw new Error("Invalid station data from proxy: not valid JSON.");
        }

        // Haversine formula to calculate the great-circle distance between two points
        const haversineDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // Radius of the Earth in kilometers
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; // Distance in kilometers
        };

        let nearestStation = null;
        let minDistance = Infinity;

        if (stationsData && stationsData.stations && stationsData.stations.length > 0) {
            stationsData.stations.forEach(station => {
                const distance = haversineDistance(lat, lon, station.lat, station.lng);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestStation = station;
                }
            });
        }

        if (!nearestStation) return null;

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const formatDate = (date) => `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;

        const tideApiUrl = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${formatDate(today)}&end_date=${formatDate(tomorrow)}&station=${nearestStation.id}&product=predictions&datum=MLLW&time_zone=lst_ldt&interval=h&units=english&format=json`;
        const tideDataUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(tideApiUrl)}`;

        const tideResponse = await fetch(tideDataUrl);
        if (!tideResponse.ok) throw new Error(`Failed to fetch tide data: ${tideResponse.statusText}`);

        const tideJson = await tideResponse.json();
        if (!tideJson.contents) throw new Error('Proxy response for tide data is missing "contents" field.');

        let tideData;
        try {
            tideData = JSON.parse(tideJson.contents);
        } catch (e) {
            console.error("Failed to parse tide data JSON from proxy.", tideJson.contents);
            throw new Error("Invalid tide data from proxy: not valid JSON.");
        }

        if (tideData.error) {
            console.warn(`Tide API returned an error: ${tideData.error.message}`);
            return null;
        }

        return tideData.predictions || null;
    } catch (error) {
        console.error('Error fetching or parsing tide data:', error);
        return null;
    }
}
