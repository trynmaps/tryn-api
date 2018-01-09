/*
 * List of keys to use in Cassandra realtime_vehicle queries
 * 
 * Iterate through each hour from startTime to endTime as to
 * get the vdate and vhour primary keys that will be passed
 * on to Cassandra
 * 
 * https://github.com/trynmaps/orion/wiki/Vehicle-Locations
 * 
 * @param startTime: Number
 * @param endTime: Number
 * @return primaryKeyHours: [{vdate: String, vhour: Number}]
 * 
*/
function getPrimaryKeys(startTime, endTime) {
    const msInHour = 3600000;
    const primaryKeys = [];
    for(let currentTime = startTime;
        currentTime <= endTime; 
        currentTime += msInHour) {
            const keyToAdd = new Date(currentTime);
            primaryKeys.push({
                vdate: keyToAdd.toISOString().slice(0, 10),
                vhour: keyToAdd.getHours(),
            });
    }
    return primaryKeys;
}

module.exports = getPrimaryKeys;
