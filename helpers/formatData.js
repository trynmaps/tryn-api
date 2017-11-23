const config = require('../config');
const axios = require('axios');

function putVehiclesIntoRoutes(vehicles) {
    const routes = {};
    vehicles.forEach((vehicle) => {
      const vehiclesInRoute = routes[vehicle.rid] || [];
      vehiclesInRoute.push(vehicle);
      routes[vehicle.rid] = vehiclesInRoute;
    })
    return Object.keys(routes).map(routeName => ({
      name: routeName,
      vehicles: routes[routeName],
    }));
}

function getRoutes() {
    return axios.get('/agencies/sf-muni/routes', {
      baseURL: config.restbusURL
    })
    .then((response) => {
      const routes = response.data.id;
      console.log(routes);
      return routes;
    })
    .catch((error) => {
      console.log(error);
    });
}

function getStopsFromRoute(routes) {
    Promise.all(routes.map(route => {
      return axios.get(`/agencies/sf-muni/routes/${route}`, {
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

module.exports = {
  putVehiclesIntoRoutes,
  getRoutes,
  getStopsFromRoute,
  addStopsToRoute
}
