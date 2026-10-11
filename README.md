# DataLens Studio — AI Data Visualization App

A responsive data dashboard built for the CPS 5802 assignment. The app displays the creator name, supports user uploads (CSV, TSV, JSON), shows four chart types and a searchable table, and has an optional AI insights function using the OpenAI API. It includes sample data and works without an API key for all non-AI features.

## Run locally

Open `index.html` in a browser for data uploading, charts, tables and downloads. The AI endpoint requires the Vercel development server or a deployment.

Or use the VS Code terminal:

```bash
npx serve .
```

Navigate to the localhost URL printed by the server. To test AI locally, install the Vercel CLI (`npm i -g vercel`), create a `.env` file from `.env.example`, fill in your personal key and run `vercel dev`.

## Upload data

Click **Upload data**, pick a `.csv`, `.tsv`, or `.json` file (up to 10 MB, 30,000 rows, 60 columns). The first row of a CSV/TSV contains unique column headings. JSON must be an array of records, e.g. `[ {"Month":"Jan","Revenue":8400} ]`. Numeric fields are automatically detected. Select the chart type, X-axis, numeric Y-axis, and aggregation. Scatter charts need numeric X and Y fields. Charts display up to 40 categories or 200 scatter observations. The full dataset remains in the explorer.

## Deploy to Vercel (free hobby tier)

1. Create a free GitHub repository and upload **all files and folders** of this project, including `api/insights.js`, but **never upload `.env` or any API keys**.
2. Sign in at https://vercel.com using GitHub and click **Add New → Project**.
3. Import the repository. Set **Framework Preset = Other**, leave Build Command blank and Output Directory blank or `.`, and click **Deploy**.
4. Open the generated `https://...vercel.app` link. CSV/JSON upload, table, and charts should work immediately.
5. If you also need the AI function, open **Project → Settings → Environment Variables**. Add `OPENAI_API_KEY` with **your own** funded OpenAI API key, optionally set `OPENAI_MODEL` to `gpt-4.1-mini`, and **redeploy** from Deployments. The OpenAI API is billed separately and is not included in free Vercel hosting.
6. Test the **Generate insights** button on the live link. Submit **only the working live URL**, as the assignment requests.

## Privacy and security

Files are parsed locally inside the browser. For an AI request, the browser sends only the chosen question and a summary of up to 40 chart points (not the full uploaded file) to the serverless endpoint. The API key stays on the server. Do not reuse or publish any keys included in course handouts. Do not commit `.env`.

## Original assignment mapping

- Show name: left sidebar has a **Created by** field, persisted locally.
- Change GUI/look and feel: redesigned analytics dashboard.
- Change app function: visualization of custom uploaded datasets, plus an OpenAI-powered chart insight feature.
- Deployment: Vercel instructions above.

The attached PDF's older `openai-quickstart-node` animal-name demo is a starting example. This is a clean, deployment-friendly replacement rather than a modified clone of that exact legacy repository.
