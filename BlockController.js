const SHA256 = require('crypto-js/sha256');
const Block = require('./Block.js');
// bitcoinjs-message is used to verify signature of a message signed by a bitcoin wallet.
const bitcoinMessage = require('bitcoinjs-message');
// module to convert hex encoded data to ascii human readable data.
const hex2ascii = require('hex2ascii');
const BlockChain = require('./BlockChain.js');

// Private Blockchain Notary Service

//mempool object to save the timestamp information at index = wallet address.
// This is used in the initialization of the validation process
let mempool = [];
// mempoolValid array stores the a JSON object which contains the status of the star validation
// request at the index = wallet address
let mempoolValid = [];
// mempoolTimeout variable stores the setTimeout function scheduled to delete the mempool[address]
let mempoolTimeout;

// 5 minutes window to store the initial validation request. After the 5 min, mempool[address] is deleted
const ReqWaitTime = 5*60*1000;

/**
 * Controller Definition to encapsulate routes to work with blocks
 */
class BlockController {

    /**
     * Constructor to create a new BlockController, you need to initialize here all your endpoints
     * @param {*} server
     */
    constructor(server) {
        this.server = server;
        // Initialize the Blockchain for star registry data storage
        this.myBlockChain = new BlockChain.Blockchain();
        // launch all Endpoints to wait and hear for client requests
        this.postRequestValidation();
        this.postValidateMessage();
        this.postStarBlock();
        this.getBlockByHash();
        this.getBlockByWalletAddress();
        this.getBlockByIndex();
    }

    /**
     * Implement a GET Endpoint to retrieve a block by index, url: "/stars/block/:index"
     */
    getBlockByIndex() {
        this.server.route({
            method: 'GET',
            path: '/stars/block/{index}',
            // async the handler function to deal(await) with asynchronous functions inside
            handler: async (request, h) => {
              // retrieve the block index value from get request stored at request.params.index
               let index = request.params.index;
               let blockHeight = 0;
               // Get current blockheight of the blockchain to verify if user sent index is valid
               await this.myBlockChain.getBlockHeight().then((height) => {
                 blockHeight = height;
               });

               // Check first if user sent block index is valid prior to responding to GET request
               if(index < blockHeight && index >= 0) {
                 let blockAux = "";
                 await this.myBlockChain.getBlock(index).then((block) => {
               		blockAux = block;
               	 }).catch((err) => { console.log(err);});

                 // Check if genesis block was requested. If not respond with decoding star story
                 // into human readable form. If genesis block requested, no modification is needed prior
                 // to reporting.

                 if(blockAux) {
                   if(blockAux.height > 0) {
                     // convert hex encoded star story to human readable string
                      blockAux.body.star.storyDecoded = hex2ascii(blockAux.body.star.story);
                      return blockAux;
                    }
                    else { return blockAux;}
                 }
                 else { return 'The block not found';}
               }
               else { return `The block at height ${index} does not exist`;}
            }
        });
    }



/**
 * Implement a GET Endpoint to retrieve a block by block hash, url: "/stars/hash:{hash}"
 */

 // The below function logic similar to the getBlockByIndex() function above. See comments above.
    getBlockByHash() {
      this.server.route({
        method: 'GET',
        path: '/stars/hash:{hash}',
        handler: async (request, h) => {
          let hash = request.params.hash;
          let blockAux = null;
          await this.myBlockChain.getBlockUsingHash(hash).then((block) => {
              blockAux = block;
            }).catch((err) => { return err;});
            if(blockAux) {
              if(blockAux.height > 0) {
                 blockAux.body.star.storyDecoded = hex2ascii(blockAux.body.star.story);
                 return blockAux;
               }
               else { return blockAux;}
            }
            else { return 'Requested Block not found double check hash value';}
          }
      });
    }

    /**
     * Implement a GET Endpoint to retrieve a block by wallet address, url: "/stars/walletaddress:{walletaddress}"
     */

     // Since the genesis block won't have an wallet address associated with it we do not have to
     // deal with that case as we won't get a genesis block back from LevelSandbox
        getBlockByWalletAddress() {
          this.server.route({
            method: 'GET',
            path: '/stars/walletaddress:{walletAddress}',
            handler: async (request, h) => {
              let walletAddress = request.params.walletAddress;
              console.log('wallet address is:');
              console.log(walletAddress);
              // since multiple blocks could have been added by one wallet address, an array is
              // used to store the blocks belonging to the wallet address
              let blockAuxArray = [];
              await this.myBlockChain.getBlockByWalletAddress(walletAddress).then((blockArray) => {
                // An array will be returned by the function in Blockchain.js and LevelSandbox.js
                  blockAuxArray = blockArray;
                }).catch((err) => { return err;});
              if(blockAuxArray.length > 0) {
                  for(let i = 0; i < blockAuxArray.length; i++){
                      blockAuxArray[i].body.star.storyDecoded = hex2ascii(blockAuxArray[i].body.star.story);
                  }
                  return blockAuxArray;
              }
              else { return 'Requested Block not found double check wallet address';}
            }
          });
        }

    /**
     * Implement a POST Endpoint to add a new validation request url: "/requestValidation"
     */

    /**
     * Step 1 of Validation
     * This post request is the first step for a user to add star data to the blockchain signaling intent.
     * The post request body contains a json object with wallet address provided at key = address
     * To retrieve the body data, use the syntax request.payload.address. Note address is the
     * variable name used in the body. request.payload is the syntax per hapi.js frameworks
     * The initial request to store data is tracked by storing the information in an array called mempool
    */

    postRequestValidation() {
        this.server.route({
            method: 'POST',
            path: '/requestValidation',
            handler: async (request, h) => {
              let address = request.payload.address;
              // currentTime stores the time the post request was received
              let currentTime = new Date().getTime().toString().slice(0,-3);
              console.log('inside the postRequestValidation function and address is:');
              console.log(address);
              // Process the request only if user sent a non-null address otherwise report error back
              if(address) {
                // if the address is not already waiting in the mempool or
                // if more than 5min elapsed since this address made a previous request then start the validation
                // by adding the timestamp data to mempool[address] array for future start data processing
                if(!mempool[address] || this.isTimeValid(address, currentTime)) {
                  mempool[address] = currentTime;
                  console.log('Printing the timestamp assigned to validation request and timestamp is:');
                  console.log(mempool[address]);
                  // Start a timeout for this validation request to be deleted/timed out if the next
                  // steps for submitting star data are taken up by the user within 5 minutes of sending this validation request
                  // store the timeout in a global variable so that it can be accessed to delete the timeout if
                  // the user sends the data on time.
                  mempoolTimeout = setTimeout(() => {
                    delete mempool[address];
                    // mempoolValid is defined in the createValidObject() function
                    // The mempoolValid[] array stores the valid signature information from step 2 of validation
                    // delete that data as well if validation request is timed out.
                    if(mempoolValid[address]) { delete mempoolValid[address];}

                  }, ReqWaitTime*1000);

                  // create and send a message for user to sign and send back
                  let responseObj = this.responseObject(address);
                  //return JSON.stringify(responseObj);
                  return responseObj;
                }
                else { return "Either a reuqest already exists or prevous request has not timed out - wait 5 minutes";}
            	}
              else { return 'Invalid new validation request';}
            }
        });
    }

    // function to check if the new validation request is made after 5 minutes has passed from first request
    isTimeValid(address, currentTime) {
          if(currentTime - mempool[address] < ReqWaitTime/1000) { return false;}
          else {return true;}
    }

    // responseObject() function creates a JSON object with a message for user to sign and send back
    // message to be signed is stored in the key variable message
    // validationWindow - the amount of time left on the clock to send the signed message and star data
    responseObject(address) {

          let timeElapse = (new Date().getTime().toString().slice(0,-3)) - mempool[address];
          let timeLeft = (ReqWaitTime/1000) - timeElapse;

          let requestObject = {
            walletAddress: address,
            requestTimeStamp: mempool[address],
            message: [address,mempool[address],'starRegistry'].join(':'),
            validationWindow: timeLeft
          };

          return requestObject;
    }

    /**
     * Step 2 - Verify signature
     * Implement a POST Endpoint to add a new validation request url: "/message-signature/validate"
     * The user sends a signature back by signing the message server provided them in the previous step
     * The user sends a JSON object with keys : address and signature for server to parse and verify
     * This function will verify if the signature is valid. If valid then stores user address, timestamp,
     * message and time left inside the mempoolValid[address] array.
     */
    postValidateMessage() {
        this.server.route({
            method: 'POST',
            path: '/message-signature/validate',
            handler: (request, h) => {
              let message = request.payload;
              console.log('\n Inside the postValidateMessage function and printing the message obtained from the client via the POST request:');
              console.log(message);

             if(message.address) {
                  console.log('\n Inside the if statement of postValidateMessage function printing address and signature again');
                  console.log(message.address);
                  console.log(message.signature);
                  // check if the signature sent by user is valid
                  let res = this.validateRequestByWallet(message);
                  if(res) {
                    // take the next steps once signature is validated to store star data
                      let validObject = this.createValidObject(message);
                      console.log('Inside the postValidateMessage function - printing Object showing message signature has been validated');
                      console.log(validObject);
                      // Send the user the JSON object showing that the mempool has stored the timestamp and
                      // is waiting for the star data.
                      return validObject;
                  }
                  else {return 'Signature sent is not valid - Verify';}
              }
              else { return 'Please use the correct wallet address to sign';}
        }
      });
    }

// validateRequestByWallet() function verifies if the signature sent by user is valid.
    validateRequestByWallet(messageSigned) {

      let address = messageSigned.address;

      // first check if this address had a waiting validation request in the mempool
      if(mempool[address]) {
        // obtain the message which was sent to the user to sign. responseObject() function does that.
        let messageStored = this.responseObject(address).message;
        // use the verify() function of the bitcoinjs-message to check if the signature sent is valid
        // pass in the message, public address and signature as arguments to this function
        let result1 = bitcoinMessage.verify(messageStored, address, messageSigned.signature);
        console.log('Inside the validateRequestByWallet function - printing if signature is valid');
        console.log(result1);
        return result1;
      }
      else {return false;}
    }

// This function will create temporary data in mempool once the signature in step 2 was verified
// This data is stored in mempoolValid[address] array - indicating that the message was verified
    createValidObject(message) {

      let messageOriginal = this.responseObject(message.address)

        mempoolValid[message.address] =
        // the registerStar variable true signals to the user that data has user is authorized
        // to send the star data in the next step 3.
          { registerStar:true,
            status: {
                address: message.address,
                requestTimeStamp: mempool[message.address],
                message: messageOriginal.message,
                // The below time information shows the current time left to add the star data prior to
                // timeout of the mempool starting from the step 1 validate request.
                validationWindow: messageOriginal.validationWindow,
                messageSignature: true
              }
          }
          return mempoolValid[message.address];
      }

    /**
      * Step 3 - Store the Star Data to the Blockchain obtained from the user
      * Implement a POST Endpoint to add a new validation request url: "/block"
      * User sends the star data to be added to the block
      * The star data sent by user shall contain the key variables: address, star, star.ra,
      * star,dec, star.story
    */

    postStarBlock() {
        this.server.route({
            method: 'POST',
            path: '/block',
            handler: async (request, h) => {
              let starData = request.payload;
              console.log('\n Inside the postStarBlock() function - Star Data Received = ')
              console.log(starData);

              // First check if data sent in by user is valid prior to proceeding with adding data to block
              if(!starData.address || !starData.star || !starData.star.ra || !starData.star.dec || !starData.star.story) {
                return "Send valid star data";
              }
              else {
                // check if the address has valid request in the mempool and the request was not timedout
                // if the above check out proceed with adding data to the blockchain.
                if(mempoolValid[starData.address] && mempool[starData.address]) {
                  // remove timeout and remove mempool data because we are now ready to add data to blockchain
                  // This will allow this wallet address to initiate other new validation requests.
                  clearTimeout(mempoolTimeout);
                  delete mempool[starData.address];
                  delete mempoolValid[starData.address];
                  console.log('\n This address is allowed to send Star Data to store on Blockchain');
                  // call the createBlock() function to prepare the data for a new Block creation
                  // this function returns a JSON object.
                  let body = this.createBlock(starData);
                  console.log('\n Body to be added to a new block');
                  console.log(body);
                  console.log('\n body.story converted to string');
                  console.log(hex2ascii(body.star.story));
                  // create a new Block with the JSON object stored in variable body in the
                  // key variable 'body' of the Block.
                  let newBlock = new Block.Block(body);

                // Instead of using .then in the below syntax, used await and saved the result
                // directly into a variable called "blockAdded"

                  const blockAdded = await this.myBlockChain.addBlock(newBlock);
                  let blockParsed = JSON.parse(blockAdded);
                  console.log(blockParsed);
                  blockParsed.body.star.storyDecoded = hex2ascii(blockParsed.body.star.story);
                  return blockParsed;
                }
                else { return 'The address has not be validated to send star data. Send validation request first!'}

              }
            }
        });
    }

// function to assemble the Block body object from star data sent by User. Create a JSON object
// to store the starData after some processing.

    createBlock(starData) {
      let body = {
        address: starData.address,
        star: {
              ra: starData.star.ra,
              dec: starData.star.dec,
              // use the toString('hex') function of Buffer module to convert the star.story into
              // hexademial numbers for storage on the blockchain.
              story: Buffer.from(starData.star.story).toString('hex')
        }
      };
      return body;
    }



}

/**
 * Exporting the BlockController class
 * @param {*} server
 */
module.exports = (server) => { return new BlockController(server);}
