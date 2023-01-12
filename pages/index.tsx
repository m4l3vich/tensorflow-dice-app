import Head from "next/head";
import Image from "next/image";
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
        <a
          href="https://github.com/skovy/tensorflow-dice-app"
          target="_blank"
          className={styles.navLink}
        >
          <Image src="/github-mark.svg" width={16} height={16} alt="" />
          <span>GitHub</span>
        </a>
      </nav>

      <main className={styles.main}>
        <WebCam />
      </main>
    </>
  );
}
