// Utility to transform raw NWS GridData into hour-by-hour arrays for Chart.js
export function extractHourlyDataForDay(gridData, targetDateString) {
  const hourlyData = {
    labels: [],
    wind: new Array(24).fill(null),
    precip: new Array(24).fill(null),
    temp: new Array(24).fill(null),
    wave: new Array(24).fill(null)
  };

  // Generate 24 hour labels (12 AM - 11 PM)
  for (let i = 0; i < 24; i++) {
    let ampm = i >= 12 ? 'PM' : 'AM';
    let dispHr = i % 12 || 12;
    hourlyData.labels.push(`${dispHr} ${ampm}`);
  }

  if (!gridData) return hourlyData;

  const processValues = (values, arrayRef, transform = (v) => v) => {
    if (!values) return;

    values.forEach(item => {
      const startDate = new Date(item.validTime.split('/')[0]);

      const durationMatch = item.validTime.match(/P(?:(\d+)D)?T(?:(\d+)H)?/);
      const daysDuration = durationMatch && durationMatch[1] ? parseInt(durationMatch[1], 10) : 0;
      const hoursDuration = durationMatch && durationMatch[2] ? parseInt(durationMatch[2], 10) : 0;
      const totalHours = (daysDuration * 24) + hoursDuration;

      if (totalHours > 0 && item.value !== null) {
        for (let i = 0; i < totalHours; i++) {
          const currentHour = new Date(startDate.getTime() + i * 3600 * 1000);

          // Use localized date string checking
          const y = currentHour.getFullYear();
          const m = String(currentHour.getMonth() + 1).padStart(2, '0');
          const d = String(currentHour.getDate()).padStart(2, '0');
          const currentStr = `${y}-${m}-${d}`;

          if (currentStr === targetDateString) {
            arrayRef[currentHour.getHours()] = transform(item.value);
          }
        }
      }
    });
  };

  // Temperature: Celsius to Fahrenheit
  processValues(gridData.temperature?.values, hourlyData.temp, (v) => Math.round(v * 9/5 + 32));

  // Wind Speed: km/h to mph
  processValues(gridData.windSpeed?.values, hourlyData.wind, (v) => Math.round(v * 0.621371));

  // Precipitation Probability: direct %
  processValues(gridData.probabilityOfPrecipitation?.values, hourlyData.precip, (v) => v);

  // Wave Height: meters to feet
  processValues(gridData.waveHeight?.values, hourlyData.wave, (v) => Number((v * 3.28084).toFixed(1)));

  return hourlyData;
}
