import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html>
      <Head>
        <meta
          name="description"
          content="An app to track dice rolls across rounds"
        />
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="stylesheet"
          href="//fonts.googleapis.com/css?family=Google+Sans:400,500,700"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
