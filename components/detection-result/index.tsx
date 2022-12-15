import { RefCallback, useCallback, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import type { TFLiteModel } from "@tensorflow/tfjs-tflite";
import styles from "../../styles/DetectionResult.module.css";
import { Die } from "../die";
import { Class, CLASSES } from "../../types";

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
          <Die
            onClick={(value) =>
              setClassifierResult({
                predicted: predictedNumber,
                actual: value,
              })
            }
            currentValue={classifierResult?.actual ?? predictedNumber}
          />
        </span>
      ) : null}
      <canvas ref={canvasRef} className={styles.detection} />
    </div>
  );
};
