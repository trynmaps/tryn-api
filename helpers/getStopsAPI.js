const axios = require('axios');
const config = require('../config');

function getStops() {
    return axios.get('/agencies/sf-muni/routes', {
      baseURL: config.restbusURL
    })
    .then((response) => {
      const routes = response.data;
      const routeIDs = [];
      routes.forEach((obj) => {
        routeIDs.push(obj.id);
      })
      routeIDs.forEach((routeID) => {
        return axios.get(`/agencies/sf-muni/routes/${routeID}`, {
          baseURL: config.restbusURL
        })
        .then((response) => {
          const stopsObj = response.data.stops;
          console.log(routes);
          return Object.keys(routeIDs).map(routeName => ({
            name: routeName,
            stops: stopsObj
          }));
        })
      })
    })
    .catch((error) => {
      console.error('getRoutes(): ' + error);
    });
}

function getStopsFromRoute() {
    const routes = getRoutes();
    routes.forEach((route) => {
      return axios.get(`/agencies/sf-muni/routes/${route}`, {
        baseURL: config.restbusURL
      })
      .then((response) => {
        const route = [];
        route.push(response);
        route.forEach((obj) => {
          console.log(obj.stops);
        })

        // return responses.map(response => {  
        //   const stops = response.data.stops;
        //   return stops.map(addStopsToRoute).map(stopObj => {
        //     stopObj.rid = response.data.id;
        //     return stopObj;
        //   });
        // })
      })
    })
    .catch((error) => {
      console.error('getStopsFromRoute(): ' + error);
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

module.exports = getStops;