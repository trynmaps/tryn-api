const axios = require('axios');
const config = require('../config');

async function getStopsFromRouteID(routeID) {
  return axios.get(`/agencies/sf-muni/routes/${routeID}`, {
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
