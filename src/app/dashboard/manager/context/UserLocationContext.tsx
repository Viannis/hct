import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useQuery, useMutation } from "@apollo/client";
import { useUser, UserProfile } from "@auth0/nextjs-auth0/client";
import { Location } from "@prisma/client";
import { GET_LOCATION } from "@utils/queries";
import { CREATE_LOCATION, UPDATE_LOCATION } from "@utils/mutations";

type Error = {
  location: string;
  user: string;
};

type Loading = {
  location: boolean;
  user: boolean;
};

interface UserLocationContextType {
  location: Location | null;
  user: UserProfile | null;
  loading: Loading;
  error: Error;
  createLocation: (location: Location) => void;
  updateLocation: (location: Location) => void;
}

const UserLocationContext = createContext<UserLocationContextType | null>(null);

export const UserLocationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [loading, setLoading] = useState<Loading>({
    location: true,
    user: true,
  });
  const [error, setError] = useState<Error>({
    location: "",
    user: "",
  });
  const [location, setLocation] = useState<Location | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const {
    user: sessionUser,
    error: userError,
    isLoading: userLoading,
  } = useUser();
  const { data } = useQuery(GET_LOCATION, {
    skip: !sessionUser,
    onCompleted: () => setLoading((prev) => ({ ...prev, location: false })),
    onError: (error) => {
      console.log("Error fetching location", error);
      setError((prev) => ({ ...prev, location: "Error fetching location" }));
    },
  });

  const [createLocationMutation] = useMutation(CREATE_LOCATION, {
    onCompleted: () => setLoading((prev) => ({ ...prev, location: false })),
    onError: (error) => {
      console.log("Error creating location", error);
      setError((prev) => ({ ...prev, location: "Error creating location" }));
    },
  });

  const [updateLocationMutation] = useMutation(UPDATE_LOCATION, {
    onCompleted: () => setLoading((prev) => ({ ...prev, location: false })),
    onError: (error) => {
      console.log("Error updating location", error);
      setError((prev) => ({ ...prev, location: "Error updating location" }));
    },
  });

  useEffect(() => {
    if (data) {
      console.log("data", data);
      setLocation(data.location);
      setLoading((prev) => ({ ...prev, location: false }));
    }
    if (userError) {
      setError((prev) => ({ ...prev, user: userError.message }));
    }
    if (sessionUser && !userLoading) {
      console.log("session User", sessionUser);
      setUser(sessionUser);
      setLoading((prev) => ({ ...prev, user: false }));
    }
  }, [data, userError, userLoading, sessionUser]);

  const createLocation = useCallback(
    (location: Location) =>
      createLocationMutation({ variables: { input: location } }),
    [createLocationMutation]
  );

  const updateLocation = useCallback(
    (location: Location) =>
      updateLocationMutation({ variables: { input: location } }),
    [updateLocationMutation]
  );

  const value = useMemo(
    () => ({ location, loading, error, createLocation, updateLocation, user }),
    [location, loading, error, createLocation, updateLocation, user]
  );

  return (
    <UserLocationContext.Provider value={value}>
      {children}
    </UserLocationContext.Provider>
  );
};

export const useUserLocation = () => {
  const context = useContext(UserLocationContext);
  if (!context)
    throw new Error(
      "useUserLocation must be used within a UserLocationProvider"
    );
  return context;
};
