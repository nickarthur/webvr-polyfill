// Amplified constants since they are from native code, which updates at 200 Hz.
// Here we get updates at 60 Hz.
MIN_TIMESTEP = 0.001;
MAX_TIMESTEP = 1;

function ComplementaryOrientation() {
  this.accelerometer = new THREE.Vector3();
  this.gyroscope = new THREE.Vector3();

  this.screenOrientation = window.orientation;

  window.addEventListener('devicemotion', this.onDeviceMotionChange_.bind(this));
  window.addEventListener('orientationchange', this.onScreenOrientationChange_.bind(this));

  this.filter = new ComplementaryFilter(0.98);
  this.posePredictor = new PosePredictor(0.050);

  this.filterToWorld = new THREE.Quaternion();
  this.filterToWorld.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2);
}

ComplementaryOrientation.prototype.onDeviceMotionChange_ = function(deviceMotion) {
  var accGravity = deviceMotion.accelerationIncludingGravity;
  var rotRate = deviceMotion.rotationRate;
  var timestampS = deviceMotion.timeStamp / 1000;

  var deltaS = timestampS - this.previousTimestampS;
  if (deltaS <= MIN_TIMESTEP || deltaS > MAX_TIMESTEP) {
    console.warn('Invalid timestamps detected. Time step between successive ' +
                 'gyroscope sensor samples is very small or not monotonic');
    this.previousTimestampS = timestampS;
    return;
  }
  this.accelerometer.set(-accGravity.x, -accGravity.y, -accGravity.z);
  this.gyroscope.set(rotRate.alpha, rotRate.beta, rotRate.gamma);

  this.filter.addAccelMeasurement(this.accelerometer, timestampS);
  this.filter.addGyroMeasurement(this.gyroscope, timestampS);

  this.previousTimestampS = timestampS;
};

ComplementaryOrientation.prototype.onScreenOrientationChange_ =
    function(screenOrientation) {
  this.screenOrientation = window.orientation;
  // TODO: Implement worldToScreen transform.
};

ComplementaryOrientation.prototype.getOrientation = function() {
  // Convert from filter space to the the same system used by the
  // deviceorientation event.
  var orientation = this.filter.getOrientation();

  // Predict orientation.
  this.predictedQ = this.posePredictor.getPrediction(orientation, this.gyroscope, this.previousTimestampS);

  // Convert to THREE coordinate system: -Z forward, Y up, X right.
  var out = new THREE.Quaternion();
  out.copy(this.filterToWorld);
  out.multiply(this.predictedQ);
  return out;
};