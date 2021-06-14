'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  mysql = require('mysql'),
  request = require('request'),
  database = mysql.createConnection({
    host : 'localhost',
    user : 'root',
    password : '',
    database : 'archive'
  }),
  PAGE_ACCESS_TOKEN = "EAANMjZAB2O5cBAJCisI3PPmGLnnXNp7TKIDgX07tVQERFmqCcMDC6PVqV6Mxqf3bW9MfTuywoZAMYhELnoYjZBoIcJIdQpSTrTHN2aTZAUBH0H7DbfBLtCjXYfD6CLSLMPUSvK9WkJdgWVmmFqFuWkvIKYysZCMArQ529kecJhZAENwATJja85rTg4U0hbZCFMZD", // Your page access token. Should get from your facebook developer account.
  VERIFY_TOKEN = "DigitalRideTestToken", // Your verify token. Should be a random string.
  app = express().use(bodyParser.json()); // creates express http server

  database.connect();
  // Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Homepage
app.get('/', (req, res) => {
  res.send("Hi there!");
})

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
 
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);
    
      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('Sender PSID: ' + sender_psid);

      database.query("SELECT * FROM user_info WHERE user_id = "+sender_psid+")", function (error, result) {
        if(!result[0]) {
          database.query("INSERT INTO user_info (user_id) VALUES ("+sender_psid+")", function (error, result) {
            if(error) res.sendStatus(404)
            if(result) {
              // Check if the event is a message or postback and
              // pass the event to the appropriate handler function
              if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);        
              } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
              }
            }
          })
        }
      })
    });
    

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {
    
  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
  
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

// Handles messages events
function handleMessage(sender_psid, received_message) {
  
  let response;

  // General text response
  if(received_message === '1') {
    response = { "text": "11. একজন ফ্রিল্যান্সার রাইডার বা ক্যাপ্টেন হিসেবে জয়েন করতে হলে আমাকে কি করতে হবে?\n\n12. আমি ঢাকা শহর এর ভেতরে কাস্টমার হিসেবে ভাড়ার তথ্য জানতে চাচ্ছি? কোথায় পাবো?" }
  } if(received_message === '11') {
    response = { "text": "আপনি যদি ডিজিটাল রাইড এর সাথে একজন ফ্রিল্যান্সার রাইডার বা ক্যাপ্টেন হিসেবে জয়েন করতে চান তাহলে নিচের লিঙ্কে ক্লিক করে আপনার তথ্য দিন।\n\nআমরা আপনার তথ্য পাবার ৬ঘণ্টার ভিতরে আপনার সাথে যোগাযোগ করবো।\n\nআপনি চাইলে আমাদের হট লাইনেও যোগাযোগ করতে পারেন।\n\nরেজিস্ট্রেশন ফর্মঃ https://bit.ly/3zlqnX5 \n\nএপ ডাউনলোডঃ https://bit.ly/3fXEHgX \n\nহট লাইনঃ ০৯৬১১৯৯১১৭৭" }
  } else {
    response = { "text": "ডিজিটাল রাইডে যোগাযোগের জন্য আপনাকে ধন্যবাদ।\n\nআপনি যদি একজন রাইডার হয়ে থাকেন তবে 1 চাপুন\n\nআপনি যদি একজন কাস্টমার হয়ে থাকেন তবে 2 চাপুন" }
  }

  // Response type template with postback button
  // response = {
  //   "attachment": {
  //     "type": "template",
  //     "payload": {
  //       "template_type": "button",
  //       "text": "ডিজিটাল রাইডে যোগাযোগের জন্য আপনাকে ধন্যবাদ। আরও কথোপকথনের জন্য দয়া করে আপনার পছন্দসই ভাষাটি নির্বাচন করুন।\n\nThank you for messaging at Digital Ride. Please select your desired language for futher conversation.",
  //       "buttons": [
  //         {
  //           "type": "postback",
  //           "title": "বাংলা",
  //           "payload": "bn",
  //         },
  //         {
  //           "type": "postback",
  //           "title": "English",
  //           "payload": "en",
  //         }
  //       ],
  //     }
  //   }
  // }
  
  // Send the response message
  callSendAPI(sender_psid, response);    
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  let response;
  
  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'bn') {
    response = { "text": "ধন্যবাদ। এখন থেকে আপনার সাথে বাংলা ভাষায় যোগাযোগ করা হবে।\n\nরাইড রিকোয়েস্ট দেয়ার জন্য 1 চাপুন\nডিজিটাল রাইড সম্পর্কিত তথ্যের জন্য 2 চাপুন\nকাস্টমার কেয়ার প্রতিনিধি'র সাথে কথা বলতে 3 চাপুন\n\nভাষা পরিবর্তনের জন্য 0 চাপুন" }
  } else if (payload === 'en') {
    response = { "text": "Oops, try sending another image." }
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log(body);
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}

