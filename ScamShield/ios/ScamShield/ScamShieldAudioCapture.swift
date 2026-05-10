import AVFoundation
import React

@objc(ScamShieldAudioCapture)
class ScamShieldAudioCapture: RCTEventEmitter {
  private let engine = AVAudioEngine()
  private var isRecording = false
  private var hasEventListeners = false
  private var chunkData = Data()
  private var chunkFrameCount = 0
  private var chunkIndex = 0
  private var sampleRate = 48_000.0
  private let chunkDurationSeconds = 4.0

  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    ["ScamShieldAudioChunk"]
  }

  override func startObserving() {
    hasEventListeners = true
  }

  override func stopObserving() {
    hasEventListeners = false
  }

  @objc
  func isCapturing(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    resolve(isRecording)
  }

  @objc
  func start(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if isRecording {
      resolve(["sampleRate": sampleRate, "channels": 1])
      return
    }

    AVAudioSession.sharedInstance().requestRecordPermission { [weak self] granted in
      guard let self else { return }

      if !granted {
        reject("mic_permission_denied", "Microphone permission was denied.", nil)
        return
      }

      do {
        try self.startEngine()
        resolve(["sampleRate": self.sampleRate, "channels": 1])
      } catch {
        reject("audio_start_failed", "Failed to start microphone capture.", error)
      }
    }
  }

  @objc
  func stop(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    stopEngine()
    resolve(nil)
  }

  private func startEngine() throws {
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(
      .playAndRecord,
      mode: .measurement,
      options: [.defaultToSpeaker, .allowBluetoothHFP, .mixWithOthers]
    )
    try session.setPreferredIOBufferDuration(0.02)
    try session.setActive(true)

    let inputNode = engine.inputNode
    let inputFormat = inputNode.outputFormat(forBus: 0)
    sampleRate = inputFormat.sampleRate
    chunkData.removeAll(keepingCapacity: true)
    chunkFrameCount = 0
    chunkIndex = 0

    inputNode.removeTap(onBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: 4096, format: inputFormat) { [weak self] buffer, _ in
      self?.process(buffer: buffer)
    }

    engine.prepare()
    try engine.start()
    isRecording = true
  }

  private func stopEngine() {
    if engine.isRunning {
      engine.inputNode.removeTap(onBus: 0)
      engine.stop()
    }

    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    isRecording = false
    chunkData.removeAll(keepingCapacity: false)
    chunkFrameCount = 0
  }

  private func process(buffer: AVAudioPCMBuffer) {
    guard let channelData = buffer.floatChannelData else { return }

    let frameLength = Int(buffer.frameLength)
    let samples = channelData[0]
    var sumSquares: Float = 0

    for frame in 0..<frameLength {
      let sample = max(-1, min(1, samples[frame]))
      sumSquares += sample * sample
      var intSample = Int16(sample * Float(Int16.max)).littleEndian
      withUnsafeBytes(of: &intSample) { chunkData.append(contentsOf: $0) }
    }

    chunkFrameCount += frameLength

    let rms = sqrt(sumSquares / Float(max(frameLength, 1)))
    let targetFrames = Int(sampleRate * chunkDurationSeconds)

    if chunkFrameCount >= targetFrames {
      emitChunk(level: min(1, Double(rms) * 8))
      chunkData.removeAll(keepingCapacity: true)
      chunkFrameCount = 0
    }
  }

  private func emitChunk(level: Double) {
    chunkIndex += 1
    NSLog(
      "ScamShield mic chunk %d captured: %d bytes at %.0f Hz",
      chunkIndex,
      chunkData.count,
      sampleRate
    )

    guard hasEventListeners else { return }

    sendEvent(
      withName: "ScamShieldAudioChunk",
      body: [
        "timestamp": Int(Date().timeIntervalSince1970),
        "chunkIndex": chunkIndex,
        "byteLength": chunkData.count,
        "sampleRate": sampleRate,
        "channels": 1,
        "level": level,
        "audioBase64": chunkData.base64EncodedString(),
      ]
    )
  }
}
