"use strict";

var WebAudioLoader = require('webaudioloader');
var encoder = require('encode-wav');

// WebAudio Shim.
window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = new AudioContext();

var wal = new WebAudioLoader({
    context : audioContext,
    cache : false
});

/*
* resampler = require('resampler');
* resampler(file/URL/AudioBuffer, sampleRate, oncomplete) -> Promise
* resampler({
    leftBuffer: TypedArray,
    rightBuffer: TypedArray,
    sampleRate : Number}, sampleRate, oncomplete) -> Promise
* event.getFile();
* event.getAudioBuffer();
*/


/*
*
*/
function resampler(input, targetSampleRate, oncomplete){

    if (!input && !targetSampleRate){
        return returnError('Error: First argument should be either a File, URL or AudioBuffer'); // return Rejected Promise
    }

    var inputType = Object.prototype.toString.call( input );
    if (inputType !== '[object String]' &&
            inputType !== '[object File]' &&
            inputType !== '[object AudioBuffer]' &&
            inputType !== '[object Object]'){
        return returnError('Error: First argument should be either a File, URL or AudioBuffer'); // return Rejected Promise
    }

    if(typeof targetSampleRate !== 'number' ||
        targetSampleRate > 192000 || targetSampleRate < 3000){
        return returnError('Error: Second argument should be a numeric sample rate between 3000 and 192000');
    }

    if (inputType === '[object String]' || inputType === '[object File]'){
        console.log('Loading/decoding input', input);
        wal.load(input, {onload: function (err, audioBuffer){
            if (err){
                return returnError(err);
            }
            resampleAudioBuffer(audioBuffer);
        }});
    } else if (inputType === '[object AudioBuffer]'){
        resampleAudioBuffer(input);
    } else if (inputType === '[object Object]' && input.leftBuffer && input.sampleRate){
        var numCh_ = input.rightBuffer ? 2 : 1;
        var audioBuffer_ = audioContext.createBuffer(numCh_, input.leftBuffer.length, input.sampleRate);
        resampleAudioBuffer(audioBuffer_);
    }else{
        return returnError('Error: Unknown input type');
    }

    function returnError(errMsg){
        console.error(errMsg);
        if (typeof oncomplete === 'function'){
            oncomplete(new Error(errMsg));
        }
        return;
        // return Rejected Promise
    }

    function resampleAudioBuffer(audioBuffer){


        var numCh_ = audioBuffer.numberOfChannels;
        var numFrames_ = audioBuffer.length*targetSampleRate/audioBuffer.sampleRate;

        var offlineContext_ = new OfflineAudioContext(numCh_, numFrames_, targetSampleRate);
        var bufferSource_ = offlineContext_.createBufferSource();
        bufferSource_.buffer = audioBuffer;

        offlineContext_.oncomplete = function(event){
            var resampeledBuffer = event.renderedBuffer;
            console.log('Done Rendering');
            if (typeof oncomplete === 'function'){
                oncomplete({
                    getAudioBuffer: function(){
                        return resampeledBuffer;
                    },
                    getFile : function (fileCallback){
                        encoder.encodeWAV(resampeledBuffer,resampeledBuffer.sampleRate,
                            function(blob) {
                                console.log('wav encoding complete: ', blob );
                                if (blob) {
                                    fileCallback(URL.createObjectURL(blob));
                                }
                            });
                    }
                });
            }
        };

        console.log('Starting Offline Rendering');
        bufferSource_.connect(offlineContext_.destination);
        bufferSource_.start(0);
        offlineContext_.startRendering();
    }
}


module.exports = resampler;