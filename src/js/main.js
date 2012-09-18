// Uses code from http://airtightinteractive.com/demos/js/reactive/ by Felix Turner

var colors;

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");	

var running = false;
var fluid;

var source, analyser, audioContext, audioBuffer;
var freqByteData;
var timeByteData;			
var VOL_SENS = 2;	
var buffer, old_buffer;

function arrayToRGBA( a ){

	return "rgba(" + Math.floor( a[0] ) + "," + Math.floor( a[1] ) + "," + Math.floor( a[2] ) + "," + "0.4" + ")";

}

function drawRectangle( x, y, width, height, color ) {

	ctx.fillStyle = arrayToRGBA( color );
	ctx.fillRect( x, y, width, height );
	
};

function onDocumentDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	return false;
}

function initAudio(data) {
	source = audioContext.createBufferSource();

	if(audioContext.decodeAudioData) {
		audioContext.decodeAudioData(data, function(buffer) {
			source.buffer = buffer;
			createAudio();
		}, function(e) {
			console.log(e);
		});
	} else {
		source.buffer = audioContext.createBuffer(data, false );
		createAudio();
	}
}			

function createAudio() {

	fluid.reset();

	analyser = audioContext.createAnalyser();

	initArrays()

	source.connect(audioContext.destination);
	source.connect(analyser);

	source.looping = true;

	source.noteOn(0);
	running = true;

}			

function onDocumentDrop(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	//clean up previous mp3
	if (source) source.disconnect();

	var droppedFiles = evt.dataTransfer.files;

	var reader = new FileReader();

	reader.onload = function(fileEvent) {
		var data = fileEvent.target.result;
		initAudio(data);
	};

	reader.readAsArrayBuffer(droppedFiles[0]);

}

function prepareFrame(field){

	colors.rotate();

	if (analyser){

		analyser.smoothingTimeConstant = 0.1;
		analyser.getByteFrequencyData(freqByteData);
		analyser.getByteTimeDomainData(timeByteData);

		//get average level
		var length = freqByteData.length;
		var sum = 0;
		for(var j = 0; j < length; ++j) {
			sum += freqByteData[j];
		}
		var aveLevel = sum / length;
		var scaled_average = (aveLevel / 256) * VOL_SENS; //256 the highest a level can be?

		var j = 0;
		var sum = 0;
		var index = 0;
		
		for (var i = 0; i < freqByteData.length; i++){

			if ( j == 64 ){

				old_buffer[index] = buffer[index];
				buffer[index] = sum;

				index++;

				j = 0;
				sum = 0;

			}

			sum += freqByteData[i];
			j++;

		}

		for (var i = 0; i < buffer.length; i++){

			var sum = buffer[i];
			var old_sum = old_buffer[i];

			if ( i == 8)
				console.log( Math.abs(sum - old_sum) / sum );

			if ( Math.abs(sum - old_sum) / sum > 10 ){

				field.setVelocity( 8 + i*16, 1, 0, 500 );	
				field.setVelocity( 88-i*16, canvas.height -1, 0, -500 );

				for (var j = 0; j < 20; j++ ){

					field.setDensityRGB( 8+i*16, j, colors.colors[3] );
					field.setDensityRGB( 88-i*16, canvas.height - 1 -j, colors.colors[2] );

				}
			}

		}

		if ( scaled_average < 0.2 ){
			scaled_average *= 2;
		} 
	
	} else {

		for (var i = 0; i < 8; i++){

			var sum = 256*Math.random();

			if ( sum > 250 ){
				field.setVelocity( 8 + i*16, 1, 0, 500 );	
				field.setVelocity( 88-i*16, canvas.height -1, 0, -500 );

				for (var j = 0; j < 20; j++ ){

					field.setDensityRGB( 8+i*16, j, colors.colors[3] );
					field.setDensityRGB( 88-i*16, canvas.height - 1 -j, colors.colors[2] );
				}
			}

		}		

		scaled_average = 0.5;

	}

	field.setVelocity( 0, Math.floor(canvas.height/2), 50*scaled_average, 0 );	
	field.setVelocity( canvas.width - 1, Math.floor(canvas.height/2), -50*scaled_average, 0 );	
	
	field.setDensityRGB( 0, Math.floor(canvas.height/2), colors.colors[0] );	
	field.setDensityRGB( canvas.width - 1, Math.floor(canvas.height/2), colors.colors[1] );	


}

function loadSampleAudio() {

	source = audioContext.createBufferSource();
	analyser = audioContext.createAnalyser();
	analyser.fftSize = 1024;

	// Connect audio processing graph
	source.connect(analyser);
	analyser.connect(audioContext.destination);

	loadAudioBuffer("everyday.mp3");
}		

function loadAudioBuffer(url) {
	// Load asynchronously
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.responseType = "arraybuffer";

	request.onload = function() {
		audioBuffer = audioContext.createBuffer(request.response, false );
		finishLoad();
	};

	request.send();
}

function initArrays(){

	////////INIT audio in
	freqByteData = new Uint8Array(analyser.frequencyBinCount);
	timeByteData = new Uint8Array(analyser.frequencyBinCount);		

	buffer = new Uint8Array(8);
	old_buffer = new Uint8Array(8);

}

function finishLoad() {
	
	source.buffer = audioBuffer;
	source.looping = true;
	source.noteOn(0.0);

	initArrays();

	running = true;
}

function begin() {

	fluid = new Fluid(canvas);
	fluid.setUICallback(prepareFrame);
	fluid.setDisplayFunction(fluid.toggleDisplayFunction(canvas, 0));

	colors = new Colors();	

	var r = 96;

	canvas.width = r;
	canvas.height = r;

	fluid.setResolution(r, r);

	audioContext = new window.webkitAudioContext();
	buffer = new Uint8Array(8);
	old_buffer = new Uint8Array(8);
	// loadSampleAudio();

	document.addEventListener('drop', onDocumentDrop, false);
	document.addEventListener('dragover', onDocumentDragOver, false);

	running = true;


}

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
})();

(function animloop(){

  requestAnimFrame(animloop);

  updateFrame();

})();

function updateFrame() {
	
	if ( running ) {

		fluid.update();

		// for (var i = 0; i < buffer.length; i++){

			// var sum = buffer[i];

			// drawRectangle( 5 + i*16, 0, 8, sum/10, colors.colors[3]);
			// drawRectangle( 85 - i*16, canvas.height - sum/10, 8, sum/10, colors.colors[2]);

		// }

	}
	
}

begin();