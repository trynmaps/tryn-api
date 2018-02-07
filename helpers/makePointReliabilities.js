const _ = require('lodash');
const turf = require('@turf/turf');

/*
 * Creates PointReliabilities as described here:
 * https://github.com/trynmaps/orion/wiki/Point-Reliability
 * 
 */
function makePointReliabilities(point, vehiclesByRouteByTime, routeIDs) {
  return {
    lat: point.lat,
    lon: point.lon,
    arrivals: routeIDs.map(rid => ({
      rid,
      routeStates: removeDuplicateArrivals(
        Object.keys(vehiclesByRouteByTime[rid])
          .map(vtime => ({
            vtime,
            vehicles: vehiclesByRouteByTime[rid][vtime]
              .map((vehicle) => addPointDistanceField(vehicle, point))
              .filter((vehicle) => vehicleInPointRadius(vehicle, point))
          }))
        )
        .filter(states => states.vehicles.length)
        .sort((s1, s2) => s1.vtime > s2.vtime ? 1 : -1),
    })),
  }
}

function addPointDistanceField(vehicle, point) {
  vehicle.pointDistance = turf.distance(
    turf.point([vehicle.lon, vehicle.lat]),
    turf.point([point.lon, point.lat]),
    { units: 'kilometers' },
  );
  return vehicle;
}

function vehicleInPointRadius(vehicle, point) {
  // might not work well for highway buses for points where
  // the bus is normally moving
  // https://github.com/trynmaps/tryn-api/issues/17
  return vehicle.pointDistance < 0.1; // 100 metres
}

/*
 * Problem: for one actual arrival, one vehicle could appear several times
 * So we apply these rules:
 * For each vehicle ID, we take it only if compared to its
 * previous arrivals, there's a heading difference of over 120
 * degrees or a time difference of over 20 minutes.
 * 
 * @param routeStates: [RouteState]
 * @returns routeStates but without duplicate vehicles
 */ 
function removeDuplicateArrivals(routeStates) {
  let vehiclesByVid = {};
  routeStates.forEach(state => {
    state.vehicles.forEach(vehicle => {
      vehiclesByVid[vehicle.vid] = vehiclesByVid[vehicle.vid] || [];
      vehiclesByVid[vehicle.vid].push(vehicle);
    });
  });

  vehiclesByVid = Object.values(vehiclesByVid).map(linkedVehicles => {
    linkedVehicles.sort(
      (v1, v2) => v1.vtime > v2.vtime ? 1 : -1
    );
    const vehiclesToKeep = [];
    let prevVehicle = null;
    linkedVehicles.forEach(vehicle => {
      if (vehiclesToKeep.length === 0) {
        prevVehicle = vehicle;
        vehiclesToKeep.push(vehicle);
        return;
      }
      // get heading difference
      const headingDifference = vehicle.heading - prevVehicle.heading;
      // get time difference in minutes
      const timeDifferenceMinutes = (vehicle.vtime - prevVehicle.vtime) / 60000.0;

      if (headingDifference > 120 || timeDifferenceMinutes > 20) {
        vehiclesToKeep.push(vehicle);
      } else if (vehicle.pointDistance < prevVehicle.pointDistance) {
        vehiclesToKeep.pop();
        vehiclesToKeep.push(vehicle);
      }
      prevVehicle = vehicle;
    });
    return vehiclesToKeep;
  });
  // take the vehicles by vid and put them back into by time
  const vehiclesByTime = {};
  Object.values(vehiclesByVid).forEach(linkedVehicles => {
    linkedVehicles.forEach(vehicle => {
      vehiclesByTime[vehicle.vtime] = vehiclesByTime[vehicle.vtime] || [];
      vehiclesByTime[vehicle.vtime].push(vehicle);
    });
  });
  return Object.keys(vehiclesByTime)
    .map(vtime => ({
      vtime,
      vehicles: vehiclesByTime[vtime],
    }));
}

module.exports = makePointReliabilities;
