const https = require('https');
const fs = require('fs');
const path = require('path');

const targetUrl = 'https://raw.githubusercontent.com/algolia/datasets/master/airports/airports.json';
const outputPath = path.join(__dirname, '..', 'client', 'src', 'assets', 'airports.json');

// Ensure assets directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

console.log(`Fetching global airports dataset from: ${targetUrl}...`);

https.get(targetUrl, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Request failed with status code: ${res.statusCode}`);
    process.exit(1);
  }

  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try {
      const originalAirports = JSON.parse(rawData);
      console.log(`Successfully downloaded ${originalAirports.length} raw airport records.`);

      // Convert to our format, filter records without IATA code
      const formattedAirports = originalAirports
        .filter(ap => ap.iata_code && ap.iata_code.trim().length === 3)
        .map(ap => {
          // Map timezone or guess it
          const tz = ap.tz || 'UTC';
          
          return {
            code: ap.iata_code.toUpperCase(),
            city: ap.city || ap.name,
            airport: ap.name,
            country: ap.country,
            timezone: tz,
            terminal: '1' // Default terminal
          };
        });

      // Remove duplicates by IATA code
      const uniqueAirports = [];
      const seenCodes = new Set();
      for (const ap of formattedAirports) {
        if (!seenCodes.has(ap.code)) {
          seenCodes.add(ap.code);
          uniqueAirports.push(ap);
        }
      }

      // Sort by city name
      uniqueAirports.sort((a, b) => a.city.localeCompare(b.city));

      fs.writeFileSync(outputPath, JSON.stringify(uniqueAirports, null, 2));
      console.log(`Saved ${uniqueAirports.length} unique formatted global airports to: ${outputPath}`);
      process.exit(0);
    } catch (e) {
      console.error('Error parsing or writing dataset:', e.message);
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.error('Network request failed:', e.message);
  process.exit(1);
});
