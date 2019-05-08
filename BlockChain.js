/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

const SHA256 = require('crypto-js/sha256');
const LevelSandbox = require('./LevelSandbox.js');
const Block = require('./Block.js');

class Blockchain {

    constructor() {
        // create an instance of the LevelSandbox class to create new database to store
        // this particular blockchain blocks
        this.bd = new LevelSandbox.LevelSandbox();
        this.generateGenesisBlock();
    }

    // Helper method to create a Genesis Block (always with height= 0)
    // You have two options, because the method will always execute when you create your blockchain
    // you will need to set this up statically or instead you can verify if the height !== 0 then you
    // will not create the genesis block
    generateGenesisBlock(){
        // Add your code here
        // Get the block Height and verify if there are no blocks in the blockchain
        // prior to adding the genesis block
        this.getBlockHeight().then((count) => {
          if(count===0) {
            // if no blocks in the chain call the addBlock() function and add the genesis block
            // Note that the syntax to call the constructor function of Block class is Block.Block()
            this.addBlock(new Block.Block("First block in the chain - Genesis block"))
            .then((result) => {console.log(result)});
          }
          else { console.log('Genesis Block Already Exists - Cannot add new Genesis block');}
        });
    }

    // Get block height, it is a helper method that return the height of the blockchain
    getBlockHeight() {
        // Add your code here
        let self = this;
        // return promise for this function getBlocksCount
        return new Promise(function(resolve, reject) {
          self.bd.getBlocksCount().then((count) => {
            // send the block height data back
            resolve(count);
          }).catch((err) => {reject(err)});
        });
    }

    // Add new block
    addBlock(block) {
        // Add your code here
        let self = this;
        // return promise for this function addBlock()
        return new Promise(function(resolve, reject){
          // Get the current height of the blockchain to add the next block
          self.getBlockHeight().then((count) => {
            // assign the new blockheight to the new block
            block.height = count;
            // UTC timestamp
            block.time = new Date().getTime().toString().slice(0,-3);
            // if count > 0 the block being added is not genesis block. Store previous Block hash
            // in new block and add the new block to database
            if(count>0) {
              self.bd.getLevelDBData(count-1).then((prevBlStr) => {
                block.previousBlockHash = JSON.parse(prevBlStr).hash.toString();
                // Block hash with SHA256 using newBlock and converting to a string
                block.hash = SHA256(JSON.stringify(block)).toString();
                // add the new block to LevelDB database
                self.bd.addLevelDBData(block.height, JSON.stringify(block).toString()).then((result) => {
                    // block added send data back and resolve the promise of addBlock() function
                    resolve(result);
                  });
              });
            }
            // if block is genesis block add the new block to the levelDB database
            // without updating the previousBlockHash field of the block
            else {
                // Block hash with SHA256 using newBlock and converting to a string
                block.hash = SHA256(JSON.stringify(block)).toString();
                self.bd.addLevelDBData(block.height, JSON.stringify(block).toString()).then((result) => {
                    // resolve the data for this promise as genesis block has been added.
                    resolve(result);
                  });
            }
          });
        });

    }

    // Get Block By Height
    getBlock(height) {
        // Add your code here
        let self = this;
        // return Promise from this function
        return new Promise(function(resolve, reject) {
          self.bd.getLevelDBData(height).then((block) =>{
            // convert block string obtained from levelDB to JSON object
            resolve(JSON.parse(block));
          }).catch((err) => {
            reject(err);
          });
        });
    }

    // Get Block By Hash from levelDB database
    getBlockUsingHash(hash) {
        // Add your code here
        let self = this;
        // return Promise from this function
        return new Promise(function(resolve, reject) {
          self.bd.getBlockByHash(hash).then((block) =>{
            // convert block string obtained from levelDB to JSON object
            resolve(JSON.parse(block));
          }).catch((err) => {
            reject(err);
          });
        });
    }

    // Get Block By wallet address from levelDB database
    getBlockByWalletAddress(walletAddress) {
      let self = this;
      // return Promise from this function
      return new Promise(function(resolve, reject) {
        // obtain the array of blocks from database. Note block obtained will be an array
        self.bd.getBlockByWalletAddress(walletAddress).then((blockArray) =>{
          resolve(blockArray);
        }).catch((err) => {
          reject(err);
        });
      });
    }



    // Validate if Block is being tampered by Block Height
    validateBlock(height) {
        // Add your code here
        // get block object
      let self = this;
      // return promise from this function validateBlock()
      return new Promise(function(resolve, reject) {
        self.getBlock(height).then((block) => {
          // get block hash
          let blockHash = block.hash;
          // remove block hash to test block integrity
          block.hash = '';
          // generate block hash
          let validBlockHash = SHA256(JSON.stringify(block)).toString();
          // Compare
          if (blockHash===validBlockHash) {
              resolve(true);
            } else {
              //console.log('Block #'+height+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
              resolve(false);
            }
        });
      });
    }

    // Validate Blockchain
    validateChain() {
      // Add your code here
      let self = this;
      // return Promise from this validateChain() function
      return new Promise(function(resolve, reject) {
          // errorLog array will store all invalid block heights
          let errorLog = [];
          // counter1 and counter2 are for checking if all promises from validateBlock()
          // and getBlock() function calls are finished. These counters will track
          // when we want to return the Promise of validateChain() function.
          let counter1 = 0;
          let counter2 = 0;
          self.getBlockHeight().then((height) => {
            for (let i = 0; i < height-1; i++) {
            // validate each block
              self.validateBlock(i).then((valid) => {
                  if (!valid) {
                    // If block not valid store the block height in array errorLog
                    errorLog.push(i);
                  }
                  // increment counter1 to track that this function is run as many times
                  // as the total number of blocks
                  counter1++;
                  // compare blocks hash link
                  self.getBlock(i).then((block) => {
                      let blockHash = block.hash;
                      self.getBlock(i+1).then((nextBlock) => {
                          let previousHash = nextBlock.previousBlockHash;
                            if (blockHash!==previousHash) {
                            // if hashes don't match store the block height in the array errorLog
                            errorLog.push(i);
                          }
                          // increment counter2 to track that the this function inside then() of
                          // getBlock() is run as many times as the total number of blocks
                          counter2++;
                          if(counter1===height-1 && counter2 ==height-1) {
                            // once all the promises for various functions are all finished
                            // this if loop will be true and we ready to send the data of the
                            // main promise of the validateBlock() function
                            resolve(errorLog);
                          }
                      });
                  });
                });
            }
          });
      });
    }

    // Utility Method to Tamper a Block for Test Validation
    // This method is for testing purpose
    _modifyBlock(height, block) {
        let self = this;
        return new Promise( (resolve, reject) => {
            self.bd.addLevelDBData(height, JSON.stringify(block).toString()).then((blockModified) => {
                resolve(blockModified);
            }).catch((err) => { console.log(err); reject(err)});
        });
    }

}

module.exports.Blockchain = Blockchain;
