import { RefCallback, useCallback, useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs-backend-cpu";
import * as tf from "@tensorflow/tfjs-core";
import type { TFLiteModel } from "@tensorflow/tfjs-tflite";
import {
  ClassifierResultMetadata,
  DetectionResult,
  DetectionResultMetadata,
} from "../detection-result";
import { Die } from "../die";
import { Button } from "../button";
import styles from "../../styles/WebCam.module.css";

const WEB_CAM_DIMENSIONS = 1024;
const DETECTION_MODEL_EXPECTED_DIMENSIONS = 512;

const detectObjects = ({
  canvasElement,
  detectionModel,
}: {
  canvasElement: HTMLCanvasElement;
  detectionModel: TFLiteModel;
}) => {
  const outputTensor = tf.tidy(() => {
    // Get pixel data.
    const img = tf.browser.fromPixels(canvasElement);

    // Normalize.
    const data = tf.expandDims(
      tf.image.resizeBilinear(img, [
        DETECTION_MODEL_EXPECTED_DIMENSIONS,
        DETECTION_MODEL_EXPECTED_DIMENSIONS,
      ])
    );
    const input = tf.cast(data, "int32");

    // Run the inference.
    const outputTensor = detectionModel.predict(input) as tf.NamedTensorMap;

    return outputTensor;
  });

  // Unwrap the predictions.
  const [scoreKey, boxKey, countKey, _classKey] = Object.keys(outputTensor);
  const scores = outputTensor[scoreKey].dataSync();
  const boxes = outputTensor[boxKey].dataSync();
  const count = outputTensor[countKey].dataSync()[0];

  // Transform the predictions into a more usable format.
  let results: DetectionResultMetadata[] = [];
  for (let i = 0; i < count; i++) {
    if (scores[i] > 0.2) {
      const ymin = boxes[i * 4];
      const xmin = boxes[i * 4 + 1];
      const ymax = boxes[i * 4 + 2];
      const xmax = boxes[i * 4 + 3];

      results.push({
        boundingBox: { xmin, ymin, xmax, ymax },
        score: scores[i],
      });
    }
  }

  return results;
};

const MEDIA_STREAM_CONSTRAINTS = {
  video: {
    width: {
      min: WEB_CAM_DIMENSIONS,
      ideal: WEB_CAM_DIMENSIONS,
      max: WEB_CAM_DIMENSIONS,
    },
    height: {
      min: WEB_CAM_DIMENSIONS,
      ideal: WEB_CAM_DIMENSIONS,
      max: WEB_CAM_DIMENSIONS,
    },
    facingMode: "environment",
  },
};

export const WebCam = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>();
  const [turns, setTurns] = useState<
    Array<{ total: number; dice: ClassifierResultMetadata[] }>
  >([]);

  const [detectionModel, setDetectionModel] = useState<TFLiteModel>();
  const [detectionResults, setDetectionResults] = useState<
    DetectionResultMetadata[]
  >([]);

  const [classifierModel, setClassifierModel] = useState<TFLiteModel>();
  const [classifierResults, setClassifierResults] = useState<
    ClassifierResultMetadata[]
  >([]);
  const setClassifierResultsAtIndex = (
    index: number,
    result: ClassifierResultMetadata
  ) => {
    setClassifierResults((results) => {
      const newResults = [...results];
      newResults[index] = result;
      return newResults;
    });
  };
  const rollTotal = classifierResults.reduce((previous, result) => {
    previous += result.actual ?? result.predicted;
    return previous;
  }, 0);
  const hasClassifierResults = !!classifierResults.length;

  const [videoStatus, setVideoStatus] = useState<
    "loading" | "enabled" | "disabled"
  >("loading");

  const [videoStream, setVideoStream] = useState<MediaStream>();

  useEffect(() => {
    let active = true;

    const loadTensorflowModels = async () => {
      // Imported dynamically to avoid issues with server rendering.
      const { loadTFLiteModel, setWasmPath } = await import(
        "@tensorflow/tfjs-tflite"
      );

      setWasmPath(
        "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.8/dist/"
      );

      const loadedClassifierModel = await loadTFLiteModel(
        "/classifier_model.tflite"
      );
      const loadedDetectionModel = await loadTFLiteModel(
        "/detection_model.tflite"
      );

      if (!active) {
        return;
      }

      setClassifierModel(loadedClassifierModel);
      setDetectionModel(loadedDetectionModel);
    };

    loadTensorflowModels();

    return () => {
      active = false;
    };
  }, []);

  const setupWebCam = async () => {
    setVideoStatus("loading");
    const devices = await navigator.mediaDevices.enumerateDevices();
    let devicesInfo = []

    for (const device of devices) {
      if (device.kind !== 'videoinput') continue
      devicesInfo.push({ label: device.label, id: device.deviceId })
    }

    if (devicesInfo.length > 1) {
      const devicesListStr = devicesInfo.map((e, i) => `${i + 1}. ${e.label}`).join('\n')
      const choice = Number((window.prompt(`Select webcam:\n${devicesListStr}`) ?? '').trim())
  
      const deviceId = isNaN(choice) ? devicesInfo[0].id : devicesInfo[choice - 1].id 
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        { video: {...MEDIA_STREAM_CONSTRAINTS, deviceId: deviceId ? {exact: deviceId} : undefined} }
      );
      setVideoStatus("enabled");
      setVideoStream(stream);
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.message === "Permission denied"
      ) {
        alert(
          "Your webcam is blocked. Please allow access to your webcam in your browser settings and try again."
        );
      } else if (error instanceof Error) {
        alert(
          `An unexpected error occurred: "${error.message}". Please try again.`
        );
      } else {
        throw error;
      }
    }
  };

  useEffect(() => {
    const checkWebCamPermissionsAndSetup = async () => {
      // Not all browsers support checking permissions so automatic setup.
      if (!("permissions" in navigator)) {
        setVideoStatus("disabled");
        return;
      }

      const result = await navigator.permissions.query({
        // This isn't supported cross-browser (hence the cast).
        name: "camera" as any,
      });

      if (result.state == "granted") {
        setupWebCam();
      } else {
        setVideoStatus("disabled");
      }
    };

    checkWebCamPermissionsAndSetup();
  }, []);

  const videoSetupRef = useCallback<RefCallback<HTMLVideoElement>>(
    async (node) => {
      if (videoStream && node && !node.srcObject) {
        // Connect the webcam stream to the video element.
        node.srcObject = videoStream;
        node.autoplay = true;

        // These attributes are required to work on iOS.
        node.playsInline = true;
        node.muted = true;

        // Manually set the video React ref since this callback is passed as the ref.
        videoRef.current = node;
      }
    },
    [videoStream]
  );

  const handleCaptureClick = () => {
    const sourceMedia = videoRef.current;

    if (canvasRef.current && sourceMedia && classifierModel && detectionModel) {
      // Capture the current video frame onto the canvas.
      const canvasContext = canvasRef.current.getContext("2d")!;
      canvasContext.drawImage(
        sourceMedia,
        0,
        0,
        WEB_CAM_DIMENSIONS,
        WEB_CAM_DIMENSIONS
      );

      // Detect the objects and their bounding boxes.
      const results = detectObjects({
        canvasElement: canvasRef.current,
        detectionModel,
      });
      setDetectionResults(results);
    }
  };

  const handleAllowAccess = () => {
    setupWebCam();
  };

  const handleSaveRoll = () => {
    setTurns((turns) => [
      ...turns,
      { total: rollTotal, dice: classifierResults },
    ]);
    setDetectionResults([]);
    setClassifierResults([]);

    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d")!;
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const videoEnabled = videoStatus === "enabled";
  const renderWebCam = () => {
    switch (videoStatus) {
      case "enabled":
        return (
          <div>
            <video
              ref={videoSetupRef}
              className={styles.webCam}
              id="webcam-video"
            />
            <button
                type="button"
                onClick={handleAllowAccess}
                className={styles.inlineButton}
              >
                Change webcam
              </button>
          </div>
        );
      case "disabled":
        return (
          <div className={styles.webCamSetup}>
            <p>
              🎥{" "}
              <button
                type="button"
                onClick={handleAllowAccess}
                className={styles.inlineButton}
              >
                Allow access
              </button>{" "}
              to your webcam to get started.
            </p>
          </div>
        );
      case "loading":
        return (
          <div className={styles.webCamSetup}>
            <p>Initializing...</p>
          </div>
        );
      default:
        const _exhaustiveCheck: never = videoStatus;
        break;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentContainer}>
        <div className={styles.webCamContainer}>{renderWebCam()}</div>
        {videoEnabled ? (
          <div className={styles.sidebar}>
            <Button onClick={handleCaptureClick}>Capture roll</Button>
            <div className={styles.dynamicContent}>
              {hasClassifierResults ? (
                <>
                  <Button onClick={handleSaveRoll} variant="inverted">
                    Save roll
                  </Button>
                  <p className={styles.totalValue}>
                    Roll total: <strong>{rollTotal}</strong>
                  </p>
                </>
              ) : null}
              <div className={styles.previewContainer}>
                <canvas
                  ref={canvasRef}
                  className={styles.preview}
                  width="1024px"
                  height="1024px"
                />
                {detectionResults.map((result, index) => (
                  <DetectionResult
                    result={result}
                    key={index}
                    canvas={canvasRef.current!}
                    classifierModel={classifierModel!}
                    classifierResult={classifierResults[index]}
                    setClassifierResult={(result) =>
                      setClassifierResultsAtIndex(index, result)
                    }
                  />
                ))}
              </div>
            </div>
            {turns.length ? (
              <div className={styles.turnsContainer}>
                <h2>History</h2>
                <ul className={styles.turnsList}>
                  {[...turns].reverse().map(({ total, dice }, index) => (
                    <li key={index}>
                      <h3>Roll #{turns.length - index}</h3>
                      <div className={styles.turnContent}>
                        <div className={styles.turnDice}>
                          {dice.map((die, index) => {
                            return (
                              <Die
                                key={index}
                                currentValue={die.actual ?? die.predicted}
                              />
                            );
                          })}
                        </div>
                        <p>{total}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};
