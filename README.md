This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Variables

To run this project, you will need to set up the following environment variables. You can create a `.env.local` file in the root of your project to store these variables locally.

-   `BLOCKCYPHER_API_TOKEN` (Required for webhook functionality): Your API token from [Blockcypher](https://accounts.blockcypher.com/). This is used to authenticate with the Blockcypher API for registering webhooks.
-   `NEXT_PUBLIC_APP_URL` (Required for webhook functionality): The publicly accessible base URL of your deployed application. For example, `https://yourapp.example.com`. This is used to construct the absolute callback URL that Blockcypher will use to send webhook notifications (e.g., `https://yourapp.example.com/api/webhook/payment-update`). For local development, you might use a service like ngrok to expose your local server and get a public URL.

### Example `.env.local`

```
BLOCKCYPHER_API_TOKEN=your_blockcypher_api_token_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Note on `NEXT_PUBLIC_APP_URL` for Webhooks:** For Blockcypher webhooks to function correctly, the `NEXT_PUBLIC_APP_URL` must point to an address that is reachable from the public internet. If you are developing locally, `http://localhost:3000` will not be accessible by Blockcypher. You'll need to use a tunneling service (like [ngrok](https://ngrok.com/)) to expose your local development server to the internet and use the provided public URL as `NEXT_PUBLIC_APP_URL`. For production deployments, this should be set to your application's canonical base URL.
