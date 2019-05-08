/* ===== Persist data with LevelDB ==================
|  Learn more: level: https://github.com/Level/level |
/===================================================*/

// Import the level module - for Level DB functionality
const level = require('level');
// The chainDB variable will store the folder where the new blockchain persistent Level DB
// database will be stored.
const chainDB = './chaindata';

class LevelSandbox {

    constructor() {
        // create the LevelDB database storage folder using level() function
        this.db = level(chainDB);
    }

    // Get data from levelDB with key (Promise)
    getLevelDBData(key){
        let self = this;
        return new Promise(function(resolve, reject) {
            // Add your code here, remember in Promises you need to resolve() or reject()
            // use the get() function of level module to pull data out of the levelDB database
            // using the key
            self.db.get(key, (err, value) => {
                if(err){
                    if (err.type == 'NotFoundError') {
                        resolve(undefined);
                    }else {
                        console.log('Block ' + key + ' get failed', err);
                        reject(err);
                    }
                }else {
                    resolve(value);
                }
            });
        });
    }

    // Add data to levelDB with key and value (Promise)
    addLevelDBData(key, value) {
        let self = this;
        return new Promise(function(resolve, reject) {
            // Add your code here, remember in Promises you need to resolve() or reject()
            // Add to the LevelDB database using the level put() function
            self.db.put(key, value, function(err) {
                if (err) {
                    console.log('Block ' + key + ' submission failed', err);
                    reject(err);
                }
                resolve(value);
            });
        });
    }

    // Method that return the height
    getBlocksCount() {
        let self = this;
        return new Promise(function(resolve, reject){
            // Add your code here, remember in Promises you need to resolve() or reject()
            // Read the levelDB database data using the read stream which reads data one at a
            // time and each key value once read from the stream and placed in buffer
            // emits the 'data' event
            let i = 0;
            self.db.createReadStream().on('data', function(data) {
              // increment i to keep track of the total number of entries in the database.
              i++;
            }).on('error', function(err) {
              console.log('error in getting blockcount'+err);
              reject(err);
            }).on('close', function() {
              // once all the entries are streamed into the buffer the stream closes
              // emitting a 'close' event send the counter i data back. This counter
              // indicates the number of blocks present in this blockchain data base.
              resolve(i);
            });
        });
    }

    // Get block by hash - Read through the entire database and match the hash values to find the block
   getBlockByHash(hash) {
       let self = this;
       let block = "";
       return new Promise(function(resolve, reject){
           self.db.createReadStream()
           .on('data', function (data) {
             // data from levelDB contains two "keys" key(height) and value keys.
             // The block is stored under the key = value. So isolate the block and then parse it.
               if(JSON.parse(data.value).hash.toString() === hash){
                 // the block is stored at the value "key" so retrieve the block using data.value
                   block = data.value;
               }
           })
           .on('error', function (err) {
               reject(err)
           })
           .on('close', function () {
               resolve(block);
           });
       });
   }

   // Get block by wallet address - Read through the entire database and store in an array
   // all the blocks which belong to that particular wallet address
   getBlockByWalletAddress(walletAddress) {
     let self = this;
     let blockArray = [];
     return new Promise(function(resolve, reject){
         self.db.createReadStream()
         .on('data', function (data) {
           // data from levelDB contains two "keys" key(height) and value keys.
           // The block is stored under the key = value. So isolate the block and then parse it.
           if(JSON.parse(data.value).height > 0) {
             if(JSON.parse(data.value).body.address === walletAddress){
               // the block is stored at the value "key" so retrieve the block using data.value
               // and store it in the array
                 blockArray.push(JSON.parse(data.value));
             }
           }

         })
         .on('error', function (err) {
             reject(err)
         })
         .on('close', function () {
             console.log('\n inside the getBlockByWalletAddress function of level DB - printing the array of blocks');
             console.log(blockArray);
             resolve(blockArray);
         });
     });
   }


}

module.exports.LevelSandbox = LevelSandbox;
