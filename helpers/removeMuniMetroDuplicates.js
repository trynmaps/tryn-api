const _ = require('lodash');


const debug = !!process.env.DEBUG;


/*
 * Creates unique key for vehicles across all states being processed.
 * Since the leadingVehicleID can change whenever a vehicle changes direction
 * (ie. reverses) or route (ie. is decoupled), did and rid are used in
 * addition to vid.
 */
const makeVehicleKey = ({ vid, did, rid }, leadingVid) =>
  (leadingVid || vid).concat(':', did, rid);

const updatePairingsMap = (leaderKey, followerKey, pairingsMap) => {
  // prevent cycles
  if (pairingsMap[followerKey] &&
    _.some(pairingsMap[followerKey], key => key === leaderKey)) {
    // break the cycle, as the follower is already a leader of its current leader
    return pairingsMap;
  }
  // prevent chaining
  if (pairingsMap[followerKey]) {
    // follower is already a leader, so resolve the chain (ie. A leads B, which leads C)
    // by setting the followerKey to be leaderKey in pairingsMap
    pairingsMap[leaderKey] = [followerKey, ...pairingsMap[followerKey]];
    delete pairingsMap[followerKey];
    return pairingsMap;
  }
  // update pairings
  if (pairingsMap[leaderKey]) {
    if (!pairingsMap[leaderKey].includes(followerKey)) {
      pairingsMap[leaderKey].push(followerKey);
    }
    return pairingsMap;
  }
  pairingsMap[leaderKey] = [followerKey];
  return pairingsMap;
};

/*
 * For each state, adds pairings to and returns
 * pairingsMap: leadingVid, did, rid -> followers
 */
const addPairings = vehiclesByTime => {
  return Object.keys(vehiclesByTime).reduce((pairingsMap, time) => {
    const vehicles = vehiclesByTime[time];
    return vehicles.reduce((pairingsMap, vehicle) => {
      const { leadingVid } = vehicle;
      if (leadingVid) {
        const leaderKey = makeVehicleKey(vehicle, leadingVid);
        const followerKey = makeVehicleKey(vehicle);
        return updatePairingsMap(leaderKey, followerKey, pairingsMap);
      }
      return pairingsMap;
    }, pairingsMap);
  }, {});
};

/*
 * pairedFollowersMap contains all followers that have been
 * paired to a leader (ie. part of numCars), including those that
 * are not in the state (ie. in vehicles)
 */
const assignNumCars = (vehicles, pairingsMap) => {
  const pairedLeadersMap = {};
  const pairedFollowersMap = {};
  vehicles.forEach(vehicle => {
    const key = makeVehicleKey(vehicle);
    if (pairingsMap[key]) {
      vehicle.numCars = pairingsMap[key].length + 1;
      pairedLeadersMap[key] = true;
      pairingsMap[key].forEach(key => pairedFollowersMap[key] = true);
    }
  });
  return { pairedLeadersMap, pairedFollowersMap };
}

/*
 * Returns map that returns the leader of a follower vehicle
 */
const invertPairings = pairingsMap => {
  return Object.keys(pairingsMap).reduce((followerToLeader, leaderKey) => {
    return pairingsMap[leaderKey].reduce((followerToLeader, key) => {
      followerToLeader[key] = leaderKey;
      return followerToLeader;
    }, followerToLeader);
  }, {});
}

/*
 * Finds followers without a leader and assigns the first one seen to be the leader
 */
const resolveLeaderlessFollowers = (
  vehicles,
  pairedLeadersMap,
  pairedFollowersMap,
  followerToLeader,
  pairingsMap,
) => {
  vehicles.forEach(vehicle => {
    const key = makeVehicleKey(vehicle);
    const leaderKey = followerToLeader[key];
    if (leaderKey && !pairedLeadersMap[leaderKey] && !pairedFollowersMap[key]) {
      const leaderVid = leaderKey.split(':')[0];
      vehicle.vid = leaderVid;
      vehicle.id = leaderVid;
      vehicle.numCars = pairingsMap[leaderKey].length + 1;
      pairingsMap[leaderKey].forEach(key => pairedFollowersMap[key] = true);
    }
  });
}

/*
 * Muni Metro vehicles have multiple cars, with each car being included
 * in the Nextbus feed. A leadingVehicleID is also included, and is used
 * to remove follower vehicles from the API result, returning only the
 * leading vehicle with a numCars field.
 *
 * - Once vehicle A is the leading vehicle of B, that pairing will remain
 *   for the vid/rid/did combination of the leading vehicle for all states
 *   being processed by the API; see addPairings for more context.
 *
 * - As to have consistent vehicle IDs, if a follower is present without
 *   its leader, it becomes the leader (vid and numCars fields are set).
 *   See resolveLeaderlessFollowers for more context.
 *
*/
const removeMuniMetroDuplicates = vehiclesByTime => {
  const pairingsMap = addPairings(vehiclesByTime);
  const followerToLeader = invertPairings(pairingsMap);
  if (debug) {
    console.log('Pairings Map');
    console.log(pairingsMap);
    console.log('Follower -> Leader');
    console.log(followerToLeader);
  }

  let filteredVehicles = {};

  Object.keys(vehiclesByTime).map(time => {
    let vehicles = vehiclesByTime[time];
    // leading vehicles in the state have numCars added to them
    const {
      pairedLeadersMap,
      pairedFollowersMap,
    } = assignNumCars(vehicles, pairingsMap);
    // case where a vehicle's leader isn't there
    resolveLeaderlessFollowers(
      vehicles,
      pairedLeadersMap,
      pairedFollowersMap,
      followerToLeader,
      pairingsMap,
    );
    // remove paired followers
    if (debug) {
      console.log(time);
      console.log('Removed or Renamed Vehicles:');
      console.log(Object.keys(pairedFollowersMap));
      console.log('Removed Vehicles:')
      console.log(vehicles
        .filter(vehicle => pairedFollowersMap[makeVehicleKey(vehicle)])
        .map(vehicle => makeVehicleKey(vehicle)));
    }
    filteredVehicles[time] = vehicles.filter(vehicle =>
      !pairedFollowersMap[makeVehicleKey(vehicle)]);
  });

  return filteredVehicles;
};

module.exports = removeMuniMetroDuplicates;
