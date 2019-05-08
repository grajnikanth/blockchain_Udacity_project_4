# Project #4. Build a Private Blockchain Notary Service

This is Project 4, In this project, I built a Star Registry Service that allows users to claim ownership of their favorite star in the night sky. The code from Project 3 for the persistent private blockchain and API endpoints was used as the basis for this code. In addition, Hapi.js framework was used to create the API.

## Setup project for Review.

To setup the project for review do the following:
1. Download the project.
2. Run command __npm install__ to install the project dependencies.
3. Run command __node app.js__ in the root directory.

## Project Description

Create a Blockchain dataset that allow you to store a Star (This builds on top of Project 3 of this course)

The application will persist the data (using LevelDB).
The application will allow users to identify the Star data with the owner.

## Create a Mempool component

The mempool component will store temporal validation requests for 5 minutes (300 seconds).
The mempool component will store temporal valid requests for 30 minutes (1800 seconds).
The mempool component will manage the validation time window.

## Create a REST API that allows users to interact with the application.

The API will allow users to submit a validation request.
The API will allow users to validate the request.
The API will be able to encode and decode the star data.
The API will allow be able to submit the Star data.
The API will allow lookup of Stars by hash, wallet address, and height.


## The Project

The file __app.js__ in the root directory has all the code to be able to run this project. This file implements the code to deploy a localhost server on port 8000.

The file __BlockController.js__ in the root directory has all the code for server response endpoints for GET and POST http requests. This file also contains code for initializing the private Blockchain and responding to various GET and POST requests.

Delete the chaindata/ folder created each time the app.js file is executed to delete the previous Blockchain data created.


##Node.js Frameworks

In this project I used the Hapi.js framworks to create the localhost server at port 8000.

## POST endpoints

1. Submit validation post request
    The URL is http://localhost:8000/requestValidation
    In the body of the POST request include the JSON object as shown below
    {
      "address": valid bitcoin public address
    }

2. Submit message signature for validation
    The url is http://localhost:8000/message-signature/validate
    In the body of the POST request include the JSON object as shown below
    {
      "address": valid bitcoin address used in previously
      "signature": signature obtained by signing the message using the bitcoin private key
    }

3. Submit star data to store on blockchain
    The URL is http://localhost:8000/block
    In the body of the POST request include the JSON object as shown below
    {
      "address": valid bitcoin address used in previously
      "star": {
            "dec": declination,
            "ra": right ascension,
            "story": a string containing brief description of how the star data was obtained
        }
    }

##GET endpoints

1. Get block by hash
    http://localhost:8000/stars/hash:{hash}
2. Get block by index
    http://localhost:8000/stars/block/{index}
3. Get blocks by wallet address
    http://localhost:8000/stars/walletaddress:{address}

## What did I learn with this Project

* I was able to create a localhost:8000 server with GET and POST endpoints to respond to client requests.
* I was able to use async and await for dealing with asynchronous code.
* I was able to write code to implement the various POST and GET requests.
* I was able to validate the star data sent and create blocks to add to the private blockchain.
* I was able to implement the code to verify and validate the star data entry requests from users.
