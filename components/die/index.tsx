import classnames from "classnames";
import { useState } from "react";
import styles from "../../styles/Die.module.css";
import { Class } from "../../types";

interface Props {
  currentValue: Class;
  onClick(value: Class): void;
}

export const Die = ({ currentValue, onClick }: Props) => {
  const nextValue = ((currentValue % 6) + 1) as Class;

  return (
    <button className={styles.button} onClick={() => onClick(nextValue)}>
      <div className={classnames(styles.die, styles[`rotate${currentValue}`])}>
        <div className={classnames(styles.face, styles.faceOne)}>
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="3" />
          </svg>
        </div>
        <div className={classnames(styles.face, styles.faceTwo)}>
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="8" r="3" />
            <circle cx="23" cy="8" r="3" />
            <circle cx="9" cy="16" r="3" />
            <circle cx="23" cy="16" r="3" />
            <circle cx="9" cy="24" r="3" />
            <circle cx="23" cy="24" r="3" />
          </svg>
        </div>
        <div className={classnames(styles.face, styles.faceThree)}>
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="3" />
            <circle cx="22" cy="22" r="3" />
          </svg>
        </div>
        <div className={classnames(styles.face, styles.faceFour)}>
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="3" />
            <circle cx="24" cy="8" r="3" />
            <circle cx="16" cy="16" r="3" />
            <circle cx="8" cy="24" r="3" />
            <circle cx="24" cy="24" r="3" />
          </svg>
        </div>
        <div className={classnames(styles.face, styles.faceFive)}>
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="3" />
            <circle cx="16" cy="16" r="3" />
            <circle cx="24" cy="24" r="3" />
          </svg>
        </div>
        <div className={classnames(styles.face, styles.faceSix)}>
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="9" r="3" />
            <circle cx="9" cy="23" r="3" />
            <circle cx="23" cy="9" r="3" />
            <circle cx="23" cy="23" r="3" />
          </svg>
        </div>
      </div>
    </button>
  );
};
