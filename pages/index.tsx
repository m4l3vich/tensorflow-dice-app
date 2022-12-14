import Head from "next/head";
import { WebCam } from "../components/web-cam";
import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Catan tracker</title>
        <meta
          name="description"
          content="An app to track Catan dice rolls and rounds"
        />
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="stylesheet"
          href="//fonts.googleapis.com/css?family=Google+Sans:400,500,700"
        />
      </Head>

      <nav className={styles.nav}>
        <h1>🎲 Catan tracker</h1>
      </nav>

      <main className={styles.main}>
        <WebCam />
      </main>
    </div>
  );
}
