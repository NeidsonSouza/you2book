import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import ChannelDetail from "./ChannelDetail.tsx";
import "./index.css";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Authenticator>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/channel/:channelUrl" element={<ChannelDetail />} />
        </Routes>
      </BrowserRouter>
    </Authenticator>
  </React.StrictMode>
);
