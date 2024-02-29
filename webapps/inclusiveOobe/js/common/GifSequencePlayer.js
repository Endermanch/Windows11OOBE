//
// Copyright (C) Microsoft. All rights reserved.
//
define([], () => {
    const imgPropKey = "/imgdesc";
    const gifControlPropKey = "/grctlext";
    const framePropKeys = [imgPropKey, gifControlPropKey];
    const imgTopPropKey = "/Top";
    const imgLeftPropKey = "/Left";
    const imgPropKeys = [imgTopPropKey, imgLeftPropKey];
    const gifDelayPropKey = "/Delay";
    const gifControlPropKeys = [gifDelayPropKey];

    class GifSequencePlayer {
        constructor(outputCanvas) {
            this.outputCanvas = outputCanvas;
            this.outputContext = outputCanvas.getContext("2d");
            this.backBufferCanvas = document.createElement("canvas");
            this.backBufferContext = this.backBufferCanvas.getContext("2d");
            this.currentFrame = null;
            this.nextFrameTimeout = null;
            this.loop = false;
            this._playbackPromise = new WinJS.Promise.as(null);
            this._finishLoopAndStopPromise = new WinJS.Promise.as(null);
            this._reportPlaybackComplete = null;
            this._reportFinishLoopAndStopComplete = null;
        }

        playSequence(sequence, options) {
            options = options || {};
            this.currentFrame = 0;
            this.currentSequence = sequence;
            this.backBufferCanvas.width = sequence.width;
            this.backBufferCanvas.height = sequence.height;
            this.outputCanvas.width = sequence.width;
            this.outputCanvas.height = sequence.height;
            this.outputCanvas.style.width = sequence.width + "px";
            this.outputCanvas.style.height = sequence.height + "px";
            this.loop = options.loop || false;
            this._playbackPromise = new WinJS.Promise((reportComplete) => {
                this._reportPlaybackComplete = reportComplete;
            });
            this.playing = true;
            this._renderFrame();
            return this._playbackPromise;
        }

        stop() {
            this.playing = false;
            if (this.nextFrameTimeout) {
                clearTimeout(this.nextFrameTimeout);
                this.nextFrameTimeout = null;
            }
            this._reportPlaybackComplete();
        }

        finishLoopAndStop() {
            if (!this._reportFinishLoopAndStopComplete) {
                this._finishLoopAndStopPromise = new WinJS.Promise((reportComplete) => {
                    this._reportFinishLoopAndStopComplete = reportComplete;
                });
            }
            return this._finishLoopAndStopPromise;
        }
        
        getSequenceProgress() {
            if (!this.playing) {
                return 0;
            }
            
            return this.currentFrame / this.currentSequence.frames.length;
        }

        _renderFrame() {
            let frame = this.currentSequence.frames[this.currentFrame];
            let imageData = this.backBufferContext.getImageData(0, 0, frame.width, frame.height);
            imageData.data.set(frame.pixels);
            this.backBufferContext.putImageData(imageData, 0, 0);

            this.outputContext.drawImage(this.backBufferCanvas, frame.left, frame.top);
            this.backBufferContext.clearRect(0, 0, this.backBufferCanvas.width, this.backBufferCanvas.height);

            let nextIndex = this.currentFrame + 1;
            if (nextIndex < this.currentSequence.frames.length) {
                this.currentFrame = nextIndex;
                this.nextFrameTimeout = setTimeout(this._renderFrame.bind(this), frame.delay);
            }
            else {
                this._onSequenceEnded();
            }
        }

        _onSequenceEnded() {
            this.stop();
            if (this._reportFinishLoopAndStopComplete) {
                this._reportFinishLoopAndStopComplete();
                this._reportFinishLoopAndStopComplete = null;
            }
            this._finishLoopAndStopPromise = new WinJS.Promise.as(null);
            // Caller may have started new playback in completion handler
            if (!this.playing) {
                if (this.loop) {
                    this.currentFrame = 0;
                    this.nextFrameTimeout = setTimeout(this._renderFrame.bind(this), 16);
                }
                else {
                    this.outputContext.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
                }
            }

        }

        static frameSequenceFromStorageFileAsync(file) {
            let sequence = {
                frames: [],
                width: null,
                height: null,
            };
            return file.openReadAsync().then(stream => {
                return Windows.Graphics.Imaging.BitmapDecoder.createAsync(stream);
            }).then(decoder => {
                sequence.width = decoder.pixelWidth;
                sequence.height = decoder.pixelHeight;

                let framePromise = WinJS.Promise.as(null);
                for (let i = 0; i < decoder.frameCount; i++) {
                    framePromise = framePromise.then(() => {
                        return GifSequencePlayer.getFrameAtIndexAsync(decoder, i).then((frameData) => {
                            sequence.frames.push(frameData);
                        });
                    });
                }
                return framePromise;
            }).then(() => {
                return sequence;
            });
        }

        static getFrameAtIndexAsync(decoder, index) {
            return decoder.getFrameAsync(index).then(frame => {
                return frame.getPixelDataAsync().then(pixelData => {
                    return frame.bitmapProperties.getPropertiesAsync(framePropKeys).then(props => {
                        return props[imgPropKey].value.getPropertiesAsync(imgPropKeys).then(gifProps => {
                            return props[gifControlPropKey].value.getPropertiesAsync(gifControlPropKeys).then(ctrlProps => {
                                return {
                                    pixels: pixelData.detachPixelData(),
                                    left: gifProps[imgLeftPropKey].value,
                                    top: gifProps[imgTopPropKey].value,
                                    width: frame.pixelWidth,
                                    height: frame.pixelHeight,
                                    delay: ctrlProps[gifDelayPropKey].value * 10,
                                };
                            });
                        });
                    });
                });
            });
        }
    }
    return GifSequencePlayer;
});