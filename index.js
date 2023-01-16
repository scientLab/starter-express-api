const express = require("express");
const { json, urlencoded } = require("body-parser");
const axios = require("axios");
const { DateTime } = require("luxon");
const app = express();

app.use(express.json());
app.get("/", (req, res) => {
  console.log("Just got a request!");
  res.send("Yo!ffdf");
});

app.post("/webhook", (request, response) => {
  console.log(JSON.stringify(request.body, null, 2));
  const tag = request.body.fulfillmentInfo.tag;
  const session_name = request.body.sessionInfo.session;
  let mobile_number = request.body.sessionInfo.parameters.mobile_number;
  const sessionid = request.body.sessionInfo.parameters.sessionid;

  //console.log(session_name)

  let jsonResponse = {};

  if (tag == "mobile") {
    mobile_number = mobile_number.replace(/\s+/g, "");
    var config = {
      method: "get",
      url: `https://ec2-3-236-245-181.compute-1.amazonaws.com/VoiceBotIntegration/GetAutoPolicyHolderByPhoneNumber/${mobile_number}`,
      //9900121212
      headers: {
        Authorization: "Basic ZWlxdXNlcjpFIXFVczNyQDEyMw==",
      },
    };

    axios(config)
      .then(function (res) {
        console.log(JSON.stringify(res.data));
        console.log(res.data.success);

        if (res.data.success) {
          console.log("inside ");
          let record = res.data.data[0];
          jsonResponse = {
            fulfillment_response: {
              messages: [
                {
                  text: {
                    //fulfillment text response to be sent to the agent
                    text: [`Are you the policyholder ${record.customerName}?`],
                  },
                },
              ],
            },
            session_info: {
              session: `${session_name}`,
              parameters: {
                holder_name: `${record.customerName}`,
                email: `${record.emailID}`,
                policyNumber: `${record.policyNumber}`,
                dateOfBirth: `${record.dateOfBirth}`,
                addressLine1: `${record.addressLine1}`,
                zipcode: `${record.zipCode}`,
                vehicleNumber: `${record.vehicleNumber}`,
              },
            },
          };
        } else {
          jsonResponse = {
            fulfillment_response: {
              messages: [
                {
                  text: {
                    //fulfillment text response to be sent to the agent
                    text: [`Sorry, we didn't find record`],
                  },
                },
              ],
            },
            session_info: {
              session: `${session_name}`,
              parameters: {
                authenticate: false,
              },
            },
          };
        }
        console.log(jsonResponse);
        response.json(jsonResponse);
      })
      .catch(function (error) {
        console.log(error);
      });

    //const record = data.find((item) => item.mobile_number == mobile_number);
  } else if (tag == "authenticate") {
    let vehicle_number = request.body.sessionInfo.parameters.vehicle_number;
    let policy_number = request.body.sessionInfo.parameters.policy_number;
    let policyNumber = request.body.sessionInfo.parameters.policyNumber;
    let DOB = request.body.sessionInfo.parameters.dob;
    DOB = DateTime.fromObject(DOB).toFormat("dd/LL/yyyy");
    let dateOfBirth = request.body.sessionInfo.parameters.dateOfBirth;
    let vehicleNumber = request.body.sessionInfo.parameters.vehicleNumber;
    let zip_code = request.body.sessionInfo.parameters.zip_code;
    let zipcode = request.body.sessionInfo.parameters.zipcode;

    var authenticate = false;
    var answer = "Your authentication is not complete.";
    //compare policynumber, DOB, Vehiclenumber and zipcode
    policyNumber = policyNumber.match(/(\d+)/);

    vehicle_number = vehicle_number.replace(/\s+/g, "");
    zip_code = zip_code.replace(/\s+/g, "");

    console.log(policyNumber);
    console.log(policy_number);
    console.log(DOB + "and" + dateOfBirth);
    console.log(vehicleNumber + "and" + vehicle_number);
    console.log(
      vehicle_number.localeCompare(vehicleNumber, "en", { sensitivity: "base" })
    );

    if (true) {
      if (policyNumber[0] == policy_number && DOB == dateOfBirth) {
        authenticate = true;
        answer =
          "Perfect. Thank you. Your authentication is completed. We can now proceed with your claim lodgement request.";
      }
      jsonResponse = {
        fulfillment_response: {
          messages: [
            {
              text: {
                //fulfillment text response to be sent to the agent
                text: [`${answer}`],
              },
            },
          ],
        },
        session_info: {
          session: `${session_name}`,
          parameters: {
            authenticate: `${authenticate}`,
          },
        },
      };
      console.log(jsonResponse);
      response.json(jsonResponse);
    }
  } else if (tag == "get policy expense") {
    let policyNumber = request.body.sessionInfo.parameters.policyNumber;
    let incidentDate = request.body.sessionInfo.parameters.doi;
    incidentDate = DateTime.fromObject(incidentDate).toFormat("dd/LL/yyyy");
    let damage_part = request.body.sessionInfo.parameters.damage_part;
    let how_happened = request.body.sessionInfo.parameters.how_happened;
    let where_happened = request.body.sessionInfo.parameters.where_happened;
    var data = JSON.stringify({
      policyNumber: `${policyNumber}`,
      incidentDate: `${incidentDate}`,
      eventLocation: `${JSON.stringify(where_happened)}`,
      damageDescription: `${
        JSON.stringify(damage_part) + `${JSON.stringify(how_happened)}`
      }`,
    });

    var config = {
      method: "get",
      url: "https://ec2-3-236-245-181.compute-1.amazonaws.com/VoiceBotIntegration/GetPolicyExpenseDetails",
      headers: {
        Authorization: "Basic ZWlxdXNlcjpFIXFVczNyQDEyMw==",
        "Content-Type": "application/json",
      },
      data: data,
    };

    axios(config)
      .then(function (res) {
        console.log(JSON.stringify(res.data));
        let lodgeClaimID = res.data.data.lodgeClaimID;
        let policyExpenseAmount = res.data.data.policyExpenseAmount;
        var final;
        if (res.data) {
          final = `<speak>
            Now to <emphasis level="moderate">complete</emphasis> the claim lodgment process you are required to <emphasis level="strong">pay</emphasis> for policy excess of GBP ${policyExpenseAmount}<break time="1s"/>Please confirm if you are ok to move ahead 
            </speak>`;
        } else {
          final = `<speak>
          <emphasis level="moderate">Sorry! we are facing some technical issue at the movement.</emphasis></speak>`;
        }
        jsonResponse = {
          fulfillment_response: {
            messages: [
              {
                text: {
                  //fulfillment text response to be sent to the agent
                  text: [`${final}`],
                },
              },
            ],
          },
          session_info: {
            session: `${session_name}`,
            parameters: {
              lodgeClaimID: `${lodgeClaimID}`,
            },
          },
        };
        console.log(jsonResponse);
        response.json(jsonResponse);
      })
      .catch(function (error) {
        console.log(error);
        final = `<speak>
          <emphasis level="moderate">Sorry! we are facing some technical issue at the movement.</emphasis></speak>`;
      });
  } else if (tag == "generate claim") {
    let lodgeClaimID = request.body.sessionInfo.parameters.lodgeClaimID;
    var config = {
      method: "post",
      url: `https://ec2-3-236-245-181.compute-1.amazonaws.com/VoiceBotIntegration/GenerateClaim/${lodgeClaimID}`,
      headers: {
        Authorization: "Basic ZWlxdXNlcjpFIXFVczNyQDEyMw==",
      },
    };

    axios(config)
      .then(function (res) {
        console.log(JSON.stringify(res.data));
        if (res.data.success) {
          var claimReferenceNumber = res.data.data.claimReferenceNumber;
          var final = `<speak>
            <break time = "2s"/>
             <emphasis level="strong">Thank you,</emphasis> <break time="10ms"/> your payment has been processed successfully.
            <break time = "2s"/>
            Please make a note of your claim number as ${claimReferenceNumber}. <break time="10ms"/> You will also receive all the details via SMS and email at the end of conversation.
            <break time="2s"/> 
            Now, lets get your car repaired. <break time="10ms"/> Is your car drivable?
             </speak>`;
        } else {
          final =
            "Sorry! due to technical difficulty we can not generate your claim now.";
        }
        jsonResponse = {
          fulfillment_response: {
            messages: [
              {
                text: {
                  //fulfillment text response to be sent to the agent
                  text: [`${final}`],
                },
              },
            ],
          },
        };

        console.log(jsonResponse);
        response.json(jsonResponse);
      })
      .catch(function (error) {
        console.log(error);
        final =
          "Sorry! due to technical difficulty we can not generate your claim now.";
        jsonResponse = {
          fulfillment_response: {
            messages: [
              {
                text: {
                  //fulfillment text response to be sent to the agent
                  text: [`${final}`],
                },
              },
            ],
          },
        };

        console.log(jsonResponse);
        response.json(jsonResponse);
      });
  } else if (tag == "book_repair") {
    let lodgeClaimID = request.body.sessionInfo.parameters.lodgeClaimID;
    var config = {
      method: "post",
      url: `https://ec2-3-236-245-181.compute-1.amazonaws.com/VoiceBotIntegration/BookAutoGarage/${lodgeClaimID}`,
      headers: {
        Authorization: "Basic ZWlxdXNlcjpFIXFVczNyQDEyMw==",
      },
    };

    axios(config)
      .then(function (res) {
        console.log(JSON.stringify(res.data));
        if (res.data.success) {
          var bookingReferenceNumber = res.data.data.bookingReferenceNumber;
          var final = `<speak>
            Alright, you are now booked in for repairs with Job ID ${bookingReferenceNumber}.</speak>`;
        } else {
          final =
            "Sorry! due to technical difficulty we can not book your repair.";
        }
        jsonResponse = {
          fulfillment_response: {
            messages: [
              {
                text: {
                  //fulfillment text response to be sent to the agent
                  text: [`${final}`],
                },
              },
            ],
          },
        };

        console.log(jsonResponse);
        response.json(jsonResponse);
      })
      .catch(function (error) {
        console.log(error);
        final =
          "Sorry! due to technical difficulty we can not book your repair.";
        jsonResponse = {
          fulfillment_response: {
            messages: [
              {
                text: {
                  //fulfillment text response to be sent to the agent
                  text: [`${final}`],
                },
              },
            ],
          },
        };

        console.log(jsonResponse);
        response.json(jsonResponse);
      });
  } else if (tag == "test") {
    jsonResponse = {
      fulfillment_response: {
        messages: [
          {
            text: {
              //fulfillment text response to be sent to the agent
              text: [`Are you the policyholder rakesh?`],
            },
          },
        ],
      },
    };
    response.json(jsonResponse);
  }

  //console.log(jsonResponse)
});
app.post("/test", (request, response) => {
  response.json({ hi: 234 });
});
app.listen(process.env.PORT || 3000);
