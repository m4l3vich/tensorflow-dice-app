import Head from "next/head";
import { WebCam } from "../components/web-cam";
import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <>
      <Head>
        <title>Dice tracker</title>
      </Head>

      <nav className={styles.nav}>
        <h1>🎲 Dice tracker</h1>
      </nav>

      <main className={styles.main}>
        <WebCam />
      </main>
    </>
  );
}
