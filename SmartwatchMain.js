//
//  SmartwatchMain.js
//  SmartAging
//
//  Copyright (c) 2015. Queen Mary University of London
//  Ricardo Carvalho Wasniewski, ricardocw@poli.ufrj.br

/*    
 * Copyright (c) 2014 Samsung Electronics Co., Ltd.   
 * All rights reserved.   
 *   
 * Redistribution and use in source and binary forms, with or without   
 * modification, are permitted provided that the following conditions are   
 * met:   
 *   
 *     * Redistributions of source code must retain the above copyright   
 *        notice, this list of conditions and the following disclaimer.  
 *     * Redistributions in binary form must reproduce the above  
 *       copyright notice, this list of conditions and the following disclaimer  
 *       in the documentation and/or other materials provided with the  
 *       distribution.  
 *     * Neither the name of Samsung Electronics Co., Ltd. nor the names of its  
 *       contributors may be used to endorse or promote products derived from  
 *       this software without specific prior written permission.  
 *  
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS  
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT  
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR  
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT  
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,  
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT  
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,  
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY  
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT  
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE  
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
 
var SAAgent = null;
var SASocket = null;
var CHANNELID = 104;
var ProviderAppName = "HelloAccessoryProvider";
var ax;
var ay;
var az;
var mag;
var abt;
var stop;
var intervalDetect;
var intervalWait;
var intervalStationary;
var back;
var move;
var average;
var tries;
var heartRate;
const abortTime = 5; // Time to abort
const stabilizationTime = 4; //Duration of the falling
const stationaryTime = 4000; //(in milliseconds) Time to move otherwise a fall will be detected

function createHTML(log_string)
{
		log = document.getElementById('resultBoard');
		log.innerHTML = log.innerHTML + "<br> : " + log_string;
}

function clearlog(){
	var node = document.getElementById('resultBoard');
	while (node.hasChildNodes()) {
	    node.removeChild(node.firstChild);
	}
}

function onerror(err) {
	console.log("err [" + err + "]");
}

var agentCallback = {
	onconnect : function(socket) {
		SASocket = socket;
		alert("Connection established with Smartwatch. Detection working");
		start();
		SASocket.setSocketStatusListener(function(reason){
			console.log("Service connection lost, Reason : [" + reason + "]");
			disconnect();
		});
	},
	onerror : onerror
};

var peerAgentFindCallback = {
	onpeeragentfound : function(peerAgent) {
		try {
			if (peerAgent.appName == ProviderAppName) {
				SAAgent.setServiceConnectionListener(agentCallback);
				SAAgent.requestServiceConnection(peerAgent);
			} else {
				alert("Not expected app!! : " + peerAgent.appName);
			}
		} catch(err) {
			console.log("exception [" + err.name + "] msg[" + err.message + "]");
		}
	},
	onerror : onerror
};

var connectioncallback = 
{
   /* Connection between provider and consumer is established */
   onconnect: function(socket) 
   {
		   SASocket = socket;
   }
}

SAAgent.setServiceConnectionListener(connectioncallback);

function onsuccess(agents) {
	try {
		if (agents.length > 0) {
			SAAgent = agents[0];
			
			SAAgent.setPeerAgentFindListener(peerAgentFindCallback);
			SAAgent.findPeerAgents();
		} else {
			alert("Not found SAAgent!!");
		}
	} catch(err) {
		console.log("exception [" + err.name + "] msg[" + err.message + "]");
	}
}

function connect() {
	if (SASocket) {
		alert('Already connected!');
        return false;
    }
	try {
		webapis.sa.requestSAAgent(onsuccess, function (err) {
			console.log("err [" + err.name + "] msg[" + err.message + "]");
		});
	} catch(err) {
		console.log("exception [" + err.name + "] msg[" + err.message + "]");
	}
}

function start() {
	try {
		stop = 0; // Variable in order to enter the 'if' statement only once (because of the listener)
		window.addEventListener( 'devicemotion', function listen( e ) {
			ax = e.accelerationIncludingGravity.x;
			ay = -e.accelerationIncludingGravity.y;
			az = -e.accelerationIncludingGravity.z;
			mag = Math.sqrt(Math.pow(ax,2) + Math.pow(ay,2) + Math.pow(az,2));
			if (mag>25 && stop == 0){
				stop = 1;
				stbTime = stabilizationTime;
				intervalWait = setInterval(wait,1000);
			}
		} );
	} catch(err) {
		console.log("exception [" + err.name + "] msg[" + err.message + "]");
		disconnect();
	}
}

function wait() { //Wait for the stabilization time (time to fall)
	stbTime--;
	if (stbTime === 0) {
		clearInterval(intervalWait);
		stTime = 0;
		move = 0;
		intervalStationary = setInterval(stationary,50); //periods of 50ms because it's close to the minimum time needed to make an increment
	}
}

function stationary(){ //Check to see whether the user is stationary or not
	stTime = stTime + 50;
	if(mag < 9.3 || mag > 10.9) { //User is moving
		move = 1;
		clearInterval(intervalStationary);
		createHTML("Moved");
		start();
	} 
	if (stTime === stationaryTime && move === 0) { 
		clearInterval(intervalStationary);
		abt=0; // Variable to abort operation if abort button is pressed
		abtTime = abortTime; // Time to abort operation
		tizen.application.launch("VbsgE6bms2.HelloAccessoryConsumer", function () { //to launch application if it's on the background
			delay = setInterval(delayfunc,200); // function to delay so vibration works
		});
	}
}

function delayfunc() {
	clearInterval(delay);
	tizen.power.request("SCREEN", "SCREEN_NORMAL");
	createHTML("Are you OK? You have " + abortTime.toString() + " seconds to abort" );
	navigator.vibrate([500,500,500,500,500,500,500,500,500,500]);
	intervalDetect = setInterval(detected, 1000);
}

function detected(){ 
	abtTime--;
	if(abtTime === 0 && abt === 0) {
		clearInterval(intervalDetect);
		createHTML("Time's up! Fall Detected. Measuring heart rate...");
		average = 0;
		tries = 0;
		heartRate = 0;
		webapis.motion.start("HRM", onchangedCB);
    }
	if(abtTime === 0 && abt === 1) {
		clearInterval(intervalDetect);
		createHTML("Aborted");
		tizen.power.release("SCREEN");
		start();
	}
}

function abort() { //Button to abort
	abt = 1;
}

function onchangedCB(MotionHRMInfo) {
	tries++;
	if (MotionHRMInfo.heartRate > 0) {
		average++;
		heartRate = heartRate + MotionHRMInfo.heartRate;
	}
	if (heartRate > 0 && tries == 100) {
		heartRate = heartRate/average;
		createHTML("Heart Rate: " + Math.round(heartRate).toString());
		SASocket.setDataReceiveListener(onreceive);
		SASocket.sendData(CHANNELID, "Fall Detected" + "\n" + "Heart Rate: " + Math.round(heartRate).toString());
		webapis.motion.stop("HRM");
	}
	if (heartRate <= 0 && tries == 100) {
		createHTML("It was not possible to measure the heart rate");
		SASocket.setDataReceiveListener(onreceive);
		SASocket.sendData(CHANNELID, "Fall Detected" + "\n" + "It was not possible to detect the heart rate");
		webapis.motion.stop("HRM");
	}
}

function emergency() {
	
	createHTML("Emergency call sent");
	SASocket.setDataReceiveListener(onreceive);
	SASocket.sendData(CHANNELID, "Emergency button pressed");
}

function disconnect() {
	try {
		if (SASocket != null) {
			SASocket.close();
			SASocket = null;
			createHTML("Connection Closed");
		}
	} catch(err) {
		console.log("exception [" + err.name + "] msg[" + err.message + "]");
	}
}

function onreceive(channelId, data) {
	tizen.power.release("SCREEN");
	start();
	//createHTML(data);
	//disconnect();
}

window.onload = function () {
    // add eventListener for tizenhwkey
    document.addEventListener('tizenhwkey', function(e) {
        if(e.keyName == "back")
            tizen.application.getCurrentApplication().exit();
    });
};
