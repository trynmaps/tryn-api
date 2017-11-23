const axios = require('axios');
const config = require('../config');

function getRoutes() {
    return axios.get('/agencies/sf-muni/routes', {
      baseURL: config.restbusURL
    })
    .then((response) => {
      const routes = response.data;
      return routes;
    })
    .catch((error) => {
      console.log(error);
    });
}

function getStopsFromRoute() {
    Promise.all(getRoutes.map(route => {
      return axios.get(`/agencies/sf-muni/routes/${route.id}`, {
      baseURL: config.restbusURL
      })
    }))
    .then((responses) => {
      return responses.map(response => {  
        const stops = response.data.stops;
        return stops.map(addStopsToRoute).map(stopObj => {
            stopObj.rid = response.data.id;
            return stopObj;
        });
      })
    })
    .catch((error) => {
      console.log(error);
    });
}

function addStopsToRoute(nextbusObject) {
  const { id, name, lat, lon } = nextbusObject;
  return {
    sid: id,
    title: name,
    lat,
    lon,
  };
}

module.exports = getStopsFromRoute;