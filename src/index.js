import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://889572d20273ff096b1668903e2e36a1@o4508850765037568.ingest.us.sentry.io/4508850766610432",
  // enabled: process.env.NODE_ENV === 'production',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", "http://localhost:8000","http://localhost:3000","http://localhost:3001","https://voicedetection.winkapis.com/","https://voicedetection-api.winkapis.com"],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
 <React.StrictMode>
   <App />
 </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
