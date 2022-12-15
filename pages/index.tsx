import { WebCam } from "../components/web-cam";
import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <>
      <nav className={styles.nav}>
        <h1>🎲 Catan tracker</h1>
      </nav>

      <main className={styles.main}>
        <WebCam />
      </main>
    </>
  );
}
