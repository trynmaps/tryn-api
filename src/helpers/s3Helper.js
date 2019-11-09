const _ = require('lodash');
const AWS = require('aws-sdk');
var zlib = require('zlib');

const s3 = new AWS.S3();

const s3Bucket = process.env.TRYNAPI_S3_BUCKET || "orion-vehicles";
console.log(`Reading state from s3://${s3Bucket}`);

/*
 * Gets bucket prefix at the minute-level
 * @param agencyId - String
 * @param currentTime - Number
 * @return prefix - String
 */
function getBucketMinutePrefix(agencyId, currentTime) {
  const currentDateTime = new Date(Number(currentTime * 1000));
  const year = currentDateTime.getUTCFullYear();
  const month = currentDateTime.getUTCMonth()+1;
  const day = currentDateTime.getUTCDate();
  const hour = currentDateTime.getUTCHours();
  const minute = currentDateTime.getUTCMinutes();
  return `${agencyId}/${year}/${month}/${day}/${hour}/${minute}/`;
}

function getS3Paths(prefix) {
  return new Promise((resolve, reject) => {
    s3.listObjects({
      Bucket: s3Bucket,
      Prefix: prefix,
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.Contents.map(obj => obj.Key));
      }
    });
  });
}

/*
 * @param startEpoch - Number
 * @param endEpoch - Number
 * @return s3Files - [String]
 */
async function getVehiclePaths(agencyId, startEpoch, endEpoch) {
  if (!endEpoch) {
    endEpoch = startEpoch + 60;
  }
  // Idea: there are 1440 minutes in a day, and the API return at most 1-2 days,
  // so we can iterate every minute (as we have to get each file individually anyways)
  let minutePrefixes = [];
  for (let time = startEpoch; time < endEpoch; time += 60) {
    minutePrefixes.push(getBucketMinutePrefix(agencyId, time));
  }
  let files = _.flatten(await Promise.all(minutePrefixes.map(prefix => getS3Paths(prefix))));

  let timestampsMap = {};
  let res = [];

  files.map(key => {
     const timestamp = getTimestamp(key);
     if (timestamp >= startEpoch && timestamp < endEpoch && !timestampsMap[timestamp]) {
         timestampsMap[timestamp] = true;
         res.push(key);
     }
  });
  return res;
}

// unzip the gzip data
function decompressData(data) {
  return new Promise((resolve, _) => {
    return zlib.unzip(data, (_, decoded) => resolve(JSON.parse(decoded.toString())));
  });
}

/*
 * Downloads and unzips the S3 files
 */
async function getVehicles(agencyId, startEpoch, endEpoch) {
  const keys = await getVehiclePaths(agencyId, startEpoch, endEpoch);

  return _.flatten(await Promise.all(keys.map(key => {
      return new Promise((resolve, reject) => {
        s3.getObject({
          Bucket: s3Bucket,
          Key: key,
        }, (err, data) => {
          if (err) {
              reject(err);
          } else {
              const timestamp = getTimestamp(key);
              decompressData(data.Body)
                .then(decodedData =>
                  resolve(insertTimestamp(timestamp, decodedData)));
          }
        });
      });
  })));
}

function getTimestamp(key) {
    const keyParts = key.split('-');
    return Math.floor(Number(keyParts[keyParts.length - 1].split('.json')[0])/1000);
}

/*
 * The API defines timestamp (epoch time in seconds) as a field for each vehicle,
 * which was also a column in Cassandra.
 * Since the timestamp is in the key in S3, that field does not exist,
 * thus we have to add it in the S3Helper to maintain compatibility
 */
function insertTimestamp(timestamp, vehicles) {
  return vehicles.map(vehicle => {
    return {
      ...vehicle,
      timestamp: timestamp,
    };
  });
}

module.exports = {
  getVehicles,
};

