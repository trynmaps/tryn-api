const axios = require('axios');
const config = require('../config');

async function getStopsFromRouteID(routeID, agency) {
  // agency must be same as its Nextbus name (ie. sf-muni for muni)
  return axios.get(`/agencies/${agency}/routes/${routeID}`, {
    baseURL: config.restbusURL
  })
  .then((response) => {
    const stopObj = response.data;
    return stopObj;
  })
  .then((stopObj) => stopObj.stops.map(makeStopFromNextBus));
}

function makeStopFromNextBus(nextbusObject) {
  const { id, title, lat, lon } = nextbusObject;
  return {
    sid: id,
    name: title,
    lat,
    lon,
  };
}

module.exports = getStopsFromRouteID;
