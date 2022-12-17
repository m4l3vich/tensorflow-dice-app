import classnames from "classnames";
import { ReactNode } from "react";
import styles from "../../styles/Button.module.css";

interface Props {
  onClick(): void;
  children: ReactNode;
  disabled?: boolean;
  variant?: "default" | "inverted";
}

export const Button = ({
  onClick,
  children,
  disabled,
  variant = "default",
}: Props) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classnames(styles[variant], { [styles.disabled]: disabled })}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
