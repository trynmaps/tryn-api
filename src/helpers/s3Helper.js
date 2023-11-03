const _ = require('lodash');
const AWS = require('aws-sdk');
var zlib = require('zlib');

const s3 = new AWS.S3();

const s3Bucket = process.env.TRYNAPI_S3_BUCKET || "orion-vehicles";
console.log(`Reading state from s3://${s3Bucket}`);

/*
 * Gets bucket prefix at the hour-level
 * @param agencyId - String
 * @param currentTime - Number
 * @return prefix - String
 */
function getBucketHourPrefix(agencyId, currentTime) {
  const currentDateTime = new Date(Number(currentTime * 1000));
  const year = currentDateTime.getUTCFullYear();
  const month = currentDateTime.getUTCMonth()+1;
  const day = currentDateTime.getUTCDate();
  const hour = currentDateTime.getUTCHours();
  return `${agencyId}/${year}/${month}/${day}/${hour}/`;
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

  // Convert Unix timestamps to Date objects
  const startDate = new Date(startEpoch * 1000); // Multiply by 1000 to convert to milliseconds
  const endDate = new Date(endEpoch * 1000);

  // Get the hour-level prefixes between the start and end dates
  // For each hour-level prefix, we query all S3 objects with that prefix and check that the actual S3 modifiedDate
  // fits the parameters
  let hourPrefix = new Set();
  for (let time = startEpoch - 3600; time <= endEpoch + 3600; time += 3600) {
    hourPrefix.add(getBucketHourPrefix(agencyId, time));
  }

  let hourPrefixArr = Array.from(hourPrefix);

  // Initialize an array to store the file paths
  const s3Files = new Set();

  const timestampsMap = new Set();

  for (const prefix of hourPrefixArr) {
    // Parameters for listing objects in the S3 bucket
    const params = {
      Bucket: s3Bucket,
      Prefix: prefix,
    };


    const data = await s3.listObjectsV2(params).promise();

    for (const object of data.Contents) {
      const objectDate = object.LastModified;
      const timestamp = getTimestamp(object.Key);
      if (objectDate >= startDate && objectDate <= endDate && !timestampsMap.has(timestamp)) {
        timestampsMap.add(timestamp);
        s3Files.add(object.Key);
      }
    }
  }

  return Array.from(s3Files);
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

