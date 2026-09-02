"use client";

import {
  type ApplicationContext,
  ClientSDK,
} from "@sitecore-marketplace-sdk/client";
import { XMC } from "@sitecore-marketplace-sdk/xmc";
import type React from "react";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

interface ClientSDKProviderProps {
  children: ReactNode;
}

// Exported (not just the hooks) so TR-2 tests can wrap a hook under test with
// a stub client directly, without standing up the whole handshake+appContext
// flow this provider owns (T015). AppContextContext exported too (TR-4) —
// usePageScan now reads sitecoreContextId off it and its own tests need to
// supply a stub appContext the same way.
export const ClientSDKContext = createContext<ClientSDK | null>(null);
export const AppContextContext = createContext<ApplicationContext | null>(null);

export const MarketplaceProvider: React.FC<ClientSDKProviderProps> = ({
  children,
}) => {
  const [client, setClient] = useState<ClientSDK | null>(null);
  const [appContext, setAppContext] = useState<ApplicationContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // A failed / empty `application.context` used to leave `appContext` null
  // forever, and the provider renders `null` in that state — a permanently
  // blank panel with no message, which NFR-2 forbids. It is now a reported
  // error. The response is NOT logged: it carries both Sitecore context ids.
  // docs/build-decisions.md#application-context-must-not-fail-silently
  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    client
      .query("application.context")
      .then((res) => {
        if (cancelled) return;
        if (res?.data) setAppContext(res.data);
        else setError("Sitecore did not return an application context for this app.");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("application.context query failed", err);
        setError("Could not read this app's Sitecore context.");
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    const init = async () => {
      const config = {
        target: window.parent,
        modules: [XMC],
      };
      try {
        setLoading(true);
        const client = await ClientSDK.init(config);
        setClient(client);
      } catch (error) {
        console.error("Error initializing client SDK", error);
        setError("Error initializing client SDK");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  if (loading) {
    return <div>Attempting to connect to Sitecore Marketplace...</div>;
  }

  if (error) {
    return (
      <div>
        <h1>Error initializing Marketplace SDK</h1>
        <div>{error}</div>
        <div>
          Please check if the client SDK is loaded inside Sitecore Marketplace
          parent window and you have properly set your app&apos;s extension points.
        </div>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  if (!appContext) {
    return null;
  }

  return (
    <ClientSDKContext.Provider value={client}>
      <AppContextContext.Provider value={appContext}>
        {children}
      </AppContextContext.Provider>
    </ClientSDKContext.Provider>
  );
};

export const useMarketplaceClient = () => {
  const context = useContext(ClientSDKContext);
  if (!context) {
    throw new Error(
      "useMarketplaceClient must be used within a ClientSDKProvider",
    );
  }
  return context;
};

export const useAppContext = () => {
  const context = useContext(AppContextContext);
  if (!context) {
    throw new Error("useAppContext must be used within a ClientSDKProvider");
  }
  return context;
};
