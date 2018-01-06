const axios = require('axios');
const config = require('../config');

async function getStopsFromRouteID(routeID) {
  return axios.get(`/agencies/sf-muni/routes/${routeID}`, {
    baseURL: config.restbusURL
  })
  .then((response) => {
    const stopsObj = response.data;
    return stopsObj;
  });
}

module.exports = getStopsFromRouteID;
