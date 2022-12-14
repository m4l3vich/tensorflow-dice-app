import { RefCallback, useCallback, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import type { TFLiteModel } from "@tensorflow/tfjs-tflite";
import styles from "../../styles/DetectionResult.module.css";

const SIZE = 1024;

export interface DetectionResultMetadata {
  boundingBox: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  score: number;
}

const CLASSES = [5, 4, 1, 6, 3, 2] as const;

const CLASS_FORMATTED = {
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
};

type Class = typeof CLASSES[number];

export interface ClassifierResultMetadata {
  predicted: Class;
  actual?: Class;
}

function classify({
  canvasElement,
  classifierModel,
}: {
  canvasElement: HTMLCanvasElement;
  classifierModel: TFLiteModel;
}) {
  const outputTensor = tf.tidy(() => {
    // Get pixels data.
    const img = tf.browser.fromPixels(canvasElement);
    // Normalize.
    const data = tf.expandDims(tf.image.resizeBilinear(img, [224, 224]));
    // Cast.
    const input = tf.cast(data, "int32");

    // Run the inference.
    const outputTensor = classifierModel.predict(input) as tf.Tensor;
    return outputTensor;
  });

  return outputTensor.dataSync() as unknown as [
    number,
    number,
    number,
    number,
    number,
    number
  ];
}

export const DetectionResult = ({
  result,
  canvas,
  classifierModel,
  classifierResult,
  setClassifierResult,
}: {
  result: DetectionResultMetadata;
  canvas: HTMLCanvasElement;
  classifierModel: TFLiteModel;
  classifierResult?: ClassifierResultMetadata;
  setClassifierResult(result: ClassifierResultMetadata): void;
}) => {
  const [predictedNumber, setPredictedNumber] = useState<Class | null>(null);
  const [wrong, setWrong] = useState(false);

  const canvasRef = useCallback<RefCallback<HTMLCanvasElement>>(
    (node) => {
      if (node) {
        const existingCanvasContext = canvas.getContext("2d")!;
        const { xmin, ymin, xmax, ymax } = result.boundingBox;
        const croppedImage = existingCanvasContext.getImageData(
          xmin * SIZE,
          ymin * SIZE,
          (xmax - xmin) * SIZE,
          (ymax - ymin) * SIZE
        );
        node.width = croppedImage.width;
        node.height = croppedImage.height;

        const canvasContext = node.getContext("2d")!;
        canvasContext.rect(0, 0, SIZE, SIZE);
        canvasContext.fillStyle = "white";
        canvasContext.fill();
        canvasContext.putImageData(croppedImage, 0, 0);

        const classificationResult = classify({
          canvasElement: node,
          classifierModel,
        });
        const maxIndex = classificationResult.indexOf(
          Math.max(...classificationResult)
        );
        const predicted = CLASSES[maxIndex];
        setPredictedNumber(predicted);
        setClassifierResult({
          predicted: predicted,
        });
      }
    },
    [result, canvas]
  );

  return (
    <div className={styles.container}>
      {predictedNumber ? (
        <span className={styles.predictedNumber}>
          Predicted: <strong>{predictedNumber}</strong>
          {classifierResult?.actual ? (
            <>
              , Actual: <strong>{classifierResult.actual}</strong>
            </>
          ) : null}
        </span>
      ) : null}
      <canvas ref={canvasRef} className={styles.detection} />
      {predictedNumber ? (
        <div className={styles.predictionConfirmationContainer}>
          {wrong ? (
            <div>
              {Object.entries(CLASS_FORMATTED).map(([key, value]) => {
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => {
                      setClassifierResult({
                        predicted: predictedNumber,
                        actual: Number(key) as Class,
                      });
                      setWrong(false);
                    }}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <button type="button" onClick={() => setWrong(true)}>
                ❌ Wrong
              </button>
              <button
                type="button"
                onClick={() =>
                  setClassifierResult({
                    predicted: predictedNumber,
                    actual: predictedNumber,
                  })
                }
              >
                ✅ Correct
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};
