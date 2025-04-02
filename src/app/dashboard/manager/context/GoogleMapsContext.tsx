// filepath: /src/context/GoogleMapsContext.tsx
"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useLoadScript, Libraries } from "@react-google-maps/api";

const libraries: Libraries = ["places", "geometry"];

type GoogleMapsContextType = {
  isLoaded: boolean;
  loadError: Error | undefined;
};

const GoogleMapsContext = createContext<GoogleMapsContextType | undefined>(
  undefined
);

export const GoogleMapsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries,
  });

  const value = useMemo(
    () => ({
      isLoaded,
      loadError,
    }),
    [isLoaded, loadError]
  );

  return (
    <GoogleMapsContext.Provider value={value}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export const useGoogleMaps = () => {
  const context = useContext(GoogleMapsContext);
  if (!context) {
    throw new Error("useGoogleMaps must be used within a GoogleMapsProvider");
  }
  return context;
};
