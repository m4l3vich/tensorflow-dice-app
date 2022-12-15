import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html>
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
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
