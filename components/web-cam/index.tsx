import { RefCallback, useCallback, useEffect, useRef, useState } from "react";
import styles from "../../styles/WebCam.module.css";

import "@tensorflow/tfjs-backend-cpu";
import * as tf from "@tensorflow/tfjs-core";
import type { TFLiteModel } from "@tensorflow/tfjs-tflite";
import {
  ClassifierResultMetadata,
  DetectionResult,
  DetectionResultMetadata,
} from "../detection-result";
import Image from "next/image";

const SIZE = 1024;

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
    const data = tf.expandDims(tf.image.resizeBilinear(img, [512, 512]));
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
      min: SIZE,
      ideal: SIZE,
      max: SIZE,
    },
    height: {
      min: SIZE,
      ideal: SIZE,
      max: SIZE,
    },
  },
};

export const WebCam = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>();
  const imageRef = useRef<HTMLImageElement>(null);

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

  const hasVerifiedResults =
    classifierResults.length &&
    classifierResults.every((result) => !!result.actual);

  const [videoStatus, setVideoStatus] = useState<
    "enabled" | "disabled" | "sample"
  >("disabled");

  const [videoStream, setVideoStream] = useState<MediaStream>();

  useEffect(() => {
    let active = true;
    load();
    return () => {
      active = false;
    };

    async function load() {
      const { loadTFLiteModel, setWasmPath } = await import(
        "@tensorflow/tfjs-tflite"
      );

      setWasmPath(
        "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.8/dist/"
      );

      const cModel = await loadTFLiteModel("/classifier_model.tflite");
      const dModel = await loadTFLiteModel("/detection_model.tflite");

      if (!active) {
        return;
      }

      setClassifierModel(cModel);
      setDetectionModel(dModel);
    }
  }, []);

  useEffect(() => {
    // This doesn't appear to be cross-browser.
    navigator.permissions.query({ name: "camera" as any }).then((res) => {
      if (res.state == "granted") {
        navigator.mediaDevices
          .getUserMedia(MEDIA_STREAM_CONSTRAINTS)
          .then((stream) => {
            setVideoStream(stream);
            setVideoStatus("enabled");
          });
      }
    });
  }, []);

  const videoSetupRef = useCallback<RefCallback<HTMLVideoElement>>(
    async (node) => {
      if (videoStream && node && !node.srcObject) {
        node.srcObject = videoStream;
        node.autoplay = true;
        videoRef.current = node;
      }
    },
    [videoStream]
  );

  const handleClick = () => {
    const sourceMedia = videoRef.current || imageRef.current;

    if (canvasRef.current && sourceMedia && classifierModel && detectionModel) {
      // Capture the current video frame onto the canvas.
      const canvasContext = canvasRef.current.getContext("2d")!;
      canvasContext.drawImage(sourceMedia, 0, 0, SIZE, SIZE);

      // Detect the objects and their bounding boxes.
      const results = detectObjects({
        canvasElement: canvasRef.current,
        detectionModel,
      });

      // Draw the bounding boxes.
      results.forEach((result) => {
        const { xmin, ymin, xmax, ymax } = result.boundingBox;

        canvasContext.strokeStyle = "#fbf9f7";
        canvasContext.lineWidth = 4;
        canvasContext.strokeStyle;
        canvasContext.strokeRect(
          xmin * SIZE - 6,
          ymin * SIZE - 6,
          (xmax - xmin) * SIZE + 12,
          (ymax - ymin) * SIZE + 12
        );
      });

      setDetectionResults(results);
    }
  };

  const handleAllowAccess = async () => {
    const stream = await navigator.mediaDevices.getUserMedia(
      MEDIA_STREAM_CONSTRAINTS
    );
    setVideoStatus("enabled");
    setVideoStream(stream);
  };

  const handleLoadSample = () => {
    setVideoStatus("sample");
  };

  const showSidebar = videoStatus === "sample" || videoStatus === "enabled";
  const renderWebCam = () => {
    switch (videoStatus) {
      case "sample":
        return (
          <>
            <div className={styles.sampleImage}>
              <Image
                src="/dice-5-1.jpg"
                alt="dice sample"
                sizes="1024px"
                fill
                ref={imageRef}
              />
            </div>
            <button
              type="button"
              onClick={handleClick}
              className={styles.capture}
            >
              Capture
            </button>
          </>
        );
      case "enabled":
        return (
          <>
            <video
              ref={videoSetupRef}
              className={styles.webCam}
              id="webcam-video"
            />
            <button
              type="button"
              onClick={handleClick}
              className={styles.capture}
            >
              Capture
            </button>
          </>
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
            <p>
              📷 Or,{" "}
              <button
                type="button"
                onClick={handleLoadSample}
                className={styles.inlineButton}
              >
                load a sample image
              </button>{" "}
              to see how it works.
            </p>
          </div>
        );
      default:
        const _never: never = videoStatus;
        break;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentContainer}>
        <div className={styles.webCamContainer}>{renderWebCam()}</div>
        {showSidebar ? (
          <div className={styles.previewContainer}>
            <canvas
              ref={canvasRef}
              className={styles.preview}
              width="1024px"
              height="1024px"
            />
            {hasVerifiedResults ? (
              <div>
                Total value:{" "}
                <strong>
                  {classifierResults.reduce((previous, result) => {
                    previous += result.actual!;
                    return previous;
                  }, 0)}
                </strong>
              </div>
            ) : null}
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
        ) : null}
      </div>
    </div>
  );
};
