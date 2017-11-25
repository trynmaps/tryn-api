const axios = require('axios');
const config = require('../config');

function getRouteObj(routeIDs, vehicles, stops) {

  var routesMap = new Map();


  vehicles.forEach((vehicle) => {
    var key = vehicle.rid;
    if(routesMap.has(key)) {
      var vehicles = routesMap.get(key).get('vehicles');      
      vehicles.push(vehicle);
    } else {
      var value = new Map();
      value.set('vehicles', [vehicle]);
      routesMap.set(key, value);
    }
  })
  console.log(routesMap.get('E').get('vehicles')[0]);
  stops.forEach((stop) => {
    var route = stop.id;
    var stopsObj = stop.stops.map(makeStopsFromNextBus);
    routesMap.get(route).set('stops', stopsObj);
  });


  console.log(routesMap.get('E').get('stops'));


    // const routesVehicles = {};
    // const routesStops = {};
    // const routesSet = new Set();
    // vehicles.forEach((vehicle) => {
    //   const vehiclesInRoute = routesVehicles[vehicle.rid] || [];
    //   vehiclesInRoute.push(vehicle);
    //   routesVehicles[vehicle.rid] = vehiclesInRoute;

    //   routeID = vehicle.rid;

    //   return axios.get(`/agencies/sf-muni/routes/${routeID}`, {
    //     baseURL: config.restbusURL
    //   })
    //   .then((response) => {
    //     const stops = response.data.stops;
    //     const stopsObj = stops.map(makeStopsFromNextBus);
    //     if(!routesSet.has(routeID)) {
    //       const stopsInRoute = routesStops[routeID];
    //       stopsInRoute.push(stopsObj);
    //       routesStops[routeID] = stopsInRoute;
    //     } else {
    //       routesSet.add(routeID);
    //     }
    //   })
    // }) 

    routesArray = Array.from(routesMap);
    //console.log(routesArray);
    var x = routesArray.map(route => ({
      name: route[0],
      vehicles: route[1].get('vehicles'),
      stops: route[1].get('stops')
    }));

    console.log(x);
    return x;
}

function makeStopsFromNextBus(nextbusObject) {
  const { id, title, lat, lon } = nextbusObject;
  return {
    sid: id,
    name: title,
    lat,
    lon,
  };
}


module.exports = getRouteObj;
